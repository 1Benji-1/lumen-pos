import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OfflineSalePayload } from '@lumen-pos/types'
import { clearSyncedSales, createQueuedSale, rejectOfflineSale, saveOfflineSale } from '../services/offlinePosService'
import { invalidatePosQueries } from './invalidatePosQueries'

export function useCreateSale(storeId: string | null) {
  const queryClient = useQueryClient()
  const blockedAttempt = useRef<OfflineSalePayload | null>(null)
  return useMutation({
    mutationFn: async ({ sale, isOnline }: { sale: OfflineSalePayload; isOnline: boolean }) => {
      if (!storeId || storeId !== sale.storeId) throw new Error('No se encontró la tienda de la venta')
      if (blockedAttempt.current) {
        await rejectOfflineSale(blockedAttempt.current.storeId, blockedAttempt.current)
        blockedAttempt.current = null
        throw Object.assign(new Error('El intento rechazado ya está protegido. Confirme nuevamente la compra corregida.'), { saleAttemptResolved: true })
      }
      // Write ahead of the network request: an unknown result can always be replayed.
      await saveOfflineSale(storeId, sale, { updateStockCache: !isOnline, allowLocalOnlyReplay: !isOnline })
      if (!isOnline) return sale.offlineId
      let saleId: string
      try {
        saleId = await createQueuedSale(sale)
      } catch (error) {
        // Postgres/PostgREST codes identify a response that definitively rejected
        // the transaction. Transport failures have no code: complete the durable
        // local purchase and let replay recover its unknown server outcome.
        if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' && error.code.trim()) {
          try {
            await rejectOfflineSale(storeId, sale)
          } catch (storageError) {
            blockedAttempt.current = sale
            throw storageError
          }
          throw Object.assign(error, { saleAttemptResolved: true })
        }
        return sale.offlineId
      }
      try {
        await clearSyncedSales(storeId, [sale.offlineId])
      } catch {
        // The server confirmed this purchase. Keep any remaining copy for
        // idempotent cleanup; leaving its cart editable could sell it twice.
      }
      return saleId
    },
    onSuccess: () => invalidatePosQueries(queryClient, storeId),
  })
}
