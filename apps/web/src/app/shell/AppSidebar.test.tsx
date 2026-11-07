import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ modules: ['dashboard', 'pos', 'inventory', 'customers', 'staff', 'settings'] as string[], permissions: ['dashboard:view', 'pos:access', 'inventory:view', 'customers:view', 'staff:view', 'settings:manage'] as string[], loading: false, error: null as Error | null }))
vi.mock('../../shared/hooks/useStoreModules', () => ({ useStoreModules: () => ({ canAccessModule: (id: string) => state.modules.includes(id), isLoading: state.loading, error: state.error }) }))
vi.mock('../../shared/hooks/useCurrentUserRole', () => ({ useCurrentUserRole: () => ({ hasPermission: (key: string) => state.permissions.includes(key), loading: false }) }))
import { AppSidebar } from './AppSidebar'
beforeEach(() => { state.modules = ['dashboard', 'pos', 'inventory', 'customers', 'staff', 'settings']; state.permissions = ['dashboard:view', 'pos:access', 'inventory:view', 'customers:view', 'staff:view', 'settings:manage']; state.loading = false; state.error = null })
afterEach(cleanup)
const renderSidebar = () => render(<MemoryRouter><AppSidebar /></MemoryRouter>)
it('shows only modules allowed by both effective access and role permission', () => { state.permissions = ['pos:access']; renderSidebar(); expect(screen.getByRole('link', { name: 'Caja' })).toBeTruthy(); expect(screen.queryByRole('link', { name: 'Inventario' })).toBeNull() })
it('hides settings when the settings module is disabled even if the role has permission', () => { state.modules = ['dashboard']; renderSidebar(); expect(screen.queryByRole('link', { name: 'Ajustes' })).toBeNull() })
it('does not flash inaccessible links while access is loading', () => { state.loading = true; renderSidebar(); expect(screen.queryAllByRole('link')).toHaveLength(0) })
it('keeps current retail Standard navigation unchanged after resolution', () => { renderSidebar(); expect(screen.getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual(['Inicio', 'Caja', 'Inventario', 'Clientes', 'Equipo', 'Ajustes']) })
it('adds analytics for current retail Pro when advanced_analytics is enabled', () => { state.modules.push('analytics'); state.permissions.push('analytics:view'); renderSidebar(); expect(screen.getByRole('link', { name: 'Reportes' })).toBeTruthy() })
