export type BusinessType = 'tienda_articulos' | 'restaurante' | 'supermercado'

export interface BusinessTypeConfig {
  code: BusinessType
  name: string
  description: string
  isAvailable: boolean
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  tienda_articulos: {
    code: 'tienda_articulos',
    name: 'Tienda de artículos',
    description: 'Comercio general y mostrador (ferreterías, farmacias, papelerías, boutiques).',
    isAvailable: true,
  },
  restaurante: {
    code: 'restaurante',
    name: 'Restaurante',
    description: 'Atención con mesas, comandas, cocina e insumos.',
    isAvailable: false,
  },
  supermercado: {
    code: 'supermercado',
    name: 'Supermercado',
    description: 'Alto volumen de productos, balanzas y escaneo masivo.',
    isAvailable: false,
  },
}

export type RetailSubType =
  | 'comercio_general'
  | 'minimarket_abarrotes'
  | 'ropa_calzado'
  | 'ferreteria_construccion'
  | 'farmacia_belleza'
  | 'libreria_papeleria'
  | 'tecnologia_celulares'

export interface RetailSubrubroConfig {
  code: RetailSubType
  name: string
  shortName: string
  description: string
  icon: string
  allowedUnits: string[]
  allowDecimals: boolean
  quickCashButtons: number[]
  autoFocusBarcode: boolean
  hasSerialCapture: boolean
  hasQuickServices: boolean
  hasSizeMatrix: boolean
  defaultTicketPolicy: string
}

export const RETAIL_SUBTYPES: Record<RetailSubType, RetailSubrubroConfig> = {
  comercio_general: {
    code: 'comercio_general',
    name: 'Comercio General / Estándar',
    shortName: 'Comercio General',
    description: 'Venta de mostrador y retail estándar sin preajustes forzados.',
    icon: 'Tag',
    allowedUnits: ['u', 'paq', 'caja'],
    allowDecimals: false,
    quickCashButtons: [10, 20, 50, 100, 200],
    autoFocusBarcode: false,
    hasSerialCapture: false,
    hasQuickServices: false,
    hasSizeMatrix: false,
    defaultTicketPolicy: '¡Gracias por su compra! Vuelva pronto.',
  },
  minimarket_abarrotes: {
    code: 'minimarket_abarrotes',
    name: 'Minimarket, Abarrotes y Licorería',
    shortName: 'Minimarket y Bodega',
    description: 'Tiendas de barrio, bodegas, autoservicios y distribuidoras de bebidas.',
    icon: 'ShoppingCart',
    allowedUnits: ['u', 'kg', 'L', 'paq', 'caja'],
    allowDecimals: true,
    quickCashButtons: [10, 20, 50, 100, 200],
    autoFocusBarcode: true,
    hasSerialCapture: false,
    hasQuickServices: false,
    hasSizeMatrix: false,
    defaultTicketPolicy: 'Verifique su cambio y mercadería antes de retirarse.',
  },
  ropa_calzado: {
    code: 'ropa_calzado',
    name: 'Tienda de Ropa, Calzado y Moda',
    shortName: 'Ropa, Calzado y Moda',
    description: 'Boutiques, zapaterías, indumentaria, carteras y accesorios.',
    icon: 'Shirt',
    allowedUnits: ['u', 'par', 'set'],
    allowDecimals: false,
    quickCashButtons: [20, 50, 100, 200],
    autoFocusBarcode: false,
    hasSerialCapture: false,
    hasQuickServices: false,
    hasSizeMatrix: true,
    defaultTicketPolicy:
      'Plazo para cambios: 15 días con este comprobante y la prenda con etiqueta original intacta. No se realizan devoluciones de dinero.',
  },
  ferreteria_construccion: {
    code: 'ferreteria_construccion',
    name: 'Ferretería, Pinturería y Materiales',
    shortName: 'Ferretería y Materiales',
    description: 'Ferreterías, repuestos, corralones, electricidad y pinturas.',
    icon: 'Wrench',
    allowedUnits: ['u', 'm', 'cm', 'kg', 'g', 'L', 'gal', 'bolsa', 'paq'],
    allowDecimals: true,
    quickCashButtons: [10, 20, 50, 100, 200],
    autoFocusBarcode: false,
    hasSerialCapture: false,
    hasQuickServices: false,
    hasSizeMatrix: false,
    defaultTicketPolicy:
      'Revisar el material al momento de la entrega. Cambios dentro de las 48 horas con este comprobante.',
  },
  farmacia_belleza: {
    code: 'farmacia_belleza',
    name: 'Farmacia, Cosmética y Cuidado Personal',
    shortName: 'Farmacia y Belleza',
    description: 'Boticas, perfumerías, suplementos y productos cosméticos.',
    icon: 'HeartPulse',
    allowedUnits: ['u', 'caja', 'blíster', 'frasco', 'tubo', 'sobre'],
    allowDecimals: false,
    quickCashButtons: [10, 20, 50, 100, 200],
    autoFocusBarcode: true,
    hasSerialCapture: false,
    hasQuickServices: false,
    hasSizeMatrix: false,
    defaultTicketPolicy:
      'Verifique su medicación antes de retirarse. Los medicamentos no admiten cambios ni devoluciones por normativas de salud.',
  },
  libreria_papeleria: {
    code: 'libreria_papeleria',
    name: 'Librería, Papelería y Bazar',
    shortName: 'Librería y Bazar',
    description: 'Papelerías, artículos escolares/oficina, copisterías y regalos.',
    icon: 'BookOpen',
    allowedUnits: ['u', 'hoja', 'resma', 'paq', 'docena', 'set'],
    allowDecimals: false,
    quickCashButtons: [5, 10, 20, 50, 100],
    autoFocusBarcode: false,
    hasSerialCapture: false,
    hasQuickServices: true,
    hasSizeMatrix: false,
    defaultTicketPolicy: '¡Gracias por su compra! Textos y fotocopias no tienen cambio.',
  },
  tecnologia_celulares: {
    code: 'tecnologia_celulares',
    name: 'Tecnología, Celulares y Accesorios',
    shortName: 'Tecnología y Celulares',
    description: 'Smartphones, accesorios, periféricos, audio y servicio técnico.',
    icon: 'Smartphone',
    allowedUnits: ['u', 'kit', 'par', 'set'],
    allowDecimals: false,
    quickCashButtons: [20, 50, 100, 200],
    autoFocusBarcode: false,
    hasSerialCapture: true,
    hasQuickServices: false,
    hasSizeMatrix: false,
    defaultTicketPolicy:
      'Garantía del equipo: 3 meses por desperfectos de fábrica presentando este comprobante original. No cubre golpes ni humedad.',
  },
}

export function getRetailSubrubroConfig(subType?: string | null): RetailSubrubroConfig {
  if (subType && subType in RETAIL_SUBTYPES) {
    return RETAIL_SUBTYPES[subType as RetailSubType]
  }
  return RETAIL_SUBTYPES.comercio_general
}


export type ModuleId =
  | 'dashboard'
  | 'inventory'
  | 'pos'
  | 'customers'
  | 'analytics'
  | 'staff'
  | 'tables'
  | 'kitchen'
  | 'recipes'
  | 'scales'
  | 'settings'

export interface ModuleDefinition {
  id: ModuleId
  name: string
  path: string
  description?: string
  requiredFeature?: string
}

export const ALL_MODULES: Record<ModuleId, ModuleDefinition> = {
  dashboard: {
    id: 'dashboard',
    name: 'Inicio',
    path: '/',
    description: 'Resumen operativo y métricas principales.',
  },
  pos: {
    id: 'pos',
    name: 'Punto de venta',
    path: '/pos',
    description: 'Ventas en mostrador, emisión de tickets y cobros.',
  },
  inventory: {
    id: 'inventory',
    name: 'Inventario',
    path: '/inventario',
    description: 'Gestión de categorías, productos y existencias.',
  },
  customers: {
    id: 'customers',
    name: 'Clientes',
    path: '/customers',
    description: 'Directorio de clientes y registro de compras.',
  },
  analytics: {
    id: 'analytics',
    name: 'Reportes',
    path: '/analytics',
    description: 'Ventas por período, productos más vendidos y margen de ganancia real.',
    requiredFeature: 'advanced_analytics',
  },
  staff: {
    id: 'staff',
    name: 'Personal',
    path: '/staff',
    description: 'Gestión de equipo de trabajo, roles y catálogo de permisos.',
  },
  tables: {
    id: 'tables',
    name: 'Mesas y comandas',
    path: '/tables',
    description: 'Control de mesas activas y órdenes de salón.',
  },
  kitchen: {
    id: 'kitchen',
    name: 'Cocina (KDS)',
    path: '/kitchen',
    description: 'Pantalla de preparación y despacho de pedidos.',
  },
  recipes: {
    id: 'recipes',
    name: 'Recetas e insumos',
    path: '/recipes',
    description: 'Control de insumos y descuento fraccionado por preparación.',
  },
  scales: {
    id: 'scales',
    name: 'Balanzas',
    path: '/scales',
    description: 'Integración con balanzas electrónicas de mostrador.',
  },
  settings: {
    id: 'settings',
    name: 'Ajustes',
    path: '/configuracion',
    description: 'Configuración de la tienda, tickets, moneda, zona horaria y políticas.',
  },
}

export const BUSINESS_MODULES: Record<BusinessType, ModuleId[]> = {
  tienda_articulos: ['dashboard', 'pos', 'inventory', 'customers', 'analytics', 'staff', 'settings'],
  restaurante: ['dashboard', 'pos', 'tables', 'kitchen', 'inventory', 'recipes', 'customers', 'analytics', 'staff', 'settings'],
  supermercado: ['dashboard', 'pos', 'inventory', 'customers', 'scales', 'analytics', 'staff', 'settings'],
}

/**
 * Retorna la lista de módulos habilitados para un rubro específico.
 */
export function getModulesForBusinessType(businessType: BusinessType): ModuleDefinition[] {
  const moduleIds = BUSINESS_MODULES[businessType] ?? BUSINESS_MODULES.tienda_articulos
  return moduleIds.map((id) => ALL_MODULES[id])
}

/**
 * Valida si un módulo específico está permitido para un rubro dado.
 */
export function isModuleAllowedForBusinessType(
  businessType: BusinessType,
  moduleId: ModuleId
): boolean {
  const moduleIds = BUSINESS_MODULES[businessType] ?? BUSINESS_MODULES.tienda_articulos
  return moduleIds.includes(moduleId)
}

/**
 * Verifica si un módulo está accesible evaluando rubro y funciones del plan.
 */
export function isModuleAccessible({
  businessType,
  moduleId,
  effectiveFeatures,
}: {
  businessType: BusinessType
  moduleId: ModuleId
  effectiveFeatures?: Record<string, boolean>
}): boolean {
  if (!isModuleAllowedForBusinessType(businessType, moduleId)) {
    return false
  }

  const moduleDef = ALL_MODULES[moduleId]
  if (moduleDef?.requiredFeature && effectiveFeatures) {
    return effectiveFeatures[moduleDef.requiredFeature] === true
  }

  return true
}
