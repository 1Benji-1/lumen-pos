import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({ callback: null as null | ((event: string, session: unknown) => void), resolve: null as null | ((result: unknown) => void) }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { auth: {
  getSession: () => new Promise(resolve => { f.resolve = resolve }),
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => { f.callback = callback; return { data: { subscription: { unsubscribe() {} } } } },
} } }))
import { useAuth } from './useAuth'
it('does not restore an old account when getSession finishes after sign-out', async () => {
  const { result } = renderHook(() => useAuth())
  act(() => f.callback!('SIGNED_OUT', null))
  await act(async () => f.resolve!({ data: { session: { user: { id: 'old' } } }, error: null }))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.session).toBeNull()
})
