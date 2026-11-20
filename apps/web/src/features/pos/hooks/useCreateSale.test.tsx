import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import type { OfflineSalePayload } from '@lumen-pos/types'
const server = vi.hoisted(() => ({ createSale: vi.fn() }))
vi.mock('../services/posService', () => ({ createSale: server.createSale }))
import { useCreateSale } from './useCreateSale'
import { getOfflineSalesFromIndexedDB, syncOfflineSales } from '../services/offlinePosService'

afterEach(cleanup)

const sale: OfflineSalePayload = { offlineId: 'checkout-id', storeId: 'store-a', userId: 'user-a', cashRegisterId: '10000000-0000-4000-8000-000000000001', paymentMethod: 'cash', items: [], total: 10, synced: false, createdAt: '2026-11-02T10:00:00Z' }
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal('indexedDB', new IDBFactory()); localStorage.clear(); server.createSale.mockReset().mockResolvedValue('server-sale') })

it('persists offline checkout before resolving completion', async () => {
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  let id: string | undefined
  await act(async () => { id = await result.current.mutateAsync({ sale, isOnline: false }) })
  expect(id).toBe('checkout-id')
  expect(await getOfflineSalesFromIndexedDB('store-a')).toHaveLength(1)
  expect(server.createSale).not.toHaveBeenCalled()
})

it('rejects completion on storage failure before contacting server', async () => {
  vi.stubGlobal('indexedDB', undefined)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toThrow() })
  expect(server.createSale).not.toHaveBeenCalled()
})

it('preserves the queued identity after an online lost response, then removes it on retry', async () => {
  const committed = new Set<string>()
  let responseLost = true
  server.createSale.mockImplementation(async params => {
    committed.add(params.idempotencyKey)
    if (responseLost) { responseLost = false; throw new Error('response lost') }
    return 'server-sale'
  })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { expect(await result.current.mutateAsync({ sale, isOnline: true })).toBe('checkout-id') })
  expect(await getOfflineSalesFromIndexedDB('store-a')).toHaveLength(1)
  await act(async () => { expect((await syncOfflineSales('store-a')).syncedCount).toBe(1) })
  expect([...committed]).toEqual(['checkout-id'])
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
})

it('removes a definitively rejected sale so background sync cannot submit an edited purchase later', async () => {
  server.createSale.mockRejectedValue({ code: 'P0001', message: 'Stock insuficiente' })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ code: 'P0001' }) })
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
})

it('does not discount the offline catalogue before online acceptance', async () => {
  localStorage.setItem('lumen_pos_products_cache_store-a', JSON.stringify([{ product_variants: [{ id: 'variant', stock_quantity: 5 }] }]))
  server.createSale.mockRejectedValue(new TypeError('Failed to fetch'))
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { expect(await result.current.mutateAsync({ sale: { ...sale, items: [{ product_variant_id: 'variant', quantity: 1, unit_price: 10 }] }, isOnline: true })).toBe('checkout-id') })
  expect(JSON.parse(localStorage.getItem('lumen_pos_products_cache_store-a')!)[0].product_variants[0].stock_quantity).toBe(5)
})

it('completes a confirmed server sale even if local cleanup needs another replay', async () => {
  server.createSale.mockImplementation(async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    return 'confirmed-sale'
  })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { expect(await result.current.mutateAsync({ sale, isOnline: true })).toBe('confirmed-sale') })
  expect((await getOfflineSalesFromIndexedDB('store-a')).map(s => s.offlineId)).toEqual(['checkout-id'])
  vi.restoreAllMocks()
  server.createSale.mockResolvedValue('confirmed-sale')
  expect((await syncOfflineSales('store-a')).syncedCount).toBe(1)
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
})

it('never replays a rejected checkout when localStorage cleanup fails and stock later changes', async () => {
  server.createSale.mockImplementation(async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    throw { code: 'P0001', message: 'Stock insuficiente' }
  })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toBeDefined() })
  vi.restoreAllMocks()
  server.createSale.mockResolvedValue('unexpected-old-sale')
  vi.resetModules()
  const reloadedQueue = await import('../services/offlinePosService')
  expect(await reloadedQueue.getOfflineSalesFromIndexedDB('store-a')).toEqual([])
  expect((await reloadedQueue.syncOfflineSales('store-a')).syncedCount).toBe(0)
  expect(server.createSale).toHaveBeenCalledTimes(1)
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ saleAttemptResolved: true }) })
})

it('blocks an edited purchase while no backend can record or clean a definitive rejection', async () => {
  server.createSale.mockImplementation(async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('disk unavailable') })
    vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(() => { throw new Error('disk unavailable') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    throw { code: 'P0001', message: 'Stock insuficiente' }
  })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ saleAttemptLocked: true }) })
  server.createSale.mockResolvedValue('must-not-be-submitted')
  await act(async () => { await expect(result.current.mutateAsync({ sale: { ...sale, offlineId: 'edited-purchase', total: 20 }, isOnline: true })).rejects.toMatchObject({ saleAttemptLocked: true }) })
  expect(server.createSale).toHaveBeenCalledTimes(1)
  vi.restoreAllMocks()
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ saleAttemptResolved: true }) })
  expect(await getOfflineSalesFromIndexedDB('store-a')).toEqual([])
  await act(async () => { expect(await result.current.mutateAsync({ sale: { ...sale, offlineId: 'new-purchase' }, isOnline: true })).toBe('must-not-be-submitted') })
})

it.each(['unavailable', 'open-error', 'local-only-online'] as const)('fails closed after reload if a rejected dual queue cannot consult its IndexedDB marker (%s)', async unavailableMode => {
  if (unavailableMode === 'local-only-online') vi.stubGlobal('indexedDB', undefined)
  server.createSale.mockImplementation(async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    throw { code: 'P0001', message: 'Stock insuficiente' }
  })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toBeDefined() })
  vi.restoreAllMocks()
  const persistedDB = indexedDB
  vi.stubGlobal('indexedDB', unavailableMode !== 'open-error' ? undefined : { open: () => { throw new Error('IndexedDB unavailable') } })
  vi.resetModules()
  server.createSale.mockResolvedValue('must-not-revive')
  const reloadedQueue = await import('../services/offlinePosService')
  await expect(reloadedQueue.syncOfflineSales('store-a')).rejects.toThrow(/IndexedDB/)
  expect(server.createSale).toHaveBeenCalledTimes(1)
  vi.stubGlobal('indexedDB', persistedDB)
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ saleAttemptResolved: true }) })
})

it('fails closed after reload if a rejected queue cannot consult its localStorage marker', async () => {
  server.createSale.mockImplementation(async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('disk unavailable') })
    vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(() => { throw new Error('disk unavailable') })
    throw { code: 'P0001', message: 'Stock insuficiente' }
  })
  const { result } = renderHook(() => useCreateSale('store-a'), { wrapper })
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ saleAttemptLocked: true }) })
  vi.restoreAllMocks()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage unavailable') })
  vi.resetModules()
  server.createSale.mockResolvedValue('must-not-revive')
  const reloadedQueue = await import('../services/offlinePosService')
  await expect(reloadedQueue.syncOfflineSales('store-a')).rejects.toThrow(/localStorage/)
  expect(server.createSale).toHaveBeenCalledTimes(1)
  vi.restoreAllMocks()
  await act(async () => { await expect(result.current.mutateAsync({ sale, isOnline: true })).rejects.toMatchObject({ saleAttemptResolved: true }) })
})
