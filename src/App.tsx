import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { MainLayout } from '@/components/layout/MainLayout'

// Feature Pages
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { PosPage } from '@/features/pos/pages/PosPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { PurchasesPage } from '@/features/purchases/pages/PurchasesPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { ExpensesPage } from '@/features/expenses/pages/ExpensesPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { PublicMenuPage } from '@/features/menu/pages/PublicMenuPage'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/menu" element={<PublicMenuPage />} />

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* POS Route — accessible to both Cashier and Admin */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                <PosPage />
              </ProtectedRoute>
            }
          />

          {/* Admin-only Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PurchasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SalesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
