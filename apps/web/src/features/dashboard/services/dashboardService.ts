import { supabase } from '../../../shared/lib/supabaseClient'
import { getCashRegisterReport } from '../../pos/services/posService'
import type {
  TodaySalesSummary,
  DashboardCashRegisterStatus,
  DashboardLowStockAlerts,
  LowStockAlertItem,
  DashboardTopProduct,
  DashboardOperationalData,
  TopProductsPeriod,
  LiveShiftSummary,
  ActiveRegisterMonitorItem,
  RecentCashMovementItem,
} from '@lumen-pos/types'

/**
 * Obtiene el resumen de ventas del día actual con desglose por método de pago (zona horaria local)
 */
export async function getTodaySalesSummary(storeId: string): Promise<TodaySalesSummary> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      status,
      created_at,
      payment_method,
      sale_payments (
        payment_method,
        amount
      )
    `)
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())

  if (error) throw error

  const totalAmount = (data ?? []).reduce((acc, s) => acc + (Number(s.total) || 0), 0)
  const transactionCount = data?.length ?? 0
  const averageTicket = transactionCount > 0 ? totalAmount / transactionCount : 0

  let cash = 0
  let card = 0
  let qr = 0
  let transfer = 0

  for (const s of data ?? []) {
    const total = Number(s.total) || 0
    const payments = (s as any).sale_payments ?? []
    if (payments.length > 0) {
      for (const p of payments) {
        const amount = Number(p.amount) || 0
        if (p.payment_method === 'cash') cash += amount
        else if (p.payment_method === 'card') card += amount
        else if (p.payment_method === 'qr') qr += amount
        else if (p.payment_method === 'transfer') transfer += amount
      }
    } else {
      if (s.payment_method === 'cash') cash += total
      else if (s.payment_method === 'card') card += total
      else if (s.payment_method === 'qr') qr += total
      else if (s.payment_method === 'transfer') transfer += total
    }
  }

  return {
    totalAmount,
    transactionCount,
    averageTicket,
    byPaymentMethod: {
      cash,
      card,
      qr,
      transfer,
    },
  }
}

/**
 * Obtiene el estado actual de la caja (si hay caja abierta y desde cuándo)
 */
export async function getCashRegisterStatus(storeId: string): Promise<DashboardCashRegisterStatus> {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('id, opened_at, opening_amount, status, users!cash_registers_opened_by_fkey(full_name)')
    .eq('store_id', storeId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return {
      isOpen: false,
    }
  }

  return {
    isOpen: true,
    registerId: data.id,
    openedAt: data.opened_at,
    openingAmount: Number(data.opening_amount) || 0,
    openedByName: (data as any)?.users?.full_name ?? undefined,
  }
}

/**
 * Obtiene el conteo y detalle de productos con existencias en o por debajo de su umbral mínimo
 */
export async function getLowStockAlerts(storeId: string): Promise<DashboardLowStockAlerts> {
  const { data, error } = await supabase
    .from('product_variants')
    .select(
      `
      id,
      name,
      stock_quantity,
      low_stock_threshold,
      unit,
      is_active,
      products!inner (
        id,
        name,
        is_active
      )
    `
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('products.is_active', true)

  if (error) throw error

  const lowStockItems: LowStockAlertItem[] = []
  let outOfStockCount = 0

  for (const variant of data ?? []) {
    const stock = Number(variant.stock_quantity) || 0
    const threshold = Number(variant.low_stock_threshold ?? 5)

    if (stock <= threshold) {
      if (stock <= 0) {
        outOfStockCount++
      }

      lowStockItems.push({
        variantId: variant.id,
        productName: (variant as any).products?.name ?? 'Producto',
        variantName: variant.name,
        stockQuantity: stock,
        lowStockThreshold: threshold,
        unit: variant.unit,
      })
    }
  }

  // Ordenar por stock ascendente (más críticos primero)
  lowStockItems.sort((a, b) => a.stockQuantity - b.stockQuantity)

  return {
    lowStockCount: lowStockItems.length,
    outOfStockCount,
    items: lowStockItems.slice(0, 5),
  }
}

/**
 * Obtiene los productos más vendidos en ventas completadas según el período seleccionado
 */
export async function getTopSellingProducts(
  storeId: string,
  limit: number = 5,
  period: TopProductsPeriod = 'today'
): Promise<DashboardTopProduct[]> {
  let query = supabase
    .from('sales')
    .select(
      `
      id,
      status,
      created_at,
      sale_items (
        quantity,
        subtotal,
        product_variant_id,
        product_variants (
          id,
          name,
          products (
            id,
            name
          )
        )
      )
    `
    )
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const now = new Date()
  if (period === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    query = query.gte('created_at', startOfDay.toISOString())
  } else if (period === 'week') {
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    query = query.gte('created_at', startOfWeek.toISOString())
  } else if (period === 'month') {
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    query = query.gte('created_at', startOfMonth.toISOString())
  }

  const { data, error } = await query.limit(300)

  if (error) throw error

  const map = new Map<string, DashboardTopProduct>()

  for (const sale of data ?? []) {
    for (const item of (sale as any).sale_items ?? []) {
      const vId = item.product_variant_id
      if (!vId) continue

      const productName = item.product_variants?.products?.name ?? 'Producto'
      const variantName = item.product_variants?.name ?? ''
      const qty = Number(item.quantity) || 0
      const rev = Number(item.subtotal) || 0

      const existing = map.get(vId)
      if (existing) {
        existing.totalQuantity += qty
        existing.totalRevenue += rev
      } else {
        map.set(vId, {
          variantId: vId,
          productName,
          variantName,
          totalQuantity: qty,
          totalRevenue: rev,
        })
      }
    }
  }

  const topProducts = Array.from(map.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit)

  return topProducts
}

/**
 * Obtiene el resumen en vivo del turno de caja actual
 */
export async function getLiveShiftSummary(
  _storeId: string,
  cashRegister: DashboardCashRegisterStatus
): Promise<LiveShiftSummary> {
  if (!cashRegister.isOpen || !cashRegister.registerId) {
    return {
      hasOpenRegister: false,
      openingAmount: 0,
      expectedCashInDrawer: 0,
      cashSales: 0,
      cardSales: 0,
      qrSales: 0,
      transferSales: 0,
      digitalSales: 0,
      cashIn: 0,
      cashOut: 0,
    }
  }

  const report = await getCashRegisterReport(cashRegister.registerId)

  return {
    hasOpenRegister: true,
    registerId: report.registerId,
    openedAt: report.openedAt,
    openedByName: report.openedByName,
    openingAmount: report.openingAmount,
    expectedCashInDrawer: report.expectedCashAmount,
    cashSales: report.cashSalesTotal,
    cardSales: report.cardSalesTotal,
    qrSales: report.qrSalesTotal,
    transferSales: report.transferSalesTotal,
    digitalSales: report.cardSalesTotal + report.qrSalesTotal + report.transferSalesTotal,
    cashIn: report.cashInTotal,
    cashOut: report.cashOutTotal,
  }
}

/**
 * Obtiene todas las cajas actualmente abiertas en la tienda con sus métricas operativas en vivo
 */
export async function getActiveCashRegisters(storeId: string): Promise<ActiveRegisterMonitorItem[]> {
  const { data: registers, error } = await supabase
    .from('cash_registers')
    .select(`
      id,
      opened_at,
      opening_amount,
      opened_by,
      status,
      users!cash_registers_opened_by_fkey(full_name, email)
    `)
    .eq('store_id', storeId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })

  if (error) {
    console.error('Error fetching active cash registers:', error)
    return []
  }

  if (!registers || registers.length === 0) return []

  const reports = await Promise.all(
    registers.map(async (reg) => {
      try {
        const report = await getCashRegisterReport(reg.id)
        return {
          id: reg.id,
          openedAt: reg.opened_at,
          openingAmount: Number(reg.opening_amount) || 0,
          openedBy: reg.opened_by,
          cashierName: (reg as any)?.users?.full_name || 'Cajero en turno',
          totalSales: report.totalSalesAmount,
          cashSales: report.cashSalesTotal,
          digitalSales: report.cardSalesTotal + report.qrSalesTotal + report.transferSalesTotal,
          transactionCount: report.totalSalesCount,
          cashIn: report.cashInTotal,
          cashOut: report.cashOutTotal,
          expectedCashInDrawer: report.expectedCashAmount,
        }
      } catch {
        return {
          id: reg.id,
          openedAt: reg.opened_at,
          openingAmount: Number(reg.opening_amount) || 0,
          openedBy: reg.opened_by,
          cashierName: (reg as any)?.users?.full_name || 'Cajero en turno',
          totalSales: 0,
          cashSales: 0,
          digitalSales: 0,
          transactionCount: 0,
          cashIn: 0,
          cashOut: 0,
          expectedCashInDrawer: Number(reg.opening_amount) || 0,
        }
      }
    })
  )

  return reports
}

/**
 * Obtiene los movimientos manuales de caja más recientes registrados durante el día de hoy
 */
export async function getRecentCashMovements(
  storeId: string,
  limit: number = 8
): Promise<RecentCashMovementItem[]> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('cash_movements')
    .select(`
      id,
      cash_register_id,
      type,
      amount,
      reason,
      created_at,
      users!cash_movements_performed_by_fkey(full_name)
    `)
    .eq('store_id', storeId)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent cash movements:', error)
    return []
  }

  return (data ?? []).map((m: any) => ({
    id: m.id,
    cashRegisterId: m.cash_register_id,
    type: m.type as 'in' | 'out',
    amount: Number(m.amount) || 0,
    reason: m.reason || (m.type === 'in' ? 'Ingreso de efectivo' : 'Retiro de efectivo'),
    createdAt: m.created_at,
    performedByName: m.users?.full_name || 'Personal',
  }))
}

/**
 * Consulta consolidada para la Torre de Control y Panel Operativo
 */
export async function getDashboardOperationalData(
  storeId: string,
  period: TopProductsPeriod = 'today'
): Promise<DashboardOperationalData> {
  const [todaySales, cashRegister, lowStock, topProducts, activeRegisters, recentMovements] = await Promise.all([
    getTodaySalesSummary(storeId),
    getCashRegisterStatus(storeId),
    getLowStockAlerts(storeId),
    getTopSellingProducts(storeId, 5, period),
    getActiveCashRegisters(storeId),
    getRecentCashMovements(storeId, 8),
  ])

  const liveShift = await getLiveShiftSummary(storeId, cashRegister)

  return {
    todaySales,
    cashRegister,
    lowStock,
    topProducts,
    liveShift,
    activeRegisters,
    recentMovements,
  }
}
