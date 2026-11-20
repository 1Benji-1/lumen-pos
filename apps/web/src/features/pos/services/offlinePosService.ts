import { useState, useEffect } from 'react'
import { createSale } from './posService'
import type { OfflineSalePayload } from '@lumen-pos/types'
import type { getProductsWithVariants } from '../../inventory/services/inventoryService'
type CachedProduct = Awaited<ReturnType<typeof getProductsWithVariants>>[number]

const OFFLINE_SALES_KEY_PREFIX = 'lumen_pos_offline_sales_'
const PRODUCTS_CACHE_KEY_PREFIX = 'lumen_pos_products_cache_'
const DB_NAME = 'lumen_pos_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'offline_sales'
// If every write fails, prevent replay in this session until persistence recovers.
const blockedRejections = new Map<string, OfflineSalePayload>()

// A failed transaction is not a durable write. Callers must observe rejection.
function openLumenDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'offlineId' })
        store.createIndex('storeId', 'storeId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB está bloqueado por otra pestaña'))
  })
}

async function writeIndexedDB(change: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openLumenDB()
  if (!db) throw new Error('IndexedDB no está disponible')
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('No se guardó la venta local'))
      change(tx.objectStore(STORE_NAME))
    })
  } finally {
    db.close()
  }
}

export async function saveSaleToIndexedDB(sale: OfflineSalePayload): Promise<void> {
  await writeIndexedDB(store => { store.put(sale) })
}

function mergeSales(...queues: OfflineSalePayload[][]): OfflineSalePayload[] {
  const merged = new Map<string, OfflineSalePayload>()
  for (const sale of queues.flat()) {
    const current = merged.get(sale.offlineId)
    if (!current?.rejected || sale.rejected) merged.set(sale.offlineId, sale)
  }
  return [...merged.values()]
}

async function getStoredSalesFromIndexedDB(storeId: string): Promise<OfflineSalePayload[]> {
  const localSales = mergeSales(readLocalSales(storeId, true), [...blockedRejections.values()].filter(sale => sale.storeId === storeId))
  const localAuthorityIsComplete = localSales.every(sale => sale.rejected || sale.localOnly === true)
  const unavailableAuthority = () => new Error('No se puede consultar IndexedDB para verificar rechazos anteriores. La sincronización permanece bloqueada hasta recuperar ese almacenamiento.')
  let db: IDBDatabase | null = null
  try {
    db = await openLumenDB()
    if (!db) {
      if (!localAuthorityIsComplete) throw unavailableAuthority()
      return localSales
    }
    const idbSales = await new Promise<OfflineSalePayload[]>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).index('storeId').getAll(storeId)
      request.onsuccess = () => resolve(request.result as OfflineSalePayload[])
      request.onerror = () => reject(request.error)
      tx.onabort = () => reject(tx.error)
    })
    return mergeSales(localSales, idbSales)
  } catch {
    if (!localAuthorityIsComplete) throw unavailableAuthority()
    return localSales
  } finally {
    db?.close()
  }
}

export async function getOfflineSalesFromIndexedDB(storeId: string): Promise<OfflineSalePayload[]> {
  return (await getStoredSalesFromIndexedDB(storeId)).filter(sale => !sale.rejected)
}

export async function removeSyncedSalesFromIndexedDB(syncedIds: string[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  await writeIndexedDB(store => { syncedIds.forEach(id => store.delete(id)) })
}

async function withBrowserLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(name, operation)
  }
  return operation()
}

// Emite eventos en la misma pestaña y a través de BroadcastChannel a otras pestañas
export function notifyOfflineSalesChange(storeId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('lumen_offline_sales_changed', { detail: { storeId } }))
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('lumen_pos_offline_channel')
      channel.postMessage({ type: 'sales_changed', storeId })
      channel.close()
    }
  } catch {
    // noop
  }
}

// Hook reactivo para contar ventas offline desde IndexedDB y localStorage en tiempo real
export function useOfflineSalesCount(storeId: string | null): number {
  const [snapshot, setSnapshot] = useState(() => ({ storeId, count: storeId ? getOfflineSales(storeId).length : 0 }))

  useEffect(() => {
    if (!storeId) return

    let isMounted = true

    const updateCount = async () => {
      try {
        const idbSales = await getOfflineSalesFromIndexedDB(storeId)
        if (isMounted) {
          setSnapshot({ storeId, count: idbSales.length })
        }
      } catch {
        if (isMounted) {
          setSnapshot({ storeId, count: getOfflineSales(storeId).length })
        }
      }
    }

    updateCount()

    // Escuchar cambios en la misma pestaña
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ storeId?: string }>
      if (!customEvent.detail?.storeId || customEvent.detail.storeId === storeId) {
        updateCount()
      }
    }

    // Escuchar cambios entre pestañas vía BroadcastChannel
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('lumen_pos_offline_channel')
        channel.onmessage = (event) => {
          if (event.data?.storeId === storeId) {
            updateCount()
          }
        }
      } catch {
        // noop
      }
    }

    // Escuchar evento de storage de localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${OFFLINE_SALES_KEY_PREFIX}${storeId}`) {
        updateCount()
      }
    }

    window.addEventListener('lumen_offline_sales_changed', handleCustomEvent)
    window.addEventListener('storage', handleStorage)
    const interval = setInterval(updateCount, 4000)

    return () => {
      isMounted = false
      window.removeEventListener('lumen_offline_sales_changed', handleCustomEvent)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
      if (channel) {
        channel.close()
      }
    }
  }, [storeId])

  return snapshot.storeId === storeId ? snapshot.count : 0
}

function readLocalSales(storeId: string, strict = false): OfflineSalePayload[] {
  try {
    const raw = localStorage.getItem(`${OFFLINE_SALES_KEY_PREFIX}${storeId}`)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((sale): sale is OfflineSalePayload => !!sale && sale.storeId === storeId && typeof sale.offlineId === 'string')
      : []
  } catch {
    if (strict) throw new Error('No se puede consultar localStorage para verificar la cola y sus rechazos. La operación permanece bloqueada.')
    return []
  }
}

export function getOfflineSales(storeId: string): OfflineSalePayload[] {
  return mergeSales(readLocalSales(storeId), [...blockedRejections.values()].filter(sale => sale.storeId === storeId))
    .filter(sale => !sale.rejected)
}

/** Keep tombstones: deleting one while another backend has a pending copy revives it. */
export async function rejectOfflineSale(storeId: string, sale: OfflineSalePayload): Promise<void> {
  const marker = { ...sale, rejected: true }
  const markerKey = `${storeId}:${sale.offlineId}`
  blockedRejections.set(markerKey, marker)
  await withBrowserLock(`lumen-pos-storage-${storeId}`, async () => {
    const recorded = await Promise.allSettled([
      saveSaleToIndexedDB(marker),
      Promise.resolve().then(() => {
        const current = mergeSales(readLocalSales(storeId, true), [marker])
        localStorage.setItem(`${OFFLINE_SALES_KEY_PREFIX}${storeId}`, JSON.stringify(current))
      }),
    ])
    // Each backend must contain a marker OR have its pending copy removed.
    // A marker in just one backend cannot authorize editing if the stale other
    // copy could be read later without that rejection authority.
    const protectedCopies = await Promise.allSettled(recorded.map((result, index) => {
      if (result.status === 'fulfilled') return Promise.resolve()
      if (index === 0) return removeSyncedSalesFromIndexedDB([sale.offlineId])
      return Promise.resolve().then(() => {
        const current = readLocalSales(storeId, true)
        localStorage.setItem(`${OFFLINE_SALES_KEY_PREFIX}${storeId}`, JSON.stringify(current.filter(currentSale => currentSale.offlineId !== sale.offlineId)))
      })
    }))
    if (protectedCopies.some(result => result.status === 'rejected')) {
      throw Object.assign(new Error('La venta fue rechazada, pero no se pudo asegurar su retiro de ambas colas. Reintente sin cerrar esta ventana; el intento permanece bloqueado.'), { saleAttemptLocked: true })
    }
    blockedRejections.delete(markerKey)
  })
  notifyOfflineSalesChange(storeId)
}

export async function saveOfflineSale(
  storeId: string, sale: OfflineSalePayload, options: { updateStockCache?: boolean; allowLocalOnlyReplay?: boolean } = {}
): Promise<void> {
  if (sale.storeId !== storeId) throw new Error('La venta pertenece a otra tienda')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sale.cashRegisterId)) {
    throw new Error('Debe iniciar una caja real antes de registrar una venta sin conexión')
  }
  await withBrowserLock(`lumen-pos-storage-${storeId}`, async () => {
    const existing = await getStoredSalesFromIndexedDB(storeId)
    if (existing.some(current => current.offlineId === sale.offlineId && current.rejected)) {
      throw Object.assign(new Error('Este intento fue rechazado. Confirme de nuevo para iniciar otra compra.'), { saleAttemptResolved: true })
    }
    const storedSale = { ...sale, localOnly: options.allowLocalOnlyReplay !== false && typeof indexedDB === 'undefined' }
    const results = await Promise.allSettled([
      saveSaleToIndexedDB(storedSale),
      Promise.resolve().then(() => {
        const current = mergeSales(readLocalSales(storeId, true), [storedSale])
        localStorage.setItem(`${OFFLINE_SALES_KEY_PREFIX}${storeId}`, JSON.stringify(current))
      }),
    ])
    if (results.every(result => result.status === 'rejected')) {
      throw new Error('No se pudo guardar la venta en este dispositivo. El carrito se conserva.')
    }
    // A retry of the same sale must not deduct the cached stock again.
    if (options.updateStockCache !== false && !existing.some(current => current.offlineId === sale.offlineId)) {
      try {
        const products = getCachedProductsForOffline(storeId)
        if (products) {
          for (const item of sale.items) {
            for (const product of products) {
              for (const variant of product.product_variants ?? []) {
                if (variant.id === item.product_variant_id) variant.stock_quantity -= item.quantity
              }
            }
          }
          cacheProductsForOffline(storeId, products)
        }
      } catch {
        // The catalogue cache is optional; the durable queue is authoritative.
      }
    }
  })
  notifyOfflineSalesChange(storeId)
}

export async function clearSyncedSales(storeId: string, syncedIds: string[]): Promise<void> {
  await withBrowserLock(`lumen-pos-storage-${storeId}`, async () => {
    const stored = await getStoredSalesFromIndexedDB(storeId)
    const safeIds = syncedIds.filter(id => !stored.some(sale => sale.offlineId === id && sale.rejected))
    if (safeIds.length === 0) return
    const results = await Promise.allSettled([
      removeSyncedSalesFromIndexedDB(safeIds),
      Promise.resolve().then(() => {
        const current = readLocalSales(storeId, true)
        const remaining = current.filter(sale => !safeIds.includes(sale.offlineId))
        if (remaining.length !== current.length) {
          localStorage.setItem(`${OFFLINE_SALES_KEY_PREFIX}${storeId}`, JSON.stringify(remaining))
        }
      }),
    ])
    if (results.some(result => result.status === 'rejected')) {
      throw new Error('La venta se recibió, pero no se pudo limpiar la cola local. Se reintentará de forma segura.')
    }
  })
  notifyOfflineSalesChange(storeId)
}

export function cacheProductsForOffline(storeId: string, products: CachedProduct[]): void {
  try {
    localStorage.setItem(`${PRODUCTS_CACHE_KEY_PREFIX}${storeId}`, JSON.stringify(products))
  } catch {
    // noop
  }
}

export function getCachedProductsForOffline(storeId: string): CachedProduct[] | null {
  try {
    const raw = localStorage.getItem(`${PRODUCTS_CACHE_KEY_PREFIX}${storeId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Control global de concurrencia para evitar sincronizaciones duplicadas
let isSyncingGlobally = false

export function isOfflineSyncing(): boolean {
  return isSyncingGlobally
}

export function notifySyncStatusChange(storeId: string, isSyncing: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('lumen_offline_sync_status', { detail: { storeId, isSyncing } })
    )
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('lumen_pos_offline_channel')
      channel.postMessage({ type: 'sync_status', storeId, isSyncing })
      channel.close()
    }
  } catch {
    // noop
  }
}

export function useOfflineSyncStatus(): boolean {
  const [isSyncing, setIsSyncing] = useState(() => isOfflineSyncing())

  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ isSyncing?: boolean }>
      if (typeof customEvent.detail?.isSyncing === 'boolean') {
        setIsSyncing(customEvent.detail.isSyncing)
      }
    }

    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('lumen_pos_offline_channel')
        channel.onmessage = (event) => {
          if (event.data?.type === 'sync_status' && typeof event.data?.isSyncing === 'boolean') {
            setIsSyncing(event.data.isSyncing)
          }
        }
      } catch {
        // noop
      }
    }

    window.addEventListener('lumen_offline_sync_status', handleStatus)

    return () => {
      window.removeEventListener('lumen_offline_sync_status', handleStatus)
      if (channel) channel.close()
    }
  }, [])

  return isSyncing
}

export async function createQueuedSale(sale: OfflineSalePayload): Promise<string> {
  return createSale({
    cashRegisterId: sale.cashRegisterId,
    idempotencyKey: sale.offlineId,
    createdAt: sale.createdAt,
    userId: sale.userId,
    paymentMethod: sale.paymentMethod,
    items: sale.items.map(item => ({
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
    })),
    customerId: sale.customerId,
    discount: sale.discount,
    payments: sale.payments,
    customerEmail: sale.customerEmail,
  })
}

export async function syncOfflineSales(
  storeId: string
): Promise<{ syncedCount: number; errors: string[] }> {
  if (isSyncingGlobally) return { syncedCount: 0, errors: [] }
  isSyncingGlobally = true
  notifySyncStatusChange(storeId, true)
  try {
    return await withBrowserLock(`lumen-pos-sync-${storeId}`, async () => {
      const pending = await getOfflineSalesFromIndexedDB(storeId)
      const syncedIds: string[] = []
      const errors: string[] = []
      for (const sale of pending) {
        try {
          await createQueuedSale(sale)
          syncedIds.push(sale.offlineId)
        } catch (err) {
          errors.push(`Venta ${sale.offlineId.slice(0, 8)}: ${err instanceof Error ? err.message : 'Error al sincronizar'}`)
        }
      }
      if (syncedIds.length > 0) await clearSyncedSales(storeId, syncedIds)
      return { syncedCount: syncedIds.length, errors }
    })
  } finally {
    isSyncingGlobally = false
    notifySyncStatusChange(storeId, false)
  }
}
