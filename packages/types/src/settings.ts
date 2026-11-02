export interface StoreSettings {
  id: string
  store_id: string
  legal_name: string | null
  commercial_name: string | null
  tax_id: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string
  logo_url: string | null

  // Regionalización
  timezone: string
  currency_symbol: string
  currency_code: string
  decimal_places: number

  // Políticas de POS y Cajas
  allow_negative_stock: boolean
  max_cash_register_hours: number
  default_opening_cash: number
  require_customer_for_sale: boolean

  // Configuración de Tickets
  ticket_header: string | null
  ticket_footer: string
  auto_print_ticket: boolean
  show_tax_details: boolean
  print_logo_on_ticket: boolean
  print_cashier_name: boolean
  ticket_legal_disclaimer: string | null

  // Etiquetas de Códigos de Barras
  barcode_label_size: '50x30' | '40x25'
  barcode_label_show_price: boolean
  barcode_label_show_store_name: boolean

  // Inventario y Alertas
  default_low_stock_threshold: number
  expiry_alert_days: number
  default_product_unit: string
  internal_barcode_prefix: string
  target_profit_margin: number | null
  blind_physical_count: boolean
  purchase_order_prefix: string

  created_at: string
  updated_at: string
}

export type UpdateStoreSettingsInput = Partial<
  Omit<StoreSettings, 'id' | 'store_id' | 'created_at' | 'updated_at'>
>
