import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '../../shared/components/AppLayout'
import { ModuleGuard } from '../../shared/guards/ModuleGuard'
import { RoleGuard } from '../../shared/guards/RoleGuard'
import { PlanGuard } from '../../shared/guards/PlanGuard'
import { LoginForm } from '../../features/auth/components/LoginForm'
import { ForgotPasswordForm } from '../../features/auth/components/ForgotPasswordForm'
import { ResetPasswordForm } from '../../features/auth/components/ResetPasswordForm'
import { DashboardPage } from '../../features/dashboard/DashboardPage'
import { InventoryPage } from '../../features/inventory/InventoryPage'
import { AddProductPage } from '../../features/inventory/AddProductPage'
import { AddCategoryPage } from '../../features/inventory/AddCategoryPage'
import { StockMovementsPage } from '../../features/inventory/StockMovementsPage'
import { PhysicalCountPage } from '../../features/inventory/PhysicalCountPage'
import { SuppliersPage } from '../../features/inventory/SuppliersPage'
import { PurchaseOrdersPage } from '../../features/inventory/PurchaseOrdersPage'
import { BatchPriceAdjustPage } from '../../features/inventory/BatchPriceAdjustPage'
import { PosPage } from '../../features/pos/PosPage'
import { SalesHistoryPage } from '../../features/pos/SalesHistoryPage'
import { CustomersPage } from '../../features/customers/CustomersPage'
import { AnalyticsPage } from '../../features/analytics/AnalyticsPage'
import { StaffPage } from '../../features/staff/StaffPage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { DocsPage } from '../../features/docs/DocsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <ModuleGuard module="dashboard">
                <RoleGuard requiredPermission="dashboard:view">
                  <DashboardPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario"
            element={
              <ModuleGuard module="inventory">
                <RoleGuard requiredPermission="inventory:view">
                  <InventoryPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/agregar-producto"
            element={
              <ModuleGuard module="inventory">
                <RoleGuard requiredPermission="inventory:manage">
                  <AddProductPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/agregar-categoria"
            element={
              <ModuleGuard module="inventory">
                <RoleGuard requiredPermission="inventory:manage">
                  <AddCategoryPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/movimientos"
            element={
              <ModuleGuard module="inventory">
                <RoleGuard requiredPermission="inventory:view">
                  <StockMovementsPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/conteo-fisico"
            element={
              <ModuleGuard module="inventory">
                <PlanGuard feature="physical_count">
                  <RoleGuard requiredPermission="inventory:manage">
                    <PhysicalCountPage />
                  </RoleGuard>
                </PlanGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/proveedores"
            element={
              <ModuleGuard module="inventory">
                <PlanGuard feature="purchase_orders">
                  <RoleGuard requiredPermission="inventory:manage">
                    <SuppliersPage />
                  </RoleGuard>
                </PlanGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/ordenes-compra"
            element={
              <ModuleGuard module="inventory">
                <PlanGuard feature="purchase_orders">
                  <RoleGuard requiredPermission="inventory:manage">
                    <PurchaseOrdersPage />
                  </RoleGuard>
                </PlanGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/inventario/ajuste-precios"
            element={
              <ModuleGuard module="inventory">
                <PlanGuard feature="batch_price_adjust">
                  <RoleGuard requiredPermission="inventory:manage">
                    <BatchPriceAdjustPage />
                  </RoleGuard>
                </PlanGuard>
              </ModuleGuard>
            }
          />
          <Route path="/inventory" element={<Navigate to="/inventario" replace />} />
          <Route
            path="/pos"
            element={
              <ModuleGuard module="pos">
                <RoleGuard requiredPermission="pos:access">
                  <PosPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/pos/ventas"
            element={
              <ModuleGuard module="pos">
                <RoleGuard requiredPermission="pos:access">
                  <SalesHistoryPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/pos/cajas"
            element={<Navigate to="/analytics?tab=cash_audit" replace />}
          />
          <Route
            path="/pos/offline"
            element={<Navigate to="/configuracion?tab=offline" replace />}
          />
          <Route
            path="/customers"
            element={
              <ModuleGuard module="customers">
                <RoleGuard requiredPermission="customers:view">
                  <CustomersPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/analytics"
            element={
              <ModuleGuard module="analytics">
                <RoleGuard requiredPermission="analytics:view">
                  <AnalyticsPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/staff"
            element={
              <ModuleGuard module="staff">
                <RoleGuard requiredPermission="staff:view">
                  <StaffPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ModuleGuard module="settings">
                <RoleGuard requiredPermission="settings:manage">
                  <SettingsPage />
                </RoleGuard>
              </ModuleGuard>
            }
          />
          <Route path="/settings" element={<Navigate to="/configuracion" replace />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
