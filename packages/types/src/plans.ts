import type { BusinessType, RetailSubType } from './business'

export type PlanCode = 'standard' | 'pro' | 'enterprise'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'

export type BillingCycle = 'monthly' | 'semiannual' | 'annual'

export interface FeatureDefinition {
  key: string
  name: string
  description: string
  category: 'pos' | 'inventario' | 'reportes' | 'general'
  defaultValueByPlan: Record<PlanCode, boolean>
}

export interface PlanLimits {
  max_cash_registers: number
  max_users: number
}

export const PLAN_DEFAULT_LIMITS: Record<PlanCode, PlanLimits> = {
  standard: {
    max_cash_registers: 1,
    max_users: 2,
  },
  pro: {
    max_cash_registers: 3,
    max_users: 6,
  },
  enterprise: {
    max_cash_registers: 999,
    max_users: 999,
  },
}

export const SYSTEM_FEATURES: FeatureDefinition[] = [
  {
    key: 'multiple_cash_registers',
    name: 'Múltiples cajas registradoras',
    description: 'Permite abrir y operar varios turnos de caja en simultáneo por diferentes cajeros.',
    category: 'pos',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'split_payments',
    name: 'Pagos divididos (Split Payment)',
    description: 'Permite combinar múltiples métodos de pago (Efectivo + QR + Tarjeta) en una sola venta.',
    category: 'pos',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'custom_receipts',
    name: 'Personalización de comprobantes',
    description: 'Modificación de encabezados, logos, NIT y políticas comerciales en los tickets de compra.',
    category: 'pos',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'purchase_orders',
    name: 'Proveedores y órdenes de compra',
    description: 'Gestión formal de cartera de proveedores, cotizaciones y recepción masiva de mercadería.',
    category: 'inventario',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'barcode_labels',
    name: 'Impresión de etiquetas con código de barras',
    description: 'Generación e impresión de etiquetas con código de barras y precios para etiquetado físico.',
    category: 'inventario',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'batch_expiry_control',
    name: 'Control de lotes y fechas de vencimiento',
    description: 'Seguimiento de números de lote y alertas tempranas de caducidad en el catálogo.',
    category: 'inventario',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'physical_count',
    name: 'Conteo físico y auditoría general',
    description: 'Módulo de auditoría general y reconciliación masiva de stock físico vs registrado.',
    category: 'inventario',
    defaultValueByPlan: { standard: false, pro: false, enterprise: true },
  },
  {
    key: 'batch_price_adjust',
    name: 'Ajuste masivo de precios',
    description: 'Actualización en bloque de precios de venta o costos por categoría o porcentaje.',
    category: 'inventario',
    defaultValueByPlan: { standard: false, pro: false, enterprise: true },
  },
  {
    key: 'advanced_analytics',
    name: 'Reportes y márgenes de ganancia',
    description: 'Acceso a analítica financiera de ventas, márgenes brutos calculados y productos más vendidos.',
    category: 'reportes',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
  {
    key: 'mobile_app',
    name: 'Acceso a aplicación móvil',
    description: 'Habilita el inicio de sesión del personal en dispositivos móviles (smartphone / tablet).',
    category: 'general',
    defaultValueByPlan: { standard: false, pro: true, enterprise: true },
  },
]

export interface SubscriptionPayment {
  id: string
  store_id: string
  amount: number
  payment_method: 'transfer' | 'qr' | 'cash'
  reference: string | null
  period_start: string
  period_end: string
  paid_at: string
  recorded_by: string | null
  notes: string | null
  created_at: string
}

export interface AdminStoreItem {
  id: string
  name: string
  owner_id: string
  owner_name: string | null
  owner_email: string | null
  business_type: BusinessType
  industry_sub_type?: RetailSubType | string
  plan_id: string | null
  plan_code: PlanCode | null
  plan_name: string | null
  plan_features: Record<string, any>
  subscription_status: SubscriptionStatus
  billing_cycle: BillingCycle | null
  trial_ends_at: string
  subscription_ends_at?: string | null
  grace_period_days?: number
  created_at: string
  feature_overrides: Record<string, any>
  products_count?: number
  sales_count?: number
  total_revenue?: number
  last_sale_at?: string | null
  open_registers_count?: number
  active_users_count?: number
  customers_count?: number
}

export function getEffectiveFeatures(
  planFeatures: Record<string, any> = {},
  featureOverrides: Record<string, any> = {}
): Record<string, any> {
  return { ...planFeatures, ...featureOverrides }
}
