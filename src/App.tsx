import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { PageLoader } from '@/components/ui/page-loader'

// Code-split feature pages for optimal bundle size and lazy loading
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  }))
)
const PosPage = lazy(() =>
  import('@/features/pos/pages/PosPage').then((m) => ({ default: m.PosPage }))
)
const ProductsPage = lazy(() =>
  import('@/features/products/pages/ProductsPage').then((m) => ({
    default: m.ProductsPage,
  }))
)
const CategoriesPage = lazy(() =>
  import('@/features/categories/pages/CategoriesPage').then((m) => ({
    default: m.CategoriesPage,
  }))
)
const PurchasesPage = lazy(() =>
  import('@/features/purchases/pages/PurchasesPage').then((m) => ({
    default: m.PurchasesPage,
  }))
)
const SalesPage = lazy(() =>
  import('@/features/sales/pages/SalesPage').then((m) => ({ default: m.SalesPage }))
)
const CustomersPage = lazy(() =>
  import('@/features/customers/pages/CustomersPage').then((m) => ({
    default: m.CustomersPage,
  }))
)
const ExpensesPage = lazy(() =>
  import('@/features/expenses/pages/ExpensesPage').then((m) => ({
    default: m.ExpensesPage,
  }))
)
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((m) => ({
    default: m.ReportsPage,
  }))
)
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  }))
)
const PublicMenuPage = lazy(() =>
  import('@/features/menu/pages/PublicMenuPage').then((m) => ({
    default: m.PublicMenuPage,
  }))
)

export function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
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
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                <SalesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
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
      </Suspense>
    </AuthProvider>
  )
}

export default App
