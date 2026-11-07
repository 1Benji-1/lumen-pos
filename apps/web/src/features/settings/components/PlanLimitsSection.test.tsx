import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanLimitsSection } from './PlanLimitsSection'

vi.mock('../../../shared/hooks/useStoreId', () => ({ useStoreId: () => ({ storeId: 'store-a' }) }))
vi.mock('../../../shared/hooks/useStorePlan', () => ({ useStorePlan: () => ({ data: { industry_sub_type: 'comercio_general', subscription_status: 'trialing', plans: { code: 'standard', name: 'Standard' } }, isLoading: false }) }))
vi.mock('../../../shared/hooks/useStoreEntitlements', () => ({ useStoreEntitlements: () => ({ isFeatureEnabled: () => false, getLimit: () => null }) }))
vi.mock('../../../shared/hooks/useStoreModules', () => ({ useStoreModules: () => ({ profile: { familyId: 'services', categoryId: 'barberia_belleza' } }) }))
vi.mock('../../staff/hooks/useStaff', () => ({ useStaff: () => ({ data: [], isLoading: false }) }))

it('shows the primary branch category instead of the legacy retail subtype', () => {
  render(<PlanLimitsSection />)
  expect(screen.getByText('Barbería y belleza')).toBeTruthy()
  expect(screen.queryByText('comercio general')).toBeNull()
})
