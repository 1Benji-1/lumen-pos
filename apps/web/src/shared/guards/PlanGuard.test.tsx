import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
const state = vi.hoisted(() => ({ enabled: true, loading: false, error: null as Error | null }))
vi.mock('../hooks/useStoreEntitlements', () => ({ useStoreEntitlements: () => ({ isFeatureEnabled: () => state.enabled, planName: 'Standard', isLoading: state.loading, error: state.error }) }))
vi.mock('../hooks/useStoreId', () => ({ useStoreId: () => ({ storeId: 'store-1' }) }))
vi.mock('../hooks/useStorePlan', () => ({ useStorePlan: () => ({ data: { plans: { name: 'Standard', features: { advanced_analytics: true } }, feature_overrides: {} }, isLoading: false }) }))
import { PlanGuard } from './PlanGuard'
beforeEach(() => { state.enabled = true; state.loading = false; state.error = null })
afterEach(cleanup)
const renderGuard = () => render(<MemoryRouter><PlanGuard feature="advanced_analytics"><span>Contenido privado</span></PlanGuard></MemoryRouter>)
it('renders children only when the effective feature is enabled', () => {
  renderGuard()
  expect(screen.getByText('Contenido privado')).toBeTruthy()
})
it('renders the plan restriction when an override explicitly disables the feature', () => {
  state.enabled = false
  renderGuard()
  expect(screen.queryByText('Contenido privado')).toBeNull()
  expect(screen.getByText(/función no disponible en tu plan/i)).toBeTruthy()
})
it('renders a loading screen without children while entitlements load', () => {
  state.loading = true
  renderGuard()
  expect(screen.queryByText('Contenido privado')).toBeNull()
})
it('renders a restriction without children when entitlement loading fails', () => {
  state.error = new Error('offline')
  renderGuard()
  expect(screen.queryByText('Contenido privado')).toBeNull()
})
