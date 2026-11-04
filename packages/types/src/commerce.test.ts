import { describe, expect, it } from 'vitest'
import { BUSINESS_CATEGORIES, resolveLegacyBusinessProfile, resolveStoredBusinessProfile } from './commerce'
import { RETAIL_SUBTYPES } from './business'

describe('legacy business profile', () => {
  it('maps a supermarket to the retail minimarket category', () => {
    expect(resolveLegacyBusinessProfile('supermercado', 'comercio_general')).toEqual({
      familyId: 'retail', categoryId: 'minimarket_abarrotes',
    })
  })
  it('maps a restaurant to the traditional restaurant category', () => {
    expect(resolveLegacyBusinessProfile('restaurante', 'comercio_general')).toEqual({ familyId: 'gastronomy', categoryId: 'restaurante_tradicional' })
  })
  it('preserves every retail subtype', () => {
    for (const subtype of Object.keys(RETAIL_SUBTYPES)) {
      expect(resolveLegacyBusinessProfile('tienda_articulos', subtype)).toEqual({ familyId: 'retail', categoryId: subtype })
    }
  })
  it('recognizes the new retail categories when they are stored on a legacy retail business', () => {
    expect(resolveLegacyBusinessProfile('tienda_articulos', 'repuestos')).toEqual({ familyId: 'retail', categoryId: 'repuestos' })
    expect(resolveLegacyBusinessProfile('tienda_articulos', 'tienda_mascotas')).toEqual({ familyId: 'retail', categoryId: 'tienda_mascotas' })
  })
  it('falls back safely for unknown values', () => {
    expect(resolveLegacyBusinessProfile('unknown', 'dark_kitchen')).toEqual({ familyId: 'retail', categoryId: 'comercio_general' })
    expect(resolveLegacyBusinessProfile('tienda_articulos', 'dark_kitchen')).toEqual({ familyId: 'retail', categoryId: 'comercio_general' })
  })
  it('keeps every category attached to one family', () => {
    for (const category of Object.values(BUSINESS_CATEGORIES)) {
      expect(category.familyId).toMatch(/^(retail|gastronomy|services|wholesale)$/)
    }
  })
})

describe('stored branch profile', () => {
  it('derives the family from a valid persisted category', () => {
    expect(resolveStoredBusinessProfile('dark_kitchen')).toEqual({ familyId: 'gastronomy', categoryId: 'dark_kitchen' })
  })
  it('rejects unknown or missing categories instead of granting retail defaults', () => {
    expect(resolveStoredBusinessProfile('not-a-category')).toBeNull()
    expect(resolveStoredBusinessProfile(null)).toBeNull()
  })
})
