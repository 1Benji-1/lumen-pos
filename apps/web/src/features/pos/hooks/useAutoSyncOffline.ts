import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOnlineStatus } from './useOnlineStatus'
import { syncOfflineSales, useOfflineSalesCount, useOfflineSyncStatus } from '../services/offlinePosService'
import { invalidatePosQueries } from './invalidatePosQueries'

/** One timer owns retry scheduling; status changes and focus cannot bypass backoff. */
export function useAutoSyncOffline(storeId: string | null) {
  const isOnline = useOnlineStatus()
  const offlineCount = useOfflineSalesCount(storeId)
  const isSyncing = useOfflineSyncStatus()
  const queryClient = useQueryClient()
  const retry = useRef({ storeId, failures: 0, nextAttemptAt: 0, running: false })

  useEffect(() => {
    if (retry.current.storeId !== storeId) {
      retry.current = { storeId, failures: 0, nextAttemptAt: 0, running: false }
    }
    if (!isOnline || !storeId || offlineCount === 0) return

    const state = retry.current
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = (delay: number) => {
      clearTimeout(timer)
      if (!disposed) timer = setTimeout(() => { void run() }, delay)
    }
    const run = async () => {
      if (disposed) return
      if (state.running) { schedule(8000); return }
      const remainingDelay = state.nextAttemptAt - Date.now()
      if (remainingDelay > 0) { schedule(remainingDelay); return }
      state.running = true
      try {
        const result = await syncOfflineSales(storeId)
        state.failures = result.errors.length > 0 ? state.failures + 1 : 0
        if (result.syncedCount > 0 && !disposed) await invalidatePosQueries(queryClient, storeId)
      } catch {
        state.failures++
      } finally {
        state.running = false
        const delay = Math.min(120_000, 8000 * 2 ** Math.max(0, state.failures - 1))
        state.nextAttemptAt = Date.now() + delay
        schedule(delay)
      }
    }
    void run()
    const onFocus = () => { void run() }
    window.addEventListener('focus', onFocus)
    return () => {
      disposed = true
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [storeId, isOnline, offlineCount, queryClient])

  return { isSyncing, offlineCount, isOnline }
}
