import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.getMe()
      setUser(response.data.data)
      setIsAuthenticated(true)
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password })
    const { token, user: userData } = response.data.data
    
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    
    setUser(userData)
    setIsAuthenticated(true)
    
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setIsAuthenticated(false)
  }

  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'admin') return true
    
    // Handle permission string like "beneficiaries.create"
    if (!user.permissions) return false
    
    // If permissions is an array (string array format)
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(permission)
    }
    
    // If permissions is an object (nested object format)
    // e.g., { beneficiaries: { create: true, read: true } }
    const [module, action] = permission.split('.')
    if (module && action) {
      return user.permissions[module]?.[action] === true
    }
    
    // Check if module-level permission exists
    return !!user.permissions[permission]
  }

  const hasRole = (role) => {
    if (!user) return false
    if (Array.isArray(role)) {
      return role.includes(user.role)
    }
    return user.role === role
  }

  const isAdmin = () => user?.role === 'admin'

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    isAdmin,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
