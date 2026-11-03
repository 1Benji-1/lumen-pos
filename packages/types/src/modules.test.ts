import { describe, expect, it } from 'vitest'
import { getDefaultModuleIds, getAvailableModuleDefinitions } from './modules'
import { getModulesForBusinessType } from './business'

describe('category module composition', () => {
  it('includes tables for restaurante_tradicional', () => {
    expect(getDefaultModuleIds('restaurante_tradicional')).toContain('tables')
  })
  it('omits tables for dark_kitchen while retaining kitchen and recipes', () => {
    const modules = getDefaultModuleIds('dark_kitchen')
    expect(modules).not.toContain('tables')
    expect(modules).toContain('kitchen')
    expect(modules).toContain('recipes')
  })
  it('keeps online commerce optional for dark_kitchen', () => {
    expect(getDefaultModuleIds('dark_kitchen')).not.toContain('online_commerce')
  })
  it('omits inventory from the default barberia_belleza composition', () => {
    expect(getDefaultModuleIds('barberia_belleza')).not.toContain('inventory')
  })
  it('allows taller to default to inventory and work orders', () => {
    expect(getDefaultModuleIds('taller')).toEqual(expect.arrayContaining(['inventory', 'work_orders']))
  })
  it('never returns planned modules as available navigation modules', () => {
    expect(getAvailableModuleDefinitions('restaurante_tradicional').map(m => m.id)).not.toContain('tables')
  })
  it('keeps legacy retail modules identical to the current BUSINESS_MODULES behavior', () => {
    expect(getModulesForBusinessType('tienda_articulos').map(m => m.id)).toEqual(['dashboard', 'pos', 'inventory', 'customers', 'analytics', 'staff', 'settings'])
  })
})
