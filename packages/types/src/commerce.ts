import { RETAIL_SUBTYPES, type BusinessType, type RetailSubType } from './business'

export type BusinessFamilyId = 'retail' | 'gastronomy' | 'services' | 'wholesale'
export type BusinessCategoryId =
  | RetailSubType | 'repuestos' | 'tienda_mascotas'
  | 'restaurante_tradicional' | 'cafeteria' | 'bar' | 'panaderia' | 'comida_rapida' | 'dark_kitchen'
  | 'barberia_belleza' | 'lavanderia' | 'taller' | 'servicio_tecnico'
  | 'mayorista_general' | 'distribuidor'

export interface BusinessProfile { familyId: BusinessFamilyId; categoryId: BusinessCategoryId }
export interface BusinessFamilyDefinition { id: BusinessFamilyId; name: string }
export interface BusinessCategoryDefinition { id: BusinessCategoryId; familyId: BusinessFamilyId; name: string }

export const BUSINESS_FAMILIES: Record<BusinessFamilyId, BusinessFamilyDefinition> = {
  retail: { id: 'retail', name: 'Comercio minorista' },
  gastronomy: { id: 'gastronomy', name: 'Gastronomía' },
  services: { id: 'services', name: 'Servicios con venta' },
  wholesale: { id: 'wholesale', name: 'Mayoristas y distribuidores' },
}

const retailCategories = Object.values(RETAIL_SUBTYPES).map(({ code, name }) => [code, { id: code, familyId: 'retail', name }] as const)
export const BUSINESS_CATEGORIES: Record<BusinessCategoryId, BusinessCategoryDefinition> = {
  ...Object.fromEntries(retailCategories),
  repuestos: { id: 'repuestos', familyId: 'retail', name: 'Repuestos' },
  tienda_mascotas: { id: 'tienda_mascotas', familyId: 'retail', name: 'Tienda de mascotas' },
  restaurante_tradicional: { id: 'restaurante_tradicional', familyId: 'gastronomy', name: 'Restaurante tradicional' },
  cafeteria: { id: 'cafeteria', familyId: 'gastronomy', name: 'Cafetería' },
  bar: { id: 'bar', familyId: 'gastronomy', name: 'Bar' },
  panaderia: { id: 'panaderia', familyId: 'gastronomy', name: 'Panadería' },
  comida_rapida: { id: 'comida_rapida', familyId: 'gastronomy', name: 'Comida rápida' },
  dark_kitchen: { id: 'dark_kitchen', familyId: 'gastronomy', name: 'Dark kitchen' },
  barberia_belleza: { id: 'barberia_belleza', familyId: 'services', name: 'Barbería y belleza' },
  lavanderia: { id: 'lavanderia', familyId: 'services', name: 'Lavandería' },
  taller: { id: 'taller', familyId: 'services', name: 'Taller' },
  servicio_tecnico: { id: 'servicio_tecnico', familyId: 'services', name: 'Servicio técnico' },
  mayorista_general: { id: 'mayorista_general', familyId: 'wholesale', name: 'Mayorista general' },
  distribuidor: { id: 'distribuidor', familyId: 'wholesale', name: 'Distribuidor' },
} as Record<BusinessCategoryId, BusinessCategoryDefinition>

export function getBusinessCategory(categoryId: BusinessCategoryId): BusinessCategoryDefinition { return BUSINESS_CATEGORIES[categoryId] }

export function resolveLegacyBusinessProfile(businessType: BusinessType | string | null | undefined, industrySubType?: RetailSubType | string | null): BusinessProfile {
  if (businessType === 'restaurante') return { familyId: 'gastronomy', categoryId: 'restaurante_tradicional' }
  if (businessType === 'supermercado') return { familyId: 'retail', categoryId: 'minimarket_abarrotes' }
  if (businessType === 'tienda_articulos' && industrySubType && Object.prototype.hasOwnProperty.call(RETAIL_SUBTYPES, industrySubType)) {
    return { familyId: 'retail', categoryId: industrySubType as RetailSubType }
  }
  return { familyId: 'retail', categoryId: 'comercio_general' }
}
