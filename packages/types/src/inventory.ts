export type ProductUnit =
  | 'unit'
  | 'kg'
  | 'g'
  | 'l'
  | 'ml'
  | 'm'
  | 'cm'
  | 'par'
  | 'paq'
  | 'caja'
  | 'set'
  | 'gal'
  | 'bolsa'
  | 'hoja'
  | 'resma'

export const PRODUCT_UNITS: { value: ProductUnit; label: string; symbol: string }[] = [
  { value: 'unit', label: 'Unidad (u)', symbol: 'u' },
  { value: 'par', label: 'Par (par)', symbol: 'par' },
  { value: 'kg', label: 'Kilogramo (kg)', symbol: 'kg' },
  { value: 'g', label: 'Gramo (g)', symbol: 'g' },
  { value: 'l', label: 'Litro (L)', symbol: 'L' },
  { value: 'ml', label: 'Mililitro (ml)', symbol: 'ml' },
  { value: 'm', label: 'Metro (m)', symbol: 'm' },
  { value: 'cm', label: 'Centímetro (cm)', symbol: 'cm' },
  { value: 'paq', label: 'Paquete (paq)', symbol: 'paq' },
  { value: 'caja', label: 'Caja (caja)', symbol: 'caja' },
  { value: 'set', label: 'Set / Kit', symbol: 'set' },
  { value: 'gal', label: 'Galón (gal)', symbol: 'gal' },
  { value: 'bolsa', label: 'Bolsa (bolsa)', symbol: 'bolsa' },
  { value: 'hoja', label: 'Hoja (hoja)', symbol: 'hoja' },
  { value: 'resma', label: 'Resma (resma)', symbol: 'resma' },
]

export type StockMovementType =
  | 'sale'
  | 'manual_adjustment'
  | 'waste'
  | 'supplier_return'
  | 'physical_count'
  | 'purchase_order'

export const STOCK_MOVEMENT_TYPES: Record<
  StockMovementType,
  { label: string; badgeColor: string; isPositiveDefault: boolean }
> = {
  sale: {
    label: 'Venta',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    isPositiveDefault: false,
  },
  manual_adjustment: {
    label: 'Ajuste manual',
    badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    isPositiveDefault: true,
  },
  waste: {
    label: 'Merma / Pérdida',
    badgeColor: 'bg-red-500/10 text-red-400 border border-red-500/20',
    isPositiveDefault: false,
  },
  supplier_return: {
    label: 'Devolución proveedor',
    badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    isPositiveDefault: false,
  },
  physical_count: {
    label: 'Conteo físico',
    badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    isPositiveDefault: true,
  },
  purchase_order: {
    label: 'Orden de compra',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    isPositiveDefault: true,
  },
}

export interface Supplier {
  id: string
  store_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export interface StockMovement {
  id: string
  store_id: string
  variant_id: string
  type: StockMovementType
  quantity_change: number
  previous_stock: number
  new_stock: number
  reason: string | null
  performed_by: string | null
  created_at: string
  product_variants?: {
    id: string
    name: string
    barcode: string | null
    unit: ProductUnit
    stock_quantity?: number
    products?: {
      id: string
      name: string
    }
  } | null
  users?: {
    id?: string
    full_name: string | null
    email: string | null
    role?: string | null
  } | null
}

export type PurchaseOrderStatus = 'draft' | 'pending' | 'received' | 'cancelled'

export const PURCHASE_ORDER_STATUS_MAP: Record<
  PurchaseOrderStatus,
  { label: string; badgeColor: string }
> = {
  draft: {
    label: 'Borrador',
    badgeColor: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  },
  pending: {
    label: 'Pendiente',
    badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  received: {
    label: 'Recibida',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  cancelled: {
    label: 'Cancelada',
    badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  },
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  variant_id: string
  quantity: number
  cost_price: number
  subtotal: number
  product_variants?: {
    id: string
    name: string
    barcode: string | null
    unit: ProductUnit
    products?: {
      name: string
    }
  }
}

export interface PurchaseOrder {
  id: string
  store_id: string
  supplier_id: string
  order_number: string
  status: PurchaseOrderStatus
  total_cost: number
  notes: string | null
  ordered_at: string | null
  received_at: string | null
  created_by: string | null
  created_at: string
  suppliers?: Supplier
  purchase_order_items?: PurchaseOrderItem[]
}
