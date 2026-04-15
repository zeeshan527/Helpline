import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'

// Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Beneficiaries from './pages/Beneficiaries'
import Donors from './pages/Donors'
import Locations from './pages/Locations'
import StockIn from './pages/StockIn'
import ExternalStockIn from './pages/ExternalStockIn'
import ExternalStockOut from './pages/ExternalStockOut'
import StockOut from './pages/StockOut'
import Reports from './pages/Reports'
import FundCategories from './pages/FundCategories'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound'

export default function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />} 
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        
        <Route 
          path="/beneficiaries" 
          element={
            <ProtectedRoute permission="beneficiaries.read">
              <Beneficiaries />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/donors" 
          element={
            <ProtectedRoute permission="donors.read">
              <Donors />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/locations" 
          element={
            <ProtectedRoute permission="locations.read">
              <Locations />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/inventory/stock-in" 
          element={
            <ProtectedRoute permission="stockIn.read">
              <StockIn />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/inventory/external-stock-in" 
          element={
            <ProtectedRoute permission="externalStockIn.read">
              <ExternalStockIn />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/inventory/external-stock-out" 
          element={
            <ProtectedRoute permission="externalStockOut.read">
              <ExternalStockOut />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/inventory/stock-out" 
          element={
            <ProtectedRoute permission="stockOut.read">
              <StockOut />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute permission="reports.read">
              <Reports />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/fund-categories" 
          element={
            <ProtectedRoute role={['admin', 'staff']} permission="fundCategories.read">
              <FundCategories />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/users" 
          element={
            <ProtectedRoute role="admin">
              <Users />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
