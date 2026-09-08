import { Routes, Route } from 'react-router-dom'
import { SuperAdminGuard } from '../../shared/guards/SuperAdminGuard'
import { LoginForm } from '../../features/auth/components/LoginForm'
import { CreateStoreForm } from '../../features/stores/components/CreateStoreForm'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route element={<SuperAdminGuard />}>
        <Route path="/" element={<CreateStoreForm />} />
      </Route>
    </Routes>
  )
}