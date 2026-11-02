import { beforeEach, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: db }))
import { createSale, getCashRegisterReport } from './posService'

beforeEach(() => vi.clearAllMocks())

it('counts original cash receipts and subtracts refund movements once, excluding cancelled sales', async () => {
  const rows: Record<string, unknown> = {
    cash_registers: { id: 'register', opened_at: '2026-11-02', opened_by: 'user', opening_amount: 100, closing_amount: 125 },
    sales: [
      { status: 'completed', payment_method: 'cash', total: 20, sale_payments: [] },
      { status: 'refunded', payment_method: 'cash', total: 50, sale_payments: [] },
      { status: 'refunded', payment_method: 'split', total: 80, sale_payments: [{ payment_method: 'cash', amount: 30 }, { payment_method: 'card', amount: 50 }] },
      { status: 'completed', payment_method: 'split', total: 25, sale_payments: [{ payment_method: 'cash', amount: 5 }, { payment_method: 'qr', amount: 20 }] },
      { status: 'cancelled', payment_method: 'cash', total: 999, sale_payments: [] },
    ],
    cash_movements: [{ type: 'out', amount: 50 }, { type: 'out', amount: 30 }],
  }
  db.from.mockImplementation((table) => {
    const query = { select: () => query, eq: () => query, single: () => query, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table], error: null }).then(resolve) }
    return query
  })
  const report = await getCashRegisterReport('register')
  expect(report).toMatchObject({ cashSalesTotal: 105, cardSalesTotal: 50, qrSalesTotal: 20, refundedSalesCount: 2, refundedSalesTotal: 130, expectedCashAmount: 125, difference: 0 })
})

it('passes the durable sale identity to the RPC', async () => {
  db.rpc.mockResolvedValue({ data: 'sale-id', error: null })
  db.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null })
  await createSale({ cashRegisterId: 'register', paymentMethod: 'cash', items: [], idempotencyKey: 'stable', createdAt: '2026-11-02T10:00:00Z', userId: 'user-a' })
  expect(db.rpc).toHaveBeenCalledWith('create_sale', expect.objectContaining({ p_idempotency_key: 'stable', p_created_at: '2026-11-02T10:00:00Z' }))
})

it('does not replay another cashiers queued sale', async () => {
  db.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-b' } }, error: null })
  await expect(createSale({ cashRegisterId: 'register', paymentMethod: 'cash', items: [], userId: 'user-a' })).rejects.toThrow(/usuario/i)
  expect(db.rpc).not.toHaveBeenCalled()
})
