import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ sales: [] as Record<string, unknown>[], registers: [] as Record<string, unknown>[], movements: [] as Record<string, unknown>[] }))
vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    rpc: async () => ({ data: null, error: new Error('RPC no disponible') }),
    from: (table: string) => {
      let rows = [...(table === 'cash_registers' ? state.registers : table === 'cash_movements' ? state.movements : state.sales)]
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query },
        in: (key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query },
        gte: () => query,
        lte: () => query,
        order: async () => ({ data: rows, error: null }),
        then: (resolve: (result: { data: Record<string, unknown>[]; error: null }) => void) => resolve({ data: rows, error: null }),
      }
      return query
    },
  },
}))

import { fetchCashAuditAnalytics, fetchStoreAnalytics } from './analyticsService'

const range = { storeId: 'store-1', startDate: '2026-11-01T04:00:00Z', endDate: '2026-11-02T03:59:59Z' }
function sale(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1', store_id: 'store-1', total: 100, status: 'completed', payment_method: 'cash',
    created_at: '2026-11-01T12:00:00Z', sale_payments: [],
    sale_items: [{ id: 'line-1', quantity: 1, unit_price: 100, cost_price: 0, subtotal: 100,
      product_variants: { id: 'variant-1', name: 'Único', cost_price: 30, stock_quantity: 5, low_stock_threshold: 1,
        products: { id: 'product-1', name: 'Producto', categories: null } } }],
    ...overrides,
  }
}

describe('analítica calculada cuando RPC no está disponible', () => {
  beforeEach(() => { state.sales = [] })

  it('excluye devoluciones de ingresos y cantidad de operaciones', async () => {
    state.sales = [sale(), sale({ id: 'returned', total: 80, status: 'refunded' })]
    const result = await fetchStoreAnalytics(range)
    expect(result.summary.total_sales).toBe(100)
    expect(result.summary.total_orders).toBe(1)
  })

  it('desglosa efectivo y QR de un pago mixto sin contar el ticket dos veces', async () => {
    state.sales = [sale({ payment_method: 'split', sale_payments: [{ payment_method: 'cash', amount: 40 }, { payment_method: 'qr', amount: 60 }] })]
    const result = await fetchStoreAnalytics(range)
    expect(result.summary.total_sales).toBe(100)
    expect(result.summary.cash_sales).toBe(40)
    expect(result.summary.qr_sales).toBe(60)
  })

  it('conserva un costo histórico cero aunque el costo actual haya cambiado', async () => {
    state.sales = [sale()]
    const result = await fetchStoreAnalytics(range)
    expect(result.summary.total_cost).toBe(0)
    expect(result.summary.gross_profit).toBe(100)
  })

  it('reconcilia una devolución como ingreso original y un único egreso', async () => {
    state.registers = [{ id: 'register-1', store_id: 'store-1', status: 'closed', opened_at: '2026-11-01T08:00:00Z', closed_at: '2026-11-01T23:00:00Z', opening_amount: 100, closing_amount: 100, opened_by: 'cashier-1', users: { full_name: 'Cajero' } }]
    state.sales = [sale({ cash_register_id: 'register-1', status: 'refunded', total: 80, sale_payments: [{ payment_method: 'cash', amount: 80 }] })]
    state.movements = [{ cash_register_id: 'register-1', type: 'out', amount: 80 }]
    const result = await fetchCashAuditAnalytics(range)
    expect(result.shifts[0].expectedCash).toBe(100)
    expect(result.shifts[0].difference).toBe(0)
    expect(result.exactShiftsCount).toBe(1)
  })
})
