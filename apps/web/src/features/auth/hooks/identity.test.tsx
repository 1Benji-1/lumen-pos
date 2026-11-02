import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const f = vi.hoisted(() => ({ auth: { session: { user: { id: 'a' } }, loading: false }, requests: [] as ((result: { data: Record<string, unknown> | null; error: { message: string } | null }) => void)[] }))
vi.mock('./useAuth', () => ({ useAuth: () => f.auth }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ single: () => new Promise(resolve => f.requests.push(resolve)) }) }) }) } }))
import { useStoreId } from '../../../shared/hooks/useStoreId'
import { useCurrentUserRole } from '../../../shared/hooks/useCurrentUserRole'

afterEach(cleanup)
beforeEach(() => { f.auth = { session: { user: { id: 'a' } }, loading: false }; f.requests = [] })

describe('identity profile resolution', () => {
  it('reports a missing store profile as an explicit recoverable error', async () => {
    const { result } = renderHook(() => useStoreId())
    await act(async () => { f.requests[0]({ data: null, error: { message: 'missing profile' } }) })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeTruthy()
    expect(result.current.storeId).toBe(null)
  })
  it('ignores stale profile responses from a previous account', async () => {
    const { result, rerender } = renderHook(() => useStoreId())
    f.auth = { session: { user: { id: 'b' } }, loading: false }; rerender()
    await act(async () => { f.requests[1]({ data: { store_id: 'store-b', is_active: true }, error: null }) })
    await act(async () => { f.requests[0]({ data: { store_id: 'store-a', is_active: true }, error: null }) })
    expect(result.current.storeId).toBe('store-b')
  })
  it('clears role privileges immediately when the account changes', async () => {
    const { result, rerender } = renderHook(() => useCurrentUserRole())
    await act(async () => { f.requests[0]({ data: { role: 'owner', is_active: true }, error: null }) })
    expect(result.current.isOwner).toBe(true)
    f.auth = { session: { user: { id: 'b' } }, loading: false }; rerender()
    expect(result.current.isOwner).toBe(false)
    expect(result.current.hasPermission('staff:manage')).toBe(false)
    await act(async () => { f.requests[1]({ data: null, error: { message: 'denied' } }) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })
})
