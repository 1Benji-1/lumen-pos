import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanLimitsSection } from './PlanLimitsSection'

vi.mock('../../../core/organizations/useOrganizationId', () => ({ useOrganizationId: () => ({ organizationId: 'store-a' }) }))
vi.mock('../../../core/subscriptions/useOrganizationPlan', () => ({ useOrganizationPlan: () => ({ data: { industrySubType: 'comercio_general', subscriptionStatus: 'trialing', plan: { code: 'standard', name: 'Standard' } }, isLoading: false }) }))
vi.mock('../../../core/subscriptions/useOrganizationEntitlements', () => ({ useOrganizationEntitlements: () => ({ isFeatureEnabled: () => false, getLimit: () => null }) }))
vi.mock('../../../core/access/useOrganizationModules', () => ({ useOrganizationModules: () => ({ profile: { familyId: 'services', categoryId: 'barberia_belleza' } }) }))
vi.mock('../../staff/hooks/useStaff', () => ({ useStaff: () => ({ data: [], isLoading: false }) }))

it('shows the primary branch category instead of the legacy retail subtype', () => {
  render(<PlanLimitsSection />)
  expect(screen.getByText('Barbería y belleza')).toBeTruthy()
  expect(screen.queryByText('comercio general')).toBeNull()
})
