import type { BusinessCategoryId } from './commerce'

export type ModuleId =
  | 'dashboard' | 'pos' | 'inventory' | 'customers' | 'analytics' | 'staff' | 'settings'
  | 'cash' | 'orders' | 'purchases' | 'online_commerce' | 'delivery' | 'credit'
  | 'loyalty' | 'multi_branch' | 'integrations' | 'agenda' | 'work_orders'
  | 'kitchen' | 'recipes' | 'tables' | 'scales' | 'quotes'
export type ModuleScope = 'organization' | 'branch'
export type ModuleImplementationStatus = 'available' | 'planned'

export interface ModuleDefinition {
  id: ModuleId
  name: string
  path: string | null
  description?: string
  requiredFeature?: string
  scope: ModuleScope
  implementationStatus: ModuleImplementationStatus
}

const available = (id: ModuleId, name: string, path: string, scope: ModuleScope, description: string, requiredFeature?: string): ModuleDefinition =>
  ({ id, name, path, scope, description, requiredFeature, implementationStatus: 'available' })
const planned = (id: ModuleId, name: string, scope: ModuleScope): ModuleDefinition =>
  ({ id, name, path: null, scope, implementationStatus: 'planned' })

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  dashboard: available('dashboard', 'Inicio', '/', 'organization', 'Resumen operativo y métricas principales.'),
  pos: available('pos', 'Punto de venta', '/pos', 'branch', 'Ventas en mostrador, emisión de tickets y cobros.'),
  inventory: available('inventory', 'Inventario', '/inventario', 'branch', 'Gestión de categorías, productos y existencias.'),
  customers: available('customers', 'Clientes', '/customers', 'organization', 'Directorio de clientes y registro de compras.'),
  analytics: available('analytics', 'Reportes', '/analytics', 'organization', 'Ventas por período, productos más vendidos y margen de ganancia real.', 'advanced_analytics'),
  staff: available('staff', 'Personal', '/staff', 'organization', 'Gestión de equipo de trabajo, roles y catálogo de permisos.'),
  settings: available('settings', 'Ajustes', '/configuracion', 'organization', 'Configuración de la tienda, tickets, moneda, zona horaria y políticas.'),
  cash: planned('cash', 'Caja', 'branch'),
  orders: planned('orders', 'Pedidos', 'branch'),
  purchases: planned('purchases', 'Compras', 'organization'),
  online_commerce: planned('online_commerce', 'Comercio online', 'organization'),
  delivery: planned('delivery', 'Delivery', 'branch'),
  credit: planned('credit', 'Crédito', 'organization'),
  loyalty: planned('loyalty', 'Fidelización', 'organization'),
  multi_branch: planned('multi_branch', 'Multisucursal', 'organization'),
  integrations: planned('integrations', 'Integraciones', 'organization'),
  agenda: planned('agenda', 'Agenda', 'branch'),
  work_orders: planned('work_orders', 'Órdenes de trabajo', 'branch'),
  kitchen: planned('kitchen', 'Cocina (KDS)', 'branch'),
  recipes: planned('recipes', 'Recetas e insumos', 'branch'),
  tables: planned('tables', 'Mesas y comandas', 'branch'),
  scales: planned('scales', 'Balanzas', 'branch'),
  quotes: planned('quotes', 'Cotizaciones', 'branch'),
}

const retail: ModuleId[] = ['dashboard', 'pos', 'inventory', 'customers', 'analytics', 'staff', 'settings']
const gastronomy: ModuleId[] = ['dashboard', 'pos', 'orders', 'kitchen', 'inventory', 'recipes', 'customers', 'analytics', 'staff', 'settings']
const services: ModuleId[] = ['dashboard', 'customers', 'staff', 'analytics', 'settings']
const wholesale: ModuleId[] = ['dashboard', 'inventory', 'purchases', 'orders', 'quotes', 'customers', 'credit', 'analytics', 'staff', 'settings']

export const CATEGORY_MODULE_DEFAULTS: Record<BusinessCategoryId, readonly ModuleId[]> = {
  comercio_general: retail,
  minimarket_abarrotes: [...retail, 'scales'],
  ropa_calzado: retail,
  ferreteria_construccion: [...retail, 'quotes'],
  farmacia_belleza: retail,
  libreria_papeleria: retail,
  tecnologia_celulares: [...retail, 'work_orders'],
  repuestos: [...retail, 'quotes', 'work_orders'],
  tienda_mascotas: [...retail, 'agenda'],
  restaurante_tradicional: [...gastronomy, 'tables'],
  cafeteria: [...gastronomy, 'tables'],
  bar: [...gastronomy, 'tables'],
  panaderia: gastronomy.filter(id => id !== 'kitchen'),
  comida_rapida: gastronomy,
  dark_kitchen: gastronomy.filter(id => id !== 'pos'),
  barberia_belleza: [...services, 'agenda', 'pos', 'cash'],
  lavanderia: [...services, 'orders', 'cash'],
  taller: [...services, 'work_orders', 'inventory', 'purchases', 'quotes'],
  servicio_tecnico: [...services, 'work_orders', 'inventory'],
  mayorista_general: wholesale,
  distribuidor: [...wholesale, 'delivery'],
}

export function getDefaultModuleIds(categoryId: BusinessCategoryId): readonly ModuleId[] {
  return CATEGORY_MODULE_DEFAULTS[categoryId] ?? CATEGORY_MODULE_DEFAULTS.comercio_general
}
export function getAvailableModuleDefinitions(categoryId: BusinessCategoryId): ModuleDefinition[] {
  return getDefaultModuleIds(categoryId).map(id => MODULE_REGISTRY[id]).filter(mod => mod.implementationStatus === 'available')
}
