import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import type { OfflineSalePayload } from '@lumen-pos/types'

const server = vi.hoisted(() => ({ createSale: vi.fn() }))
vi.mock('./posService', () => ({ createSale: server.createSale }))
import { clearSyncedSales, getOfflineSalesFromIndexedDB, saveOfflineSale, saveSaleToIndexedDB, syncOfflineSales } from './offlinePosService'

const registerId = '10000000-0000-4000-8000-000000000001'
const sale = (offlineId: string): OfflineSalePayload => ({
  offlineId, storeId: 'store-a', userId: 'user-a', cashRegisterId: registerId,
  paymentMethod: 'cash', items: [{ product_variant_id: 'variant-a', quantity: 1, unit_price: 10 }],
  total: 10, createdAt: '2026-11-02T10:00:00.000Z', synced: false,
})
const localKey = 'lumen_pos_offline_sales_store-a'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('indexedDB', new IDBFactory())
  localStorage.clear()
  server.createSale.mockReset().mockResolvedValue('server-sale')
})

describe('durable offline queue', () => {
  it('unions IndexedDB and localStorage and deduplicates sale IDs', async () => {
    await saveSaleToIndexedDB(sale('idb-only'))
    await saveSaleToIndexedDB(sale('shared'))
    localStorage.setItem(localKey, JSON.stringify([sale('local-only'), sale('shared')]))
    const pending = await getOfflineSalesFromIndexedDB('store-a')
    expect(pending.map(s => s.offlineId).sort()).toEqual(['idb-only', 'local-only', 'shared'])
  })

  it('waits for IndexedDB when localStorage quota is exhausted', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await saveOfflineSale('store-a', sale('durable'))
    expect((await getOfflineSalesFromIndexedDB('store-a')).map(s => s.offlineId)).toEqual(['durable'])
  })

  it('rejects persistence when both backends fail', async () => {
    vi.stubGlobal('indexedDB', undefined)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await expect((async () => saveOfflineSale('store-a', sale('lost')))()).rejects.toThrow()
  })

  it('rejects a provisional cash register without persisting a sale', async () => {
    await expect((async () => saveOfflineSale('store-a', { ...sale('bad'), cashRegisterId: 'offline-cash-register' }))()).rejects.toThrow(/caja/i)
    expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
  })

  it('awaits removal from both queues', async () => {
    await saveOfflineSale('store-a', sale('done'))
    await clearSyncedSales('store-a', ['done'])
    expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
    expect(JSON.parse(localStorage.getItem(localKey) || '[]')).toEqual([])
  })

  it('retries a lost response with the same server idempotency key and timestamp', async () => {
    const committed = new Set<string>()
    let loseResponse = true
    server.createSale.mockImplementation(async (params) => {
      committed.add(params.idempotencyKey)
      if (loseResponse) { loseResponse = false; throw new Error('response lost') }
      return 'server-sale'
    })
    await saveSaleToIndexedDB(sale('stable-id'))
    const first = await syncOfflineSales('store-a')
    expect(first.errors).toHaveLength(1)
    expect(await getOfflineSalesFromIndexedDB('store-a')).toHaveLength(1)
    expect((await syncOfflineSales('store-a')).syncedCount).toBe(1)
    expect([...committed]).toEqual(['stable-id'])
    expect(server.createSale.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'stable-id', createdAt: sale('').createdAt, userId: 'user-a' })
    expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
  })
})

it('keeps a replayable copy if cleanup of one backend fails', async () => {
  await saveOfflineSale('store-a', sale('cleanup-retry'))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  await expect(clearSyncedSales('store-a', ['cleanup-retry'])).rejects.toThrow(/limpiar/i)
  expect((await getOfflineSalesFromIndexedDB('store-a')).map(s => s.offlineId)).toEqual(['cleanup-retry'])
  vi.restoreAllMocks()
  await clearSyncedSales('store-a', ['cleanup-retry'])
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
})

it('serializes independent tab sync workers with the browser lock', async () => {
  const tails = new Map<string, Promise<void>>()
  const names: string[] = []
  vi.stubGlobal('navigator', { locks: { request: async (name: string, run: () => Promise<unknown>) => {
    names.push(name)
    const previous = tails.get(name) ?? Promise.resolve()
    let release = () => {}
    tails.set(name, new Promise<void>(resolve => { release = resolve }))
    await previous
    try { return await run() } finally { release() }
  } } })
  await saveSaleToIndexedDB(sale('one-sale'))
  vi.resetModules()
  const tabOne = await import('./offlinePosService')
  vi.resetModules()
  const tabTwo = await import('./offlinePosService')
  await Promise.all([tabOne.syncOfflineSales('store-a'), tabTwo.syncOfflineSales('store-a')])
  expect(names.filter(name => name === 'lumen-pos-sync-store-a')).toHaveLength(2)
  expect(server.createSale).toHaveBeenCalledTimes(1)
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
})

it('a local rejection marker dominates a stale pending IndexedDB copy', async () => {
  await saveSaleToIndexedDB(sale('rejected-id'))
  localStorage.setItem(localKey, JSON.stringify([{ ...sale('rejected-id'), rejected: true }]))
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
  expect((await syncOfflineSales('store-a')).syncedCount).toBe(0)
  expect(server.createSale).not.toHaveBeenCalled()
  await clearSyncedSales('store-a', ['rejected-id'])
  expect(JSON.parse(localStorage.getItem(localKey)!)).toMatchObject([{ rejected: true }])
})

it('can replay an explicitly local-only purchase when IndexedDB has never been available', async () => {
  vi.stubGlobal('indexedDB', undefined)
  await saveOfflineSale('store-a', sale('local-only-supported'))
  expect((await syncOfflineSales('store-a')).syncedCount).toBe(1)
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
})
