import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ reason: 'allowed', loading: false, error: null as Error | null }))
vi.mock('../hooks/useStoreModules', () => ({ useStoreModules: () => ({ isLoading: state.loading, error: state.error, businessType: 'tienda_articulos', isModuleAllowedInBusinessType: () => state.reason !== 'category_disabled', canAccessModule: () => state.reason === 'allowed', getModuleAccess: () => ({ allowed: state.reason === 'allowed', reason: state.reason }) }) }))
import { ModuleGuard } from './ModuleGuard'
beforeEach(() => { state.reason = 'allowed'; state.loading = false; state.error = null })
afterEach(cleanup)
const renderGuard = () => render(<MemoryRouter><ModuleGuard module="pos"><span>Venta privada</span></ModuleGuard></MemoryRouter>)
it('renders children for an allowed module', () => { renderGuard(); expect(screen.getByText('Venta privada')).toBeTruthy() })
it('renders the plan restriction for plan_disabled', () => { state.reason = 'plan_disabled'; renderGuard(); expect(screen.queryByText('Venta privada')).toBeNull(); expect(screen.getByText(/plan actual/i)).toBeTruthy() })
it('renders the inactive-module restriction for category_disabled', () => { state.reason = 'category_disabled'; renderGuard(); expect(screen.queryByText('Venta privada')).toBeNull(); expect(screen.getByRole('heading', { name: 'Módulo no está activo' })).toBeTruthy() })
it('never renders children while module access is loading or failed', () => { state.loading = true; renderGuard(); expect(screen.queryByText('Venta privada')).toBeNull(); cleanup(); state.loading = false; state.error = new Error('offline'); renderGuard(); expect(screen.queryByText('Venta privada')).toBeNull() })
