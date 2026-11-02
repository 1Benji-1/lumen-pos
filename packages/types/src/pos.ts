export type CashMovementType = 'in' | 'out'

export interface CashMovement {
  id: string
  store_id: string
  cash_register_id: string
  type: CashMovementType
  amount: number
  reason: string
  performed_by: string
  created_at: string
}

export type PaymentMethod = 'cash' | 'card' | 'qr' | 'transfer' | 'split'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'qr', label: 'Pago QR' },
  { value: 'transfer', label: 'Transferencia bancaria' },
  { value: 'split', label: 'Pago dividido' },
]

export interface PaymentSplitItem {
  payment_method: 'cash' | 'card' | 'qr' | 'transfer'
  amount: number
}

export type SaleStatus = 'completed' | 'refunded' | 'cancelled'

export const SALE_STATUS_MAP: Record<
  SaleStatus,
  { label: string; badgeColor: string }
> = {
  completed: {
    label: 'Completada',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  refunded: {
    label: 'Reembolsada / Anulada',
    badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  },
  cancelled: {
    label: 'Cancelada',
    badgeColor: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  },
}

export interface SalePayment {
  id: string
  sale_id: string
  store_id: string
  payment_method: 'cash' | 'card' | 'qr' | 'transfer'
  amount: number
  created_at: string
}

export interface SaleDetailedItem {
  id: string
  sale_id: string
  product_variant_id: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  cost_price: number
  product_variants?: {
    id: string
    name: string
    barcode: string | null
    unit: string
    image_url: string | null
    products?: {
      id: string
      name: string
    }
  }
}

export interface SaleDetailed {
  id: string
  store_id: string
  cash_register_id: string
  sold_by: string
  customer_id: string | null
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  total: number
  status: SaleStatus
  refund_reason: string | null
  refunded_at: string | null
  refunded_by: string | null
  customer_email: string | null
  created_at: string
  customers?: {
    id: string
    full_name: string
    phone: string | null
    email: string | null
  } | null
  users?: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  cash_registers?: {
    id: string
    status: 'open' | 'closed'
    opened_at: string
    closed_at?: string | null
  } | null
  refunded_by_user?: {
    id: string
    full_name: string | null
  } | null
  sale_items?: SaleDetailedItem[]
  sale_payments?: SalePayment[]
}

export interface CashRegisterReport {
  registerId: string
  openedAt: string
  closedAt?: string | null
  openedByUserId: string
  openedByName?: string
  openingAmount: number
  cashSalesTotal: number
  cashSalesCount: number
  cardSalesTotal: number
  cardSalesCount: number
  qrSalesTotal: number
  qrSalesCount: number
  transferSalesTotal: number
  transferSalesCount: number
  refundedSalesTotal: number
  refundedSalesCount: number
  totalSalesAmount: number
  totalSalesCount: number
  cashInTotal: number
  cashInCount: number
  cashOutTotal: number
  cashOutCount: number
  expectedCashAmount: number
  actualClosingAmount?: number | null
  difference?: number | null
}

export interface OfflineSalePayload {
  /** Durable tombstone: this attempt must never be replayed. */
  rejected?: boolean
  /** True only for a new attempt persisted while IndexedDB was unavailable. */
  localOnly?: boolean
  /** Original cashier; absent only in legacy queues. */
  userId?: string
  offlineId: string
  storeId: string
  cashRegisterId: string
  paymentMethod: PaymentMethod
  items: {
    product_variant_id: string
    quantity: number
    unit_price: number
    discount?: number
    productName?: string
    variantName?: string
  }[]
  customerId?: string | null
  discount?: number
  payments?: PaymentSplitItem[]
  customerEmail?: string | null
  createdAt: string
  synced: boolean
  total: number
}
