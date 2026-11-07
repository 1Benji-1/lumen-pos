import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const f = vi.hoisted(() => ({ callback: null as null | ((event: string, session: unknown) => unknown), fail: false, session: { user: { id: 'admin' }, access_token: 'token' }, getMfa: vi.fn(), listFactors: vi.fn() }))
vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: f.session }, error: null }),
  onAuthStateChange: (cb: (event: string, session: unknown) => unknown) => { f.callback = cb; return { data: { subscription: { unsubscribe() {} } } } },
} } }))
vi.mock('./services/authService', () => ({
  getMfaAssuranceLevel: f.getMfa,
  listMfaFactors: f.listFactors,
}))
import { useAuth } from '../../shared/hooks/useAuth'

afterEach(cleanup)
beforeEach(() => {
  f.getMfa.mockReset().mockResolvedValue({ currentLevel: 'aal1' })
  f.listFactors.mockReset().mockResolvedValue({ totp: [{ id: 'factor', status: 'verified' }] })
})
it('does not return an async callback to Supabase auth notifications', async () => {
  const { result } = renderHook(() => useAuth())
  await waitFor(() => expect(result.current.loading).toBe(false))
  let returned: unknown
  act(() => { returned = f.callback!('TOKEN_REFRESHED', f.session) })
  expect(returned).toBeUndefined()
})
it('fails closed and exposes a recoverable error when MFA verification fails', async () => {
  f.getMfa.mockRejectedValue(new Error('MFA unavailable'))
  const { result } = renderHook(() => useAuth())
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.hasEnrolledMfa).toBe(true)
  expect(result.current.mfaError).toBeTruthy()
  expect(result.current.mfaLevel).not.toBe('aal2')
})
