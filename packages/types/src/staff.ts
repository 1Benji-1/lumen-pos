import type { BusinessType } from './business'

export type UserRole = 'owner' | 'admin' | 'cashier' | 'stock_clerk'

export type FutureUserRole = 'mesero' | 'cocinero' | 'reponedor'

export type Permission =
  | 'dashboard:view'
  | 'pos:access'
  | 'pos:manage_cash'
  | 'pos:audit_cash'
  | 'inventory:view'
  | 'inventory:manage'
  | 'customers:view'
  | 'customers:manage'
  | 'analytics:view'
  | 'staff:view'
  | 'staff:manage'
  | 'settings:manage'

export interface RoleDefinition {
  role: UserRole
  title: string
  shortLabel: string
  description: string
  permissions: Permission[]
  badgeColor: string
  businessType: BusinessType
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  owner: {
    role: 'owner',
    title: 'Propietario',
    shortLabel: 'Dueño',
    description: 'Acceso total a todas las operaciones, finanzas, personal y configuración del negocio.',
    permissions: [
      'dashboard:view',
      'pos:access',
      'pos:manage_cash',
      'pos:audit_cash',
      'inventory:view',
      'inventory:manage',
      'customers:view',
      'customers:manage',
      'analytics:view',
      'staff:view',
      'staff:manage',
      'settings:manage',
    ],
    badgeColor: 'bg-[#242423]/10 text-[#242423] border border-[#242423]/20',
    businessType: 'tienda_articulos',
  },
  admin: {
    role: 'admin',
    title: 'Encargado de tienda',
    shortLabel: 'Encargado',
    description: 'Gestión operativa: supervisión de inventario, punto de venta, reportes y equipo de colaboradores.',
    permissions: [
      'dashboard:view',
      'pos:access',
      'pos:manage_cash',
      'pos:audit_cash',
      'inventory:view',
      'inventory:manage',
      'customers:view',
      'customers:manage',
      'analytics:view',
      'staff:view',
      'staff:manage',
    ],
    badgeColor: 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]',
    businessType: 'tienda_articulos',
  },
  cashier: {
    role: 'cashier',
    title: 'Cajero',
    shortLabel: 'Cajero',
    description: 'Operación en el punto de venta, cobros, emisión de comprobantes y gestión de caja registradora.',
    permissions: [
      'pos:access',
      'pos:manage_cash',
      'inventory:view',
      'customers:view',
      'customers:manage',
    ],
    badgeColor: 'bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/60',
    businessType: 'tienda_articulos',
  },
  stock_clerk: {
    role: 'stock_clerk',
    title: 'Encargado de inventario',
    shortLabel: 'Inventario',
    description: 'Recepción y ajuste de existencias, control de variantes, códigos de barra y alertas de vencimiento.',
    permissions: [
      'inventory:view',
      'inventory:manage',
    ],
    badgeColor: 'bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5]',
    businessType: 'tienda_articulos',
  },
}

export interface FutureRoleDefinition {
  role: FutureUserRole
  title: string
  description: string
  targetBusinessType: 'restaurante' | 'supermercado'
  plannedPermissions: string[]
}

export const DOCUMENTED_FUTURE_ROLES: FutureRoleDefinition[] = [
  {
    role: 'mesero',
    title: 'Mesero / Camarero',
    description: 'Atención a comensales en salón, toma de pedidos por mesa y envío directo a cocina.',
    targetBusinessType: 'restaurante',
    plannedPermissions: ['pos:access', 'tables:manage', 'orders:create', 'menu:view'],
  },
  {
    role: 'cocinero',
    title: 'Cocinero / Personal de cocina',
    description: 'Visualización de pedidos en pantalla de cocina (KDS), preparación y despacho de comandas.',
    targetBusinessType: 'restaurante',
    plannedPermissions: ['kitchen:view', 'kitchen:manage', 'recipes:view'],
  },
  {
    role: 'reponedor',
    title: 'Reponedor / Auxiliar de salón',
    description: 'Control de góndolas, verificación de precios, pesaje de productos y rotación continua.',
    targetBusinessType: 'supermercado',
    plannedPermissions: ['inventory:view', 'inventory:adjust', 'scales:access'],
  },
]

export interface PermissionDetail {
  code: Permission
  name: string
  module: string
  description: string
}

export const PERMISSION_CATALOG: Record<Permission, PermissionDetail> = {
  'dashboard:view': {
    code: 'dashboard:view',
    name: 'Ver panel de control y torre de mando',
    module: 'Inicio',
    description: 'Visualizar métricas ejecutivas, monitor de cajas en vivo y alertas operativas del comercio.',
  },
  'pos:access': {
    code: 'pos:access',
    name: 'Operar Punto de Venta',
    module: 'Punto de venta',
    description: 'Registrar ventas, cobros y comprobantes de compra.',
  },
  'pos:manage_cash': {
    code: 'pos:manage_cash',
    name: 'Operar caja registradora propia',
    module: 'Punto de venta',
    description: 'Apertura de turno propio, registrar ingresos/retiros de cambio y arqueo ciego final.',
  },
  'pos:audit_cash': {
    code: 'pos:audit_cash',
    name: 'Auditar turnos y arqueos de caja',
    module: 'Punto de venta',
    description: 'Visualizar sesiones de caja de todos los cajeros en tiempo real, generar Corte X y revisar balances de cierre Corte Z.',
  },
  'inventory:view': {
    code: 'inventory:view',
    name: 'Consultar catálogo',
    module: 'Inventario',
    description: 'Visualizar lista de productos, precios y existencias.',
  },
  'inventory:manage': {
    code: 'inventory:manage',
    name: 'Modificar inventario',
    module: 'Inventario',
    description: 'Crear o actualizar productos, variantes, códigos de barra y lotes.',
  },
  'customers:view': {
    code: 'customers:view',
    name: 'Consultar clientes',
    module: 'Clientes',
    description: 'Acceder a la lista y datos de contacto de clientes registrados.',
  },
  'customers:manage': {
    code: 'customers:manage',
    name: 'Administrar clientes',
    module: 'Clientes',
    description: 'Registrar nuevos clientes o actualizar información comercial.',
  },
  'analytics:view': {
    code: 'analytics:view',
    name: 'Visualizar reportes',
    module: 'Reportes',
    description: 'Analítica de ventas, ingresos, márgenes y productos más vendidos.',
  },
  'staff:view': {
    code: 'staff:view',
    name: 'Ver equipo de trabajo',
    module: 'Personal',
    description: 'Consultar nómina de empleados y sus roles asignados.',
  },
  'staff:manage': {
    code: 'staff:manage',
    name: 'Administrar colaboradores',
    module: 'Personal',
    description: 'Invitar nuevos usuarios, actualizar roles o cambiar estados de acceso.',
  },
  'settings:manage': {
    code: 'settings:manage',
    name: 'Configuración comercial',
    module: 'Configuración',
    description: 'Datos de la empresa, términos fiscales y gestión del plan de suscripción.',
  },
}

/**
 * Valida si un rol específico posee un permiso determinado en la matriz fija.
 */
export function hasPermission(role: UserRole | string | null | undefined, permission: Permission): boolean {
  if (!role) return false
  const def = ROLE_DEFINITIONS[role as UserRole]
  if (!def) return false
  return def.permissions.includes(permission)
}

/**
 * Retorna la ruta inicial o de fallback por defecto según el rol del usuario.
 * Garantiza que cajeros y almaceneros nunca aterricen en el Dashboard ejecutivo.
 */
export function getDefaultRouteForRole(role: UserRole | string | null | undefined): string {
  if (!role) return '/login'
  switch (role) {
    case 'cashier':
      return '/pos'
    case 'stock_clerk':
      return '/inventario'
    case 'owner':
    case 'admin':
    default:
      return '/'
  }
}

export interface StaffMember {
  id: string
  store_id: string
  full_name: string | null
  email: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}
