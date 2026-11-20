import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

const queue = vi.hoisted(() => ({ syncOfflineSales: vi.fn(), count: 1 }))
vi.mock('../services/offlinePosService', () => ({
  syncOfflineSales: queue.syncOfflineSales,
  getOfflineSales: () => [{ offlineId: 'pending' }],
  useOfflineSalesCount: () => queue.count,
  useOfflineSyncStatus: () => false,
}))
vi.mock('./useOnlineStatus', () => ({ useOnlineStatus: () => true }))
import { useAutoSyncOffline } from './useAutoSyncOffline'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks() })

it('spaces failed retries even when focus events fire and pending count changes', async () => {
  vi.useFakeTimers()
  queue.count = 1
  queue.syncOfflineSales.mockResolvedValue({ syncedCount: 0, errors: ['network'] })
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { rerender, unmount } = renderHook(() => useAutoSyncOffline('store-a'), { wrapper })
  await act(async () => {})
  expect(queue.syncOfflineSales).toHaveBeenCalledTimes(1)
  queue.count = 2
  rerender()
  await act(async () => { window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(7_999) })
  expect(queue.syncOfflineSales).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(queue.syncOfflineSales).toHaveBeenCalledTimes(2)
  await act(async () => { await vi.advanceTimersByTimeAsync(15_999) })
  expect(queue.syncOfflineSales).toHaveBeenCalledTimes(2)
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(queue.syncOfflineSales).toHaveBeenCalledTimes(3)
  unmount()
})

it('invalidates the actual cash report, dashboard and analytics query keys after sync', async () => {
  queue.count = 1
  queue.syncOfflineSales.mockResolvedValue({ syncedCount: 1, errors: [] })
  const client = new QueryClient()
  const keys = [['cashRegister', 'store-a'], ['cashRegisterReport', 'register'], ['dashboard_operational', 'store-a'], ['storeAnalytics', 'store-a'], ['cashAuditAnalytics', 'store-a']]
  for (const key of keys) client.setQueryData(key, { stale: false })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { unmount } = renderHook(() => useAutoSyncOffline('store-a'), { wrapper })
  await act(async () => {})
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  unmount()
})
