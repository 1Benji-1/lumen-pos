import { Routes, Route } from 'react-router-dom'
import { SuperAdminGuard } from '../../shared/guards/SuperAdminGuard'
import { AdminLayout } from '../../shared/components/AdminLayout'
import { LoginForm } from '../../features/auth/components/LoginForm'
import { AdminDashboardPage } from '../../features/dashboard/AdminDashboardPage'
import { StoresPage } from '../../features/stores/StoresPage'
import { StoreDetailPage } from '../../features/stores/StoreDetailPage'
import { FeedbackDashboardPage } from '../../features/feedback/FeedbackDashboardPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route element={<SuperAdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<AdminDashboardPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/stores/:id" element={<StoreDetailPage />} />
          <Route path="/feedback" element={<FeedbackDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  )
}