import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

vi.mock('../../core/configuration/useOrganizationSettings', () => ({
  useOrganizationSettings: () => ({ settings: undefined, isLoading: true }),
}))
vi.mock('../../core/access/useOrganizationModules', () => ({
  useOrganizationModules: () => ({
    areaId: 'health',
    canAccessModule: (moduleId: string) => moduleId === 'settings',
  }),
}))

afterEach(cleanup)

it('offers account settings without sales or inventory settings for Salud', () => {
  render(<SettingsPage />)
  expect(screen.getByRole('button', { name: 'General' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Plan y Límites' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Gaveta y Turnos' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Existencias y Alertas' })).toBeNull()
})
