import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'

// Only the local development stack is allowed. The status file contains secrets;
// keep it outside the repository and never print it or commit it.
if (!process.argv[2]) throw new Error('Uso: node scripts/smoke-authenticated-local.mjs /ruta/privada/status.json')
const status = JSON.parse(await readFile(process.argv[2], 'utf8'))
assert.equal(status.API_URL, 'http://127.0.0.1:54321', 'Esta prueba solo modifica Supabase local en 127.0.0.1:54321')
assert.ok(status.SERVICE_ROLE_KEY && status.ANON_KEY, 'Faltan claves locales')
const requireFromApp = createRequire(new URL('../apps/web/package.json', import.meta.url))
const requireFromRoot = createRequire(new URL('../package.json', import.meta.url))
const { createClient } = requireFromApp('@supabase/supabase-js')
const ts = requireFromRoot('typescript')
const useEdgeRuntime = process.argv.includes('--edge')
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, clientOptions)
const authIds = new Set()
const storeIds = new Set()
const prefix = `stabilization-${randomUUID()}`
const password = `Test-${randomUUID()}!`
let checks = 0
const ok = (name) => { checks++; console.log(`PASS: ${name}`) }
function data(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.code ?? ''} ${result.error.message}`)
  return result.data
}
async function authUser(label, metadata = {}) {
  const email = `${prefix}-${label}@example.test`
  const result = data(await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: metadata }), 'crear identidad temporal')
  authIds.add(result.user.id)
  return { id: result.user.id, email }
}
async function login(email) {
  const client = createClient(status.API_URL, status.ANON_KEY, clientOptions)
  const session = data(await client.auth.signInWithPassword({ email, password }), 'autenticar identidad temporal').session
  assert.ok(session)
  return { client, token: session.access_token }
}

try {
  const manager = await authUser('superadmin', { is_super_admin: true })
  const { token } = await login(manager.email)
  // --edge exercises the actual local Deno deployment; the default executes
  // the same handler with the real SDK and local GoTrue/SQL without Deno.
  let invoke = fetch
  if (!useEdgeRuntime) {
    const source = await readFile(new URL('../packages/supabase/functions/create-store/handler.ts', import.meta.url), 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
    const { createHandler } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
    const env = (name) => ({ SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY })[name]
    invoke = createHandler(createClient, env)
  }
  const response = await invoke(new Request(`${status.API_URL}/functions/v1/create-store`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${prefix}-owner@example.test`, fullName: 'Propietario temporal', storeName: prefix, planCode: 'pro', subscriptionStatus: 'active', billingCycle: 'monthly', businessType: 'tienda_articulos' }),
  }))
  const provisioned = await response.json()
  if (provisioned.user?.id) authIds.add(provisioned.user.id)
  if (provisioned.store?.id) storeIds.add(provisioned.store.id)
  assert.equal(response.status, 200, `Alta activa: ${provisioned.error ?? 'respuesta inválida'}`)
  assert.ok(new Date(provisioned.store.subscription_ends_at) > new Date())
  ok(`alta activa con vencimiento y perfil mediante ${useEdgeRuntime ? 'Edge Runtime Deno local' : 'handler real'}`)
  data(await admin.auth.admin.updateUserById(provisioned.user.id, { password, email_confirm: true }), 'preparar contraseña temporal')
  const { client: owner } = await login(`${prefix}-owner@example.test`)
  const storeId = provisioned.store.id
  const userId = provisioned.user.id
  const register = data(await owner.from('cash_registers').insert({ store_id: storeId, opened_by: userId, opening_amount: 100 }).select().single(), 'abrir caja')
  ok('apertura autenticada de caja')
  const inventory = data(await owner.rpc('create_product_with_variant', {
    p_product: { name: 'Producto temporal' },
    p_variant: { name: 'Único', sale_price: 10, cost_price: 6, stock_quantity: 5, unit: 'unit' },
  }), 'alta atómica de inventario')
  const initial = data(await owner.from('stock_movements').select('quantity_change,performed_by').eq('variant_id', inventory.variant.id), 'auditoría inicial')
  assert.equal(initial.length, 1)
  assert.equal(Number(initial[0].quantity_change), 5)
  assert.equal(initial[0].performed_by, userId)
  ok('producto, variante y auditoría inicial atómicos')
  const payload = {
    p_cash_register_id: register.id, p_payment_method: 'split', p_items: [{ product_variant_id: inventory.variant.id, quantity: 2, unit_price: 10 }],
    p_discount: 3, p_payments: [{ payment_method: 'cash', amount: 7 }, { payment_method: 'qr', amount: 10 }], p_idempotency_key: randomUUID(), p_created_at: new Date().toISOString(),
  }
  const saleId = data(await owner.rpc('create_sale', payload), 'venta mixta')
  assert.equal(data(await owner.rpc('create_sale', payload), 'reintentar venta'), saleId)
  const sale = data(await owner.from('sales').select('*,sale_items(*),sale_payments(*)').eq('id', saleId).single(), 'detalle venta')
  assert.equal(sale.sold_by, userId)
  assert.equal(Number(sale.total), 17)
  assert.equal(Number(sale.sale_items[0].cost_price), 6)
  assert.equal(sale.sale_payments.length, 2)
  const stock = data(await owner.from('product_variants').select('stock_quantity').eq('id', inventory.variant.id).single(), 'stock después de reintento')
  assert.equal(Number(stock.stock_quantity), 3)
  ok('venta con pagos mixtos, costo histórico e idempotencia')
  data(await owner.rpc('refund_sale', { p_sale_id: saleId }), 'devolución')
  assert.ok((await owner.rpc('refund_sale', { p_sale_id: saleId })).error, 'Segundo reembolso debe fallar')
  const refundedStock = data(await owner.from('product_variants').select('stock_quantity').eq('id', inventory.variant.id).single(), 'stock devuelto')
  assert.equal(Number(refundedStock.stock_quantity), 5)
  const movements = data(await owner.from('cash_movements').select('type,amount').eq('cash_register_id', register.id), 'egresos')
  assert.equal(movements.length, 1)
  assert.equal(movements[0].type, 'out')
  assert.equal(Number(movements[0].amount), 7)
  ok('devolución única, reposición y egreso de efectivo correctos')
  const analytics = data(await owner.rpc('get_store_analytics', { p_start_date: new Date(Date.now() - 3_600_000).toISOString(), p_end_date: new Date(Date.now() + 3_600_000).toISOString() }), 'analítica neta')
  assert.equal(Number(analytics.summary.total_sales), 0)
  assert.equal(Number(analytics.summary.total_orders), 0)
  ok('analítica comercial excluye devolución')
  data(await owner.from('cash_registers').update({ status: 'closed', closing_amount: 100, closed_at: new Date().toISOString() }).eq('id', register.id).select().single(), 'cerrar caja')
  ok('cierre de caja después de venta y devolución')
  const outsider = await authUser('otra-tienda')
  const otherStore = data(await admin.from('stores').insert({ name: `${prefix}-other`, owner_id: outsider.id, plan_id: provisioned.store.plan_id }).select().single(), 'crear segunda tienda temporal')
  storeIds.add(otherStore.id)
  data(await admin.from('users').insert({ id: outsider.id, store_id: otherStore.id, full_name: 'Otra tienda', role: 'owner' }), 'perfil segunda tienda')
  const { client: otherClient } = await login(outsider.email)
  assert.deepEqual(data(await otherClient.from('products').select('id').eq('id', inventory.product.id), 'lectura entre tiendas'), [])
  const forbiddenAdmin = await owner.rpc('get_admin_stores_overview')
  assert.equal(forbiddenAdmin.error?.code, '42501')
  ok('aislamiento real entre tiendas y RPC administrativo protegido')
  const worker = await authUser('cashier')
  data(await admin.from('users').insert({ id: worker.id, store_id: storeId, full_name: 'Cajero temporal', role: 'cashier' }), 'perfil cajero')
  const { client: cashier } = await login(worker.email)
  assert.equal((await cashier.from('users').update({ role: 'owner' }).eq('id', worker.id).select()).error?.code, '42501')
  assert.equal((await cashier.from('stores').update({ feature_overrides: { max_users: 999 } }).eq('id', storeId).select()).error?.code, '42501')
  ok('cajero no puede elevar su rol ni alterar la suscripción')
  console.log(`${checks} comprobaciones autenticadas locales correctas.`)
} finally {
  let cleanupFailed = false
  for (const id of [...storeIds].reverse()) {
    // Financial references intentionally prevent deleting variants/users while
    // sales and drawers still exist. Only remove this run's temporary records,
    // in dependency order, before the store's normal cascades.
    for (const table of ['sales', 'purchase_orders', 'cash_registers']) {
      const { error } = await admin.from(table).delete().eq('store_id', id)
      if (error) { cleanupFailed = true; console.error(`No se pudo retirar ${table} de la tienda temporal:`, id, error.code) }
    }
    const { error } = await admin.from('stores').delete().eq('id', id)
    if (error) { cleanupFailed = true; console.error('No se pudo retirar una tienda temporal:', id, error.code) }
  }
  for (const id of [...authIds].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) { cleanupFailed = true; console.error('No se pudo retirar una identidad temporal:', error.code) }
  }
  if (cleanupFailed) process.exitCode = 1
  else console.log('Datos temporales retirados; datos anteriores conservados.')
}
