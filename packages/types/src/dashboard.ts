export type TopProductsPeriod = 'today' | 'week' | 'month'

export interface PaymentMethodBreakdown {
  cash: number
  card: number
  qr: number
  transfer: number
}

export interface TodaySalesSummary {
  totalAmount: number
  transactionCount: number
  averageTicket: number
  byPaymentMethod?: PaymentMethodBreakdown
}

export interface DashboardCashRegisterStatus {
  isOpen: boolean
  registerId?: string
  openedAt?: string
  openingAmount?: number
  openedByName?: string
}

export interface LowStockAlertItem {
  variantId: string
  productName: string
  variantName: string
  stockQuantity: number
  lowStockThreshold: number
  unit?: string
}

export interface DashboardLowStockAlerts {
  lowStockCount: number
  outOfStockCount: number
  items: LowStockAlertItem[]
}

export interface DashboardTopProduct {
  variantId: string
  productName: string
  variantName: string
  totalQuantity: number
  totalRevenue: number
}

export interface LiveShiftSummary {
  hasOpenRegister: boolean
  registerId?: string
  openedAt?: string
  openedByName?: string
  openingAmount: number
  expectedCashInDrawer: number
  cashSales: number
  cardSales: number
  qrSales: number
  transferSales: number
  digitalSales: number
  cashIn: number
  cashOut: number
}

export interface ActiveRegisterMonitorItem {
  id: string
  openedAt: string
  openingAmount: number
  openedBy: string
  cashierName: string
  totalSales: number
  cashSales: number
  digitalSales: number
  transactionCount: number
  cashIn: number
  cashOut: number
  expectedCashInDrawer: number
}

export interface RecentCashMovementItem {
  id: string
  cashRegisterId: string
  type: 'in' | 'out'
  amount: number
  reason: string
  createdAt: string
  performedByName: string
}

export interface DashboardOperationalData {
  todaySales: TodaySalesSummary
  cashRegister: DashboardCashRegisterStatus
  lowStock: DashboardLowStockAlerts
  topProducts: DashboardTopProduct[]
  liveShift?: LiveShiftSummary
  activeRegisters?: ActiveRegisterMonitorItem[]
  recentMovements?: RecentCashMovementItem[]
}
