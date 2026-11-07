import { expect, it, vi } from 'vitest'
import { getStores } from './adminStoreService'

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [{ id: 'store-1', name: 'Barbería Sol', business_type: 'tienda_articulos', industry_sub_type: 'comercio_general' }], error: null }),
    from: vi.fn().mockReturnValue({ select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: [{ store_id: 'store-1', category_id: 'barberia_belleza' }], error: null }) }) }) }),
  },
}))

it('uses the persisted primary branch category in the admin store directory', async () => {
  const stores = await getStores()
  expect(stores[0].category_id).toBe('barberia_belleza')
})
