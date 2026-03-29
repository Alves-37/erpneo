import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import LoginPage from './pages/login/LoginPage.jsx'
import DashboardPage from './pages/dashboard/DashboardPage.jsx'
import ProductsPage from './pages/products/ProductsPage.jsx'
import RawMaterialsPage from './pages/rawMaterials/RawMaterialsPage.jsx'
import CategoriesPage from './pages/categories/CategoriesPage.jsx'
import StockPage from './pages/stock/StockPage.jsx'
import WarehousePage from './pages/stock/WarehousePage.jsx'
import StockHistoryPage from './pages/stock/StockHistoryPage.jsx'
import StockTransferPage from './pages/stock/StockTransferPage.jsx'
import StockAdjustmentPage from './pages/stock/StockAdjustmentPage.jsx'
import SalesPage from './pages/sales/SalesPage.jsx'
import PdvPage from './pages/pdv/PdvPage.jsx'
import DebtsPage from './pages/debts/DebtsPage.jsx'
import ReturnsPage from './pages/returns/ReturnsPage.jsx'
import ReservationsPage from './pages/reservations/ReservationsPage.jsx'
import TablesPage from './pages/tables/TablesPage.jsx'
import OrdersPage from './pages/orders/OrdersPage.jsx'
import DeliveryZonesPage from './pages/deliveryZones/DeliveryZonesPage.jsx'
import FinancePage from './pages/finance/FinancePage.jsx'
import ReportsPage from './pages/reports/ReportsPage.jsx'
import SettingsPage from './pages/settings/SettingsPage.jsx'
import UsersPage from './pages/users/UsersPage.jsx'
import EstablishmentsPage from './pages/establishments/EstablishmentsPage.jsx'
import ReprographyBillingPage from './pages/reprography/ReprographyBillingPage.jsx'
import ReprographyPrintersPage from './pages/reprography/ReprographyPrintersPage.jsx'
import ReprographyReadingsPage from './pages/reprography/ReprographyReadingsPage.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import { useAuthStore } from './store/authStore.js'
import ToastHost from './components/ToastHost.jsx'
import { getMyBranch } from './api/branches.js'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RestaurantOnlyRoute({ children }) {
  const [allowed, setAllowed] = useState(null)
  const branch = useAuthStore((s) => s.branch)
  const setBranch = useAuthStore((s) => s.setBranch)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const b = await getMyBranch()
        if (mounted) setBranch(b, { persist: true })
        const ok = (b?.business_type || 'retail') === 'restaurant'
        if (mounted) setAllowed(ok)
      } catch {
        if (mounted) setAllowed(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [setBranch, contextVersion])

  useEffect(() => {
    const ok = (branch?.business_type || 'retail') === 'restaurant'
    setAllowed(ok)
  }, [branch?.business_type])

  if (allowed === null) return null
  if (!allowed) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  // 🔍 LOGGING GLOBAL DE ROTEAMENTO
  useEffect(() => {
    console.log('🌐 [APP] App.jsx montado')
    console.log('📍 [APP] URL atual:', window.location.href)
    console.log('🛤️ [APP] Pathname:', window.location.pathname)
    
    // Log quando a rota mudar
    const handleRouteChange = () => {
      console.log('🔄 [APP] Rota mudou para:', window.location.pathname)
      console.log('🌐 [APP] URL completa:', window.location.href)
    }
    
    // Observer para mudanças de URL
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    
    window.history.pushState = function(...args) {
      console.log('🔀 [APP] pushState chamado com:', args)
      const result = originalPushState.apply(this, args)
      handleRouteChange()
      return result
    }
    
    window.history.replaceState = function(...args) {
      console.log('🔀 [APP] replaceState chamado com:', args)
      const result = originalReplaceState.apply(this, args)
      handleRouteChange()
      return result
    }
    
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  return (
    <>
      <ToastHost />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route
            path="/raw-materials"
            element={
              <RestaurantOnlyRoute>
                <RawMaterialsPage />
              </RestaurantOnlyRoute>
            }
          />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/stock/history" element={<StockHistoryPage />} />
          <Route path="/stock/transfer" element={<StockTransferPage />} />
          <Route path="/stock/adjust" element={<StockAdjustmentPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route
            path="/reservations"
            element={
              <RestaurantOnlyRoute>
                <ReservationsPage />
              </RestaurantOnlyRoute>
            }
          />
          <Route path="/pdv" element={<PdvPage />} />
          <Route
            path="/tables"
            element={
              <RestaurantOnlyRoute>
                <TablesPage />
              </RestaurantOnlyRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <RestaurantOnlyRoute>
                <OrdersPage />
              </RestaurantOnlyRoute>
            }
          />
          <Route
            path="/delivery-zones"
            element={
              <RestaurantOnlyRoute>
                <DeliveryZonesPage />
              </RestaurantOnlyRoute>
            }
          />
          <Route path="/reprography/billing" element={<ReprographyBillingPage />} />
          <Route path="/reprography/printers" element={<ReprographyPrintersPage />} />
          <Route path="/reprography/readings" element={<ReprographyReadingsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/establishments" element={<EstablishmentsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
