import { supabase } from '../../../shared/lib/supabaseClient'
import type {
  CashRegisterReport,
  PaymentMethod,
  PaymentSplitItem,
  SaleDetailed,
  SaleStatus,
} from '@lumen-pos/types'

export async function getOpenCashRegister(
  storeId: string,
  userId?: string,
  allowsMultipleRegisters: boolean = false
) {
  let query = supabase
    .from('cash_registers')
    .select('*, users!cash_registers_opened_by_fkey(full_name)')
    .eq('store_id', storeId)
    .eq('status', 'open')

  if (allowsMultipleRegisters && userId) {
    query = query.eq('opened_by', userId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function openCashRegister(params: {
  storeId: string
  userId: string
  openingAmount: number
  allowsMultipleRegisters?: boolean
}) {
  if (!params.allowsMultipleRegisters) {
    const { data: openNotices, error: noticeError } = await supabase.rpc('get_open_register_notice')
    if (noticeError) throw noticeError
    const existingOpen = openNotices?.[0]

    if (existingOpen) {
      const openedByName = existingOpen.opened_by_name ?? 'otro usuario'
      throw new Error(
        `El plan Standard solo permite una caja abierta a la vez. Actualmente hay una caja abierta por ${openedByName}.`
      )
    }
  } else {
    const { data: userOpen } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('store_id', params.storeId)
      .eq('opened_by', params.userId)
      .eq('status', 'open')
      .maybeSingle()

    if (userOpen) {
      throw new Error('Ya tienes un turno de caja abierto.')
    }
  }

  const { data, error } = await supabase
    .from('cash_registers')
    .insert({
      store_id: params.storeId,
      opened_by: params.userId,
      opening_amount: params.openingAmount,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function closeCashRegister(params: { id: string; closingAmount: number }) {
  const { data, error } = await supabase
    .from('cash_registers')
    .update({
      closing_amount: params.closingAmount,
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addCashMovement(params: {
  cashRegisterId: string
  storeId: string
  userId: string
  type: 'in' | 'out'
  amount: number
  reason: string
}) {
  const cleanReason = params.reason?.trim()
  if (!cleanReason) {
    throw new Error('El motivo del movimiento de efectivo es obligatorio.')
  }
  if (params.amount <= 0) {
    throw new Error('El monto ingresado debe ser mayor a cero.')
  }

  const { data, error } = await supabase
    .from('cash_movements')
    .insert({
      cash_register_id: params.cashRegisterId,
      store_id: params.storeId,
      performed_by: params.userId,
      type: params.type,
      amount: params.amount,
      reason: cleanReason,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getCashMovements(cashRegisterId: string) {
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*, users!cash_movements_performed_by_fkey(full_name)')
    .eq('cash_register_id', cashRegisterId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getCashRegisterReport(cashRegisterId: string): Promise<CashRegisterReport> {
  const { data: register, error: regError } = await supabase
    .from('cash_registers')
    .select('*, users!cash_registers_opened_by_fkey(full_name)')
    .eq('id', cashRegisterId)
    .single()

  if (regError || !register) {
    throw new Error('No se pudo encontrar la caja especificada.')
  }

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      payment_method,
      total,
      status,
      sale_payments (
        payment_method,
        amount
      )
    `)
    .eq('cash_register_id', cashRegisterId)

  if (salesError) throw salesError

  const { data: movements, error: movError } = await supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('cash_register_id', cashRegisterId)

  if (movError) throw movError

  let cashSalesTotal = 0
  let cashSalesCount = 0
  let cardSalesTotal = 0
  let cardSalesCount = 0
  let qrSalesTotal = 0
  let qrSalesCount = 0
  let transferSalesTotal = 0
  let transferSalesCount = 0
  let refundedSalesTotal = 0
  let refundedSalesCount = 0

  for (const s of sales ?? []) {
    // Arqueo records gross receipts. Refund cash is recorded once in movements.
    if (s.status === 'cancelled') continue
    const total = Number(s.total) || 0

    if (s.status === 'refunded') {
      refundedSalesTotal += total
      refundedSalesCount++
    }

    const payments = s.sale_payments ?? []
    if (payments.length > 0) {
      for (const p of payments) {
        const pAmount = Number(p.amount) || 0
        if (p.payment_method === 'cash') {
          cashSalesTotal += pAmount
          cashSalesCount++
        } else if (p.payment_method === 'card') {
          cardSalesTotal += pAmount
          cardSalesCount++
        } else if (p.payment_method === 'qr') {
          qrSalesTotal += pAmount
          qrSalesCount++
        } else if (p.payment_method === 'transfer') {
          transferSalesTotal += pAmount
          transferSalesCount++
        }
      }
    } else {
      if (s.payment_method === 'cash') {
        cashSalesTotal += total
        cashSalesCount++
      } else if (s.payment_method === 'card') {
        cardSalesTotal += total
        cardSalesCount++
      } else if (s.payment_method === 'qr') {
        qrSalesTotal += total
        qrSalesCount++
      } else if (s.payment_method === 'transfer') {
        transferSalesTotal += total
        transferSalesCount++
      }
    }
  }

  let cashInTotal = 0
  let cashInCount = 0
  let cashOutTotal = 0
  let cashOutCount = 0

  for (const m of movements ?? []) {
    const amount = Number(m.amount) || 0
    if (m.type === 'in') {
      cashInTotal += amount
      cashInCount++
    } else if (m.type === 'out') {
      cashOutTotal += amount
      cashOutCount++
    }
  }

  const openingAmount = Number(register.opening_amount) || 0
  const expectedCashAmount = openingAmount + cashSalesTotal + cashInTotal - cashOutTotal
  const actualClosingAmount =
    register.closing_amount !== null && register.closing_amount !== undefined
      ? Number(register.closing_amount)
      : null
  const difference =
    actualClosingAmount !== null ? actualClosingAmount - expectedCashAmount : null

  return {
    registerId: register.id,
    openedAt: register.opened_at,
    closedAt: register.closed_at,
    openedByUserId: register.opened_by,
    openedByName: register.users?.full_name ?? undefined,
    openingAmount,
    cashSalesTotal,
    cashSalesCount,
    cardSalesTotal,
    cardSalesCount,
    qrSalesTotal,
    qrSalesCount,
    transferSalesTotal,
    transferSalesCount,
    refundedSalesTotal,
    refundedSalesCount,
    totalSalesAmount: cashSalesTotal + cardSalesTotal + qrSalesTotal + transferSalesTotal,
    totalSalesCount: (sales ?? []).filter((s) => s.status !== 'cancelled').length,
    cashInTotal,
    cashInCount,
    cashOutTotal,
    cashOutCount,
    expectedCashAmount,
    actualClosingAmount,
    difference,
  }
}

export type SaleItemInput = {
  product_variant_id: string
  quantity: number
  unit_price?: number
  discount?: number
}

export async function createSale(params: {
  cashRegisterId: string
  idempotencyKey?: string
  createdAt?: string
  userId?: string
  paymentMethod: PaymentMethod
  items: SaleItemInput[]
  customerId?: string | null
  discount?: number
  payments?: PaymentSplitItem[]
  customerEmail?: string | null
}) {
  if (params.userId) {
    const { data: identity, error: identityError } = await supabase.auth.getUser()
    if (identityError || identity.user?.id !== params.userId) {
      throw Object.assign(new Error('Esta venta pendiente pertenece a otro usuario. Inicie sesión con el cajero original.'), { code: 'LUMEN_USER_MISMATCH' })
    }
  }
  const { data, error } = await supabase.rpc('create_sale', {
    p_cash_register_id: params.cashRegisterId,
    p_idempotency_key: params.idempotencyKey,
    p_created_at: params.createdAt,
    p_payment_method: params.paymentMethod,
    p_items: params.items,
    p_customer_id: params.customerId ? params.customerId : undefined,
    p_discount: params.discount ?? 0,
    p_payments: params.payments && params.payments.length > 0 ? params.payments.map(payment => ({ payment_method: payment.payment_method, amount: payment.amount })) : undefined,
    p_customer_email: params.customerEmail ? params.customerEmail.trim() : undefined,
  })
  if (error) throw error
  return data as string
}

export async function getSales(
  storeId: string,
  options?: { limit?: number; status?: SaleStatus }
): Promise<SaleDetailed[]> {
  let query = supabase
    .from('sales')
    .select(
      `
      *,
      customers (id, full_name, phone, email),
      users!sales_sold_by_fkey (id, full_name, email),
      cash_registers (id, status, opened_at, closed_at),
      refunded_by_user:users!sales_refunded_by_fkey (id, full_name),
      sale_items (
        id,
        quantity,
        unit_price,
        discount,
        subtotal,
        cost_price,
        product_variants (
          id,
          name,
          barcode,
          unit,
          image_url,
          products (id, name)
        )
      ),
      sale_payments (
        id,
        payment_method,
        amount
      )
    `
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as unknown as SaleDetailed[]) ?? []
}

export async function getActiveCashRegisters(storeId: string) {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('id, opened_at, opening_amount, status, opened_by, users!cash_registers_opened_by_fkey(full_name)')
    .eq('store_id', storeId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function refundSale(params: {
  saleId: string
  reason?: string
  disburseCashRegisterId?: string | null
}) {
  const { data, error } = await supabase.rpc('refund_sale', {
    p_sale_id: params.saleId,
    p_reason: params.reason ?? undefined,
    p_disburse_cash_register_id: params.disburseCashRegisterId ?? undefined,
  })
  if (error) throw error
  return data
}

export async function sendDigitalReceipt(params: {
  toEmail: string
  saleId: string
  lines: { productName?: string; variantName?: string; unitPrice?: number; quantity: number; discount?: number }[]
  total: number
  subtotal?: number
  discount?: number
  paymentMethod: string
  payments?: PaymentSplitItem[]
  storeName?: string
}) {
  const cleanEmail = params.toEmail.trim()
  if (!cleanEmail) throw new Error('El correo electrónico es obligatorio')

  try {
    const emailBody = `
Comprobante de Compra - ${params.storeName || 'Lumen POS'}
---------------------------------------------------------
Venta: #${params.saleId}
Fecha: ${new Date().toLocaleString()}
Método de pago: ${params.paymentMethod}

Artículos:
${params.lines
  .map((l) => {
    const name = l.productName || 'Producto'
    const varName = l.variantName && l.variantName !== 'Único' ? ` (${l.variantName})` : ''
    const price = Number(l.unitPrice || 0).toFixed(2)
    const qty = l.quantity
    const disc = Number(l.discount || 0)
    const sub = (Number(price) * Number(qty) - disc).toFixed(2)
    return `- ${name}${varName}: ${qty} x Bs ${price}${disc > 0 ? ` (Desc: -Bs ${disc.toFixed(2)})` : ''} = Bs ${sub}`
  })
  .join('\n')}

Subtotal: Bs ${(params.subtotal ?? params.total).toFixed(2)}
Descuento: Bs ${(params.discount ?? 0).toFixed(2)}
TOTAL: Bs ${params.total.toFixed(2)}
---------------------------------------------------------
¡Gracias por su preferencia!
    `.trim()

    await fetch('http://127.0.0.1:54324/api/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Email: 'facturacion@lumenpos.com', Name: params.storeName || 'Lumen POS' },
        To: [{ Email: cleanEmail }],
        Subject: `Comprobante de Compra #${params.saleId.slice(0, 8)} - ${params.storeName || 'Lumen POS'}`,
        Text: emailBody,
      }),
    }).catch(() => {
      // Ignorar errores de red local si Mailpit no está escuchando
    })
  } catch {
    // Graceful fallback
  }

  return { success: true, toEmail: cleanEmail }
}
