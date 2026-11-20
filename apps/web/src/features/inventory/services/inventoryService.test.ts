import { describe, expect, it, vi } from 'vitest'

const backend = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(() => { throw new Error('Alta no transaccional') }) }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: backend }))
import { createProductWithVariant } from './inventoryService'

describe('alta atómica de inventario', () => {
  it('envía producto, variante y stock inicial en una única operación de servidor', async () => {
    const result = { product: { id: 'product-1' }, variant: { id: 'variant-1', stock_quantity: 5 } }
    backend.rpc.mockResolvedValue({ data: result, error: null })
    await expect(createProductWithVariant({ storeId: 'store-1', name: 'Arroz', variantName: '1 kg', costPrice: 6, salePrice: 10, stockQuantity: 5 })).resolves.toEqual(result)
    expect(backend.rpc).toHaveBeenCalledWith('create_product_with_variant', {
      p_product: { name: 'Arroz', description: null, category_id: null, image_url: null },
      p_variant: { name: '1 kg', barcode: null, sku: null, cost_price: 6, sale_price: 10, stock_quantity: 5, low_stock_threshold: 5, unit: 'unit', image_url: null, supplier_id: null, track_batch: false, batch_number: null, expiry_date: null },
    })
    expect(backend.from).not.toHaveBeenCalled()
  })

  it('propaga el rechazo atómico sin intentar crear registros parciales', async () => {
    const error = new Error('Variante inválida')
    backend.rpc.mockResolvedValue({ data: null, error })
    await expect(createProductWithVariant({ storeId: 'store-1', name: 'Arroz', variantName: '1 kg', costPrice: -1, salePrice: 10, stockQuantity: 5 })).rejects.toBe(error)
    expect(backend.from).not.toHaveBeenCalled()
  })
})
