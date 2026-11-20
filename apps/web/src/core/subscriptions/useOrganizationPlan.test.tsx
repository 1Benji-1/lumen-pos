import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useOrganizationPlan } from './useOrganizationPlan'

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, id: string) => ({
          single: async () => table === 'stores' && column === 'id' && id === 'org-a'
            ? {
                data: {
                  id: 'org-a', name: 'Mercado', subscription_status: 'past_due',
                  trial_ends_at: '2026-01-01T00:00:00Z', feature_overrides: { max_users: 7 },
                  business_type: null, industry_sub_type: null,
                  plans: { code: 'pro', name: 'Pro', features: { max_users: 6 } },
                },
                error: null,
              }
            : { data: null, error: new Error('Unknown organization') },
        }),
      }),
    }),
  },
}))

afterEach(cleanup)

it('reads an existing organization plan with the neutral Web contract and legacy defaults', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useOrganizationPlan('org-a'), { wrapper: Wrapper })

  await waitFor(() => expect(result.current.data).toEqual({
    id: 'org-a',
    name: 'Mercado',
    subscriptionStatus: 'past_due',
    trialEndsAt: '2026-01-01T00:00:00Z',
    featureOverrides: { max_users: 7 },
    businessType: 'tienda_articulos',
    industrySubType: 'comercio_general',
    plan: { code: 'pro', name: 'Pro', features: { max_users: 6 } },
  }))
})
