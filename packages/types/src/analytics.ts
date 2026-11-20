export type AnalyticsPeriod =
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'this_month'
  | 'last_month'
  | 'custom'

export interface AnalyticsSummary {
  total_sales: number
  total_orders: number
  total_cost: number
  gross_profit: number
  profit_margin: number
  average_ticket: number
  cash_sales: number
  card_sales: number
  qr_sales?: number
  transfer_sales?: number
}

export interface DailySalesMetric {
  date: string
  total_sales: number
  total_cost: number
  gross_profit: number
  orders_count: number
}

export interface TopProductMetric {
  product_id: string
  product_name: string
  variant_name: string
  category_name?: string | null
  quantity_sold: number
  revenue: number
  cost: number
  gross_profit: number
  profit_margin: number
  current_stock?: number
  low_stock_threshold?: number
}

export interface PaymentMethodMetric {
  method: string
  total: number
  count: number
}

export interface StoreAnalyticsData {
  summary: AnalyticsSummary
  daily_sales: DailySalesMetric[]
  top_products: TopProductMetric[]
  payment_methods: PaymentMethodMetric[]
}

export interface AnalyticsFilterParams {
  startDate: string
  endDate: string
}

export interface CashAuditShiftItem {
  id: string
  openedAt: string
  closedAt: string | null
  openedByUserId: string
  cashierName: string
  openingAmount: number
  cashSales: number
  cashIn: number
  cashOut: number
  expectedCash: number
  actualClosing: number
  difference: number
  isExact: boolean
  isSurplus: boolean
  isDeficit: boolean
  notes?: string | null
}

export interface CashierAuditMetric {
  userId: string
  cashierName: string
  totalShifts: number
  exactShifts: number
  surplusAmount: number
  deficitAmount: number
  netDifference: number
  accuracyRate: number
}

export interface CashAuditSummary {
  totalClosedShifts: number
  exactShiftsCount: number
  accuracyRate: number
  totalSurplus: number
  totalDeficit: number
  netVariance: number
  shifts: CashAuditShiftItem[]
  cashiers: CashierAuditMetric[]
}
