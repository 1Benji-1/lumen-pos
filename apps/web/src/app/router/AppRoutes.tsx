import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginForm } from '../../features/auth/components/LoginForm'
import { ForgotPasswordForm } from '../../features/auth/components/ForgotPasswordForm'
import { ResetPasswordForm } from '../../features/auth/components/ResetPasswordForm'
import { DashboardPage } from '../../features/dashboard/DashboardPage'
import { InventoryPage } from '../../features/inventory/InventoryPage'
import { PosPage } from '../../features/pos/PosPage'
import { CustomersPage } from '../../features/customers/CustomersPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/customers" element={<CustomersPage />} />
      </Route>
    </Routes>
  )
}