import { supabase } from '../../../shared/lib/supabaseClient'
import type {
  StoreAnalyticsData,
  AnalyticsSummary,
  DailySalesMetric,
  TopProductMetric,
  PaymentMethodMetric,
  CashAuditSummary,
  CashAuditShiftItem,
  CashierAuditMetric,
} from '@lumen-pos/types'

function fillMissingDays(
  dailySales: DailySalesMetric[],
  startDate: string,
  endDate: string
): DailySalesMetric[] {
  const map = new Map(dailySales.map((d) => [d.date, d]))
  const result: DailySalesMetric[] = []

  const start = new Date(startDate)
  const end = new Date(endDate)

  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays >= 1 && diffDays <= 35) {
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    while (cur <= last) {
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      if (map.has(dateStr)) {
        result.push(map.get(dateStr)!)
      } else {
        result.push({
          date: dateStr,
          total_sales: 0,
          total_cost: 0,
          gross_profit: 0,
          orders_count: 0,
        })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }

  return dailySales
}

export async function fetchStoreAnalytics({
  storeId,
  startDate,
  endDate,
}: {
  storeId: string
  startDate: string
  endDate: string
}): Promise<StoreAnalyticsData> {
  // Intentar ejecutar la función RPC en la base de datos
  try {
    const { data, error } = await supabase.rpc('get_store_analytics', {
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (!error && data) {
      const parsed = data as unknown as StoreAnalyticsData
      let topProds = parsed.top_products ?? []

      // Enriquecer productos más vendidos con stock actual si el RPC no lo incluye
      if (topProds.length > 0 && topProds[0].current_stock === undefined) {
        try {
          const productIds = Array.from(new Set(topProds.map((p) => p.product_id)))
          const { data: variants } = await supabase
            .from('product_variants')
            .select('product_id, stock_quantity, low_stock_threshold')
            .in('product_id', productIds)

          if (variants && variants.length > 0) {
            const stockMap = new Map<string, { stock: number; low: number }>()
            for (const v of variants) {
              const prev = stockMap.get(v.product_id)
              stockMap.set(v.product_id, {
                stock: (prev?.stock ?? 0) + (Number(v.stock_quantity) || 0),
                low: typeof v.low_stock_threshold === 'number' ? v.low_stock_threshold : (prev?.low ?? 5),
              })
            }
            topProds = topProds.map((p) => {
              const st = stockMap.get(p.product_id)
              return {
                ...p,
                current_stock: st ? st.stock : 0,
                low_stock_threshold: st ? st.low : 5,
              }
            })
          }
        } catch {
          // Fallback silencioso si no se puede consultar el stock adicional
        }
      }

      // Si el resumen de RPC no incluye qr_sales o transfer_sales, calcularlos desde payment_methods
      const methods = parsed.payment_methods ?? []
      const qrFromMethods = methods.find((m) => m.method === 'qr')?.total ?? 0
      const transferFromMethods = methods.find((m) => m.method === 'transfer')?.total ?? 0

      return {
        ...parsed,
        summary: {
          ...parsed.summary,
          qr_sales: parsed.summary.qr_sales ?? qrFromMethods,
          transfer_sales: parsed.summary.transfer_sales ?? transferFromMethods,
        },
        daily_sales: fillMissingDays(parsed.daily_sales ?? [], startDate, endDate),
        top_products: topProds,
      }
    }
  } catch {
    // Si la función RPC no está disponible aún, usar el cálculo fallback cliente
  }

  // Fallback: cálculo directo mediante consultas cliente
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      payment_method,
      status,
      created_at,
      sale_payments (payment_method, amount),
      sale_items (
        id,
        quantity,
        unit_price,
        cost_price,
        subtotal,
        product_variants (
          id,
          name,
          cost_price,
          stock_quantity,
          low_stock_threshold,
          products (
            id,
            name,
            categories (name)
          )
        )
      )
    `)
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true })

  if (salesError) throw salesError

  let totalSales = 0
  let totalCost = 0
  let cashSales = 0
  let cardSales = 0
  let qrSales = 0
  let transferSales = 0

  const dailyMap = new Map<string, { total_sales: number; total_cost: number; orders_count: number }>()
  const productsMap = new Map<
    string,
    {
      product_id: string
      product_name: string
      variant_name: string
      category_name: string | null
      quantity_sold: number
      revenue: number
      cost: number
      current_stock?: number
      low_stock_threshold?: number
    }
  >()
  const paymentMap = new Map<string, { total: number; count: number }>()

  for (const s of sales ?? []) {
    const saleTotal = Number(s.total) || 0
    totalSales += saleTotal

    const payments = s.sale_payments?.length
      ? s.sale_payments
      : [{ payment_method: s.payment_method, amount: saleTotal }]
    for (const payment of payments) {
      const amount = Number(payment.amount) || 0
      if (payment.payment_method === 'cash') cashSales += amount
      else if (payment.payment_method === 'card') cardSales += amount
      else if (payment.payment_method === 'qr') qrSales += amount
      else if (payment.payment_method === 'transfer') transferSales += amount
      const current = paymentMap.get(payment.payment_method) ?? { total: 0, count: 0 }
      current.total += amount
      current.count++
      paymentMap.set(payment.payment_method, current)
    }

    // Agrupación diaria
    const day = s.created_at.split('T')[0]
    const dCurrent = dailyMap.get(day) ?? { total_sales: 0, total_cost: 0, orders_count: 0 }
    dCurrent.total_sales += saleTotal
    dCurrent.orders_count++

    let saleCost = 0

    // Items
    for (const item of s.sale_items ?? []) {
      const qty = Number(item.quantity) || 0
      const variant = item.product_variants
      const product = variant?.products
      const costUnit = Number(item.cost_price ?? variant?.cost_price) || 0
      const itemCost = qty * costUnit
      const itemRevenue = Number(item.subtotal) || 0

      saleCost += itemCost

      if (variant && product) {
        const prodKey = `${product.id}-${variant.id}`
        const currentProd = productsMap.get(prodKey) ?? {
          product_id: product.id,
          product_name: product.name,
          variant_name: variant.name,
          category_name: product.categories?.name ?? null,
          quantity_sold: 0,
          revenue: 0,
          cost: 0,
          current_stock: typeof variant.stock_quantity === 'number' ? variant.stock_quantity : undefined,
          low_stock_threshold: typeof variant.low_stock_threshold === 'number' ? variant.low_stock_threshold : 5,
        }
        currentProd.quantity_sold += qty
        currentProd.revenue += itemRevenue
        currentProd.cost += itemCost
        productsMap.set(prodKey, currentProd)
      }
    }

    dCurrent.total_cost += saleCost
    dailyMap.set(day, dCurrent)
    totalCost += saleCost
  }

  const grossProfit = totalSales - totalCost
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
  const ordersCount = (sales ?? []).length
  const averageTicket = ordersCount > 0 ? totalSales / ordersCount : 0

  const summary: AnalyticsSummary = {
    total_sales: totalSales,
    total_orders: ordersCount,
    total_cost: totalCost,
    gross_profit: grossProfit,
    profit_margin: Math.round(profitMargin * 100) / 100,
    average_ticket: Math.round(averageTicket * 100) / 100,
    cash_sales: cashSales,
    card_sales: cardSales,
    qr_sales: qrSales,
    transfer_sales: transferSales,
  }

  const dailySales: DailySalesMetric[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      total_sales: val.total_sales,
      total_cost: val.total_cost,
      gross_profit: val.total_sales - val.total_cost,
      orders_count: val.orders_count,
    }))

  const topProducts: TopProductMetric[] = Array.from(productsMap.values())
    .map((p) => {
      const profit = p.revenue - p.cost
      const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0
      return {
        ...p,
        gross_profit: profit,
        profit_margin: Math.round(margin * 100) / 100,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50)

  const paymentMethods: PaymentMethodMetric[] = Array.from(paymentMap.entries()).map(
    ([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
    })
  )

  return {
    summary,
    daily_sales: fillMissingDays(dailySales, startDate, endDate),
    top_products: topProducts,
    payment_methods: paymentMethods,
  }
}

/**
 * Consulta y consolida la auditoría de arqueos y turnos cerrados en el período seleccionado
 */
export async function fetchCashAuditAnalytics({
  storeId,
  startDate,
  endDate,
}: {
  storeId: string
  startDate: string
  endDate: string
}): Promise<CashAuditSummary> {
  const { data: registers, error } = await supabase
    .from('cash_registers')
    .select(`
      id,
      opened_at,
      closed_at,
      opening_amount,
      closing_amount,
      opened_by,
      users!cash_registers_opened_by_fkey(full_name)
    `)
    .eq('store_id', storeId)
    .eq('status', 'closed')
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)
    .order('closed_at', { ascending: false })

  if (error) {
    console.error('Error fetching closed cash registers for audit:', error)
    throw error
  }

  if (!registers || registers.length === 0) {
    return {
      totalClosedShifts: 0,
      exactShiftsCount: 0,
      accuracyRate: 100,
      totalSurplus: 0,
      totalDeficit: 0,
      netVariance: 0,
      shifts: [],
      cashiers: [],
    }
  }

  const registerIds = registers.map((r) => r.id)

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      cash_register_id,
      status,
      payment_method,
      total,
      sale_payments (
        payment_method,
        amount
      )
    `)
    .in('cash_register_id', registerIds)
    .in('status', ['completed', 'refunded'])

  if (salesError) {
    console.error('Error fetching sales for cash audit:', salesError)
    throw salesError
  }

  const { data: movements, error: movError } = await supabase
    .from('cash_movements')
    .select('cash_register_id, type, amount')
    .in('cash_register_id', registerIds)

  if (movError) {
    console.error('Error fetching movements for cash audit:', movError)
    throw movError
  }

  const cashSalesMap = new Map<string, number>()
  for (const s of sales ?? []) {
    const payments = s.sale_payments ?? []
    let cashForSale = 0
    if (payments.length > 0) {
      for (const p of payments) {
        if (p.payment_method === 'cash') {
          cashForSale += Number(p.amount) || 0
        }
      }
    } else if (s.payment_method === 'cash') {
      cashForSale = Number(s.total) || 0
    }
    const current = cashSalesMap.get(s.cash_register_id) ?? 0
    cashSalesMap.set(s.cash_register_id, current + cashForSale)
  }

  const cashInMap = new Map<string, number>()
  const cashOutMap = new Map<string, number>()
  for (const m of movements ?? []) {
    const amount = Number(m.amount) || 0
    if (m.type === 'in') {
      const cur = cashInMap.get(m.cash_register_id) ?? 0
      cashInMap.set(m.cash_register_id, cur + amount)
    } else if (m.type === 'out') {
      const cur = cashOutMap.get(m.cash_register_id) ?? 0
      cashOutMap.set(m.cash_register_id, cur + amount)
    }
  }

  let totalSurplus = 0
  let totalDeficit = 0
  let exactShiftsCount = 0

  const shifts: CashAuditShiftItem[] = []
  const cashierMap = new Map<string, {
    userId: string
    cashierName: string
    totalShifts: number
    exactShifts: number
    surplusAmount: number
    deficitAmount: number
    netDifference: number
  }>()

  for (const reg of registers) {
    const openingAmount = Number(reg.opening_amount) || 0
    const actualClosing = reg.closing_amount !== null && reg.closing_amount !== undefined ? Number(reg.closing_amount) : 0
    const cashSales = cashSalesMap.get(reg.id) ?? 0
    const cashIn = cashInMap.get(reg.id) ?? 0
    const cashOut = cashOutMap.get(reg.id) ?? 0

    const expectedCash = openingAmount + cashSales + cashIn - cashOut
    const difference = actualClosing - expectedCash
    const isExact = Math.abs(difference) < 0.01
    const isSurplus = difference >= 0.01
    const isDeficit = difference <= -0.01

    if (isExact) {
      exactShiftsCount++
    } else if (isSurplus) {
      totalSurplus += difference
    } else if (isDeficit) {
      totalDeficit += Math.abs(difference)
    }

    const cashierName = reg.users?.full_name || 'Cajero'
    const openedByUserId = reg.opened_by

    shifts.push({
      id: reg.id,
      openedAt: reg.opened_at,
      closedAt: reg.closed_at,
      openedByUserId,
      cashierName,
      openingAmount,
      cashSales,
      cashIn,
      cashOut,
      expectedCash,
      actualClosing,
      difference,
      isExact,
      isSurplus,
      isDeficit,
      notes: null,
    })

    const cData = cashierMap.get(openedByUserId) ?? {
      userId: openedByUserId,
      cashierName,
      totalShifts: 0,
      exactShifts: 0,
      surplusAmount: 0,
      deficitAmount: 0,
      netDifference: 0,
    }
    cData.totalShifts++
    if (isExact) cData.exactShifts++
    if (isSurplus) cData.surplusAmount += difference
    if (isDeficit) cData.deficitAmount += Math.abs(difference)
    cData.netDifference += difference
    cashierMap.set(openedByUserId, cData)
  }

  const totalClosedShifts = shifts.length
  const accuracyRate = totalClosedShifts > 0 ? (exactShiftsCount / totalClosedShifts) * 100 : 100
  const netVariance = totalSurplus - totalDeficit

  const cashiers: CashierAuditMetric[] = Array.from(cashierMap.values()).map((c) => ({
    ...c,
    accuracyRate: c.totalShifts > 0 ? (c.exactShifts / c.totalShifts) * 100 : 100,
  }))

  return {
    totalClosedShifts,
    exactShiftsCount,
    accuracyRate: Math.round(accuracyRate * 10) / 10,
    totalSurplus: Math.round(totalSurplus * 100) / 100,
    totalDeficit: Math.round(totalDeficit * 100) / 100,
    netVariance: Math.round(netVariance * 100) / 100,
    shifts,
    cashiers,
  }
}
