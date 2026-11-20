import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanLimitsSection } from './PlanLimitsSection'

vi.mock('../../../core/organizations/useOrganizationId', () => ({ useOrganizationId: () => ({ organizationId: 'store-a' }) }))
vi.mock('../../../core/subscriptions/useOrganizationPlan', () => ({ useOrganizationPlan: () => ({ data: { industrySubType: 'comercio_general', subscriptionStatus: 'trialing', plan: { code: 'standard', name: 'Standard' } }, isLoading: false }) }))
vi.mock('../../../core/subscriptions/useOrganizationEntitlements', () => ({ useOrganizationEntitlements: () => ({ isFeatureEnabled: () => false, getLimit: () => null }) }))
vi.mock('../../../core/access/useOrganizationModules', () => ({
  useOrganizationModules: () => ({ areaId: 'health', compatibilityMode: false, canAccessModule: () => false }),
}))
vi.mock('../../staff/hooks/useStaff', () => ({ useStaff: () => ({ data: [], isLoading: false }) }))

it('shows the organization area and hides the commercial register limit for Salud', () => {
  render(<PlanLimitsSection />)
  expect(screen.getByText('Salud')).toBeTruthy()
  expect(screen.queryByText('Cajas registradoras simultáneas')).toBeNull()
  expect(screen.queryByText(/3 cajas simultáneas|ajuste masivo de inventario/i)).toBeNull()
})
