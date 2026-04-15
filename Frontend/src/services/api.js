import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
}

// Users API (Admin only)
export const usersAPI = {
  getAll: (params) => api.get('/auth/users', { params }),
  getById: (id) => api.get(`/auth/users/${id}`),
  create: (data) => api.post('/auth/users', data),
  update: (id, data) => api.put(`/auth/users/${id}`, data),
  delete: (id) => api.delete(`/auth/users/${id}`),
}

// Beneficiaries API
export const beneficiariesAPI = {
  getAll: (params) => api.get('/beneficiaries', { params }),
  getById: (id) => api.get(`/beneficiaries/${id}`),
  create: (data) => api.post('/beneficiaries', data),
  update: (id, data) => api.put(`/beneficiaries/${id}`, data),
  delete: (id) => api.delete(`/beneficiaries/${id}`),
  updateStatus: (id, status) => api.patch(`/beneficiaries/${id}/status`, { status }),
  getHistory: (id, params) => api.get(`/beneficiaries/${id}/history`, { params }),
  getStats: () => api.get('/beneficiaries/stats/overview'),
}

// Donors API
export const donorsAPI = {
  getAll: (params) => api.get('/donors', { params }),
  getById: (id) => api.get(`/donors/${id}`),
  create: (data) => api.post('/donors', data),
  update: (id, data) => api.put(`/donors/${id}`, data),
  delete: (id) => api.delete(`/donors/${id}`),
  getDonations: (id, params) => api.get(`/donors/${id}/donations`, { params }),
  getStats: () => api.get('/donors/stats/overview'),
}

// Locations API
export const locationsAPI = {
  getAll: (params) => api.get('/locations', { params }),
  getTree: () => api.get('/locations/tree'),
  getById: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  getInventory: (id, params) => api.get(`/locations/${id}/inventory`, { params }),
}

// Stock In API
export const stockInAPI = {
  getAll: (params) => api.get('/stock-in', { params }),
  getById: (id) => api.get(`/stock-in/${id}`),
  create: (data) => api.post('/stock-in', data),
  update: (id, data) => api.put(`/stock-in/${id}`, data),
  delete: (id) => api.delete(`/stock-in/${id}`),
  transfer: (id, data) => api.post(`/stock-in/${id}/transfer`, data),
  getStats: () => api.get('/stock-in/stats'),
  getCategories: () => api.get('/stock-in/categories'),
}

// External Stock In API
export const externalStockInAPI = {
  getAll: (params) => api.get('/external-stock-in', { params }),
  getById: (id) => api.get(`/external-stock-in/${id}`),
  create: (data) => api.post('/external-stock-in', data),
  update: (id, data) => api.put(`/external-stock-in/${id}`, data),
  delete: (id) => api.delete(`/external-stock-in/${id}`),
  transfer: (data) => api.post('/external-stock-in/transfer', data),
}

// External Stock Out API
export const externalStockOutAPI = {
  getAll: (params) => api.get('/external-stock-out', { params }),
  getById: (id) => api.get(`/external-stock-out/${id}`),
  create: (data) => api.post('/external-stock-out', data),
  update: (id, data) => api.put(`/external-stock-out/${id}`, data),
  delete: (id) => api.delete(`/external-stock-out/${id}`),
}

// Stock Out API
export const stockOutAPI = {
  getAll: (params) => api.get('/stock-out', { params }),
  getById: (id) => api.get(`/stock-out/${id}`),
  create: (data) => api.post('/stock-out', data),
  cancel: (id, reason) => api.patch(`/stock-out/${id}/cancel`, { reason }),
  getStats: () => api.get('/stock-out/stats/overview'),
}

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard'),
  getQuickStats: () => api.get('/dashboard/quick-stats'),
  getDistributionChart: (params) => api.get('/dashboard/distribution-chart', { params }),
  getTopItems: (params) => api.get('/dashboard/top-items', { params }),
}

// Reports API
export const reportsAPI = {
  getBeneficiaryReport: (id) => api.get(`/reports/beneficiary/${id}`),
  getDonorReport: (id) => api.get(`/reports/donor/${id}`),
  getLocationReport: (id) => api.get(`/reports/location/${id}`),
  getStockInReport: (params) => api.get('/reports/stock-in', { params }),
  getStockOutReport: (params) => api.get('/reports/stock-out', { params }),
  getFinancialReport: (params) => api.get('/reports/financial', { params }),
  getLowStockReport: (params) => api.get('/reports/low-stock', { params }),
  getComplianceReport: (params) => api.get('/reports/compliance', { params }),
}

// Fund Categories API (Admin and Staff only)
export const fundCategoriesAPI = {
  getAll: (params) => api.get('/fund-categories', { params }),
  getById: (id) => api.get(`/fund-categories/${id}`),
  create: (data) => api.post('/fund-categories', data),
  update: (id, data) => api.put(`/fund-categories/${id}`, data),
  delete: (id) => api.delete(`/fund-categories/${id}`),
  getSubcategories: (categoryId, params) => api.get(`/fund-categories/${categoryId}/subcategories`, { params }),
  createSubcategory: (categoryId, data) => api.post(`/fund-categories/${categoryId}/subcategories`, data),
  updateSubcategory: (id, data) => api.put(`/fund-categories/subcategories/${id}`, data),
  deleteSubcategory: (id) => api.delete(`/fund-categories/subcategories/${id}`),
}

// Combined API object for convenience
api.auth = authAPI
api.users = usersAPI
api.beneficiaries = beneficiariesAPI
api.donors = donorsAPI
api.locations = locationsAPI
api.stockIn = stockInAPI
api.externalStockIn = externalStockInAPI
api.externalStockOut = externalStockOutAPI
api.stockOut = stockOutAPI
api.dashboard = dashboardAPI
api.reports = reportsAPI
api.fundCategories = fundCategoriesAPI

export default api
