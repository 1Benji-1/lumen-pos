import { readFile } from 'node:fs/promises'

// This is a schema/relationship smoke test, not a substitute for authenticated
// tenant and role tests. The public key is read locally and never printed.
let values = {}
try {
  const source = await readFile(new URL('../apps/web/.env.local', import.meta.url), 'utf8')
  values = Object.fromEntries(source.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(VITE_SUPABASE_(?:URL|ANON_KEY))\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
} catch { /* Environment variables may supply both values in CI/staging. */ }
const url = process.env.VITE_SUPABASE_URL || values.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || values.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY públicas.')

const queries = {
  plans: 'id,code,features',
  products: '*,product_variants(*,suppliers(name)),categories(name)',
  sales: '*,customers(id,full_name),users!sales_sold_by_fkey(id,full_name),cash_registers(id,status),sale_items(*,product_variants(id,name,products(id,name))),sale_payments(*)',
  purchase_orders: '*,suppliers(id,name),purchase_order_items(*,product_variants(id,name,products(id,name)))',
  stock_movements: '*,product_variants(id,name,products(id,name)),users!stock_movements_performed_by_fkey(id,full_name)',
  stores: 'id,name,plans(code,name,features),users(id,role)',
}
let failed = false
for (const [table, select] of Object.entries(queries)) {
  const target = new URL(`${url.replace(/\/$/, '')}/rest/v1/${table}`)
  target.search = new URLSearchParams({ select, limit: '1' }).toString()
  const response = await fetch(target, { headers: { apikey: key }, signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    failed = true
    const error = await response.json().catch(() => ({}))
    console.error(`${table}: HTTP ${response.status} ${error.code ?? ''} ${error.message ?? 'Respuesta inválida'}`)
  } else console.log(`${table}: relación API correcta (HTTP ${response.status})`)
}
if (failed) process.exitCode = 1
