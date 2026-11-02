import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({ retry: vi.fn() }))
vi.mock('../../shared/hooks/useAuth', () => ({ useAuth: () => ({
  session: { user: { app_metadata: { is_super_admin: true } } }, loading: false, isAuthenticated: true,
  mfaLevel: null, hasEnrolledMfa: true, verifiedFactorId: null, mfaError: new Error('MFA unavailable'), refreshMfaStatus: f.retry,
}) }))
vi.mock('./services/authService', () => ({ challengeAndVerifyMfa: vi.fn() }))
import { SuperAdminGuard } from '../../shared/guards/SuperAdminGuard'
it('offers retry after MFA lookup failure without allowing access', () => {
  render(<SuperAdminGuard />)
  expect(screen.getByRole('alert').textContent).toContain('MFA unavailable')
  fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
  expect(f.retry).toHaveBeenCalledOnce()
})
