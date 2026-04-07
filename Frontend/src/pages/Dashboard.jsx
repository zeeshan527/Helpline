import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import { PageLoading, ErrorState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/Badge'
import {
  Users,
  Heart,
  MapPin,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  DollarSign,
  PackagePlus,
  PackageMinus,
  Activity,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { error: showError } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dashboardAPI.getOverview()
      setData(response.data.data)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard')
      showError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} onRetry={fetchDashboardData} />

  const stats = [
    {
      name: 'Total Beneficiaries',
      value: data?.beneficiaries?.total || 0,
      subtitle: `${data?.beneficiaries?.approved || 0} approved`,
      icon: Users,
      color: 'bg-blue-500',
      link: '/beneficiaries',
    },
    {
      name: 'Active Donors',
      value: data?.donors?.total || 0,
      subtitle: `${data?.donors?.active || 0} active`,
      icon: Heart,
      color: 'bg-pink-500',
      link: '/donors',
    },
    {
      name: 'Locations',
      value: data?.locations?.total || 0,
      subtitle: `${data?.locations?.active || 0} active`,
      icon: MapPin,
      color: 'bg-green-500',
      link: '/locations',
    },
    {
      name: 'Items in Stock',
      value: data?.inventory?.totalRemaining || 0,
      subtitle: `${data?.inventory?.utilizationPercent || 0}% utilized`,
      icon: Package,
      color: 'bg-purple-500',
      link: '/inventory/stock-in',
    },
  ]

  // Process monthly trend for chart
  const monthlyTrendData = (data?.monthlyTrend || []).map(item => ({
    month: item._id,
    distributions: item.distributions,
    quantity: item.quantity,
    revenue: item.revenue
  }))

  // Distribution by type (mock - can be calculated from data)
  const distributionByType = [
    { name: 'Free', value: 45 },
    { name: 'Control Price', value: 30 },
    { name: 'Discounted', value: 25 },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.name} to={stat.link}>
            <Card className="stat-card hover:shadow-md transition-shadow cursor-pointer p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{stat.subtitle}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={24} className="text-white" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-lg flex items-center justify-center">
              <PackagePlus size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Stock Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.inventory?.totalRecords || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-lg flex items-center justify-center">
              <PackageMinus size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Distributions (This Month)</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.distributionsThisMonth?.total || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Revenue (This Month)</p>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {(data?.distributionsThisMonth?.revenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Distribution Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Distribution Trend
          </h3>
          <div className="h-72">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <defs>
                    <linearGradient id="colorDistributions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="distributions"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorDistributions)"
                    name="Distributions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No distribution data available
              </div>
            )}
          </div>
        </Card>

        {/* Distribution by Type */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribution by Type
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {distributionByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
            <Link to="/reports" className="text-primary-600 text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.lowStockAlerts || []).slice(0, 5).map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-warning-50 rounded-lg"
              >
                <AlertTriangle size={18} className="text-warning-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product || 'Item'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {item.remaining || 0} of {item.total || 0} remaining ({item.percentRemaining}%)
                  </p>
                  {item.location && (
                    <p className="text-xs text-gray-500">{item.location}</p>
                  )}
                </div>
              </div>
            ))}
            {(!data?.lowStockAlerts || data.lowStockAlerts.length === 0) && (
              <div className="text-center py-8">
                <Package size={40} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No low stock alerts</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Link to="/reports" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.recentActivity || []).slice(0, 8).map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.action === 'create' ? 'bg-success-100 text-success-600' :
                  activity.action === 'update' ? 'bg-blue-100 text-blue-600' :
                  activity.action === 'delete' ? 'bg-danger-100 text-danger-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <Activity size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {activity.performedBy || 'System'}
                    </span>
                    {activity.location && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{activity.location}</span>
                      </>
                    )}
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {activity.createdAt 
                        ? format(new Date(activity.createdAt), 'MMM dd, HH:mm')
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  activity.module === 'beneficiary' ? 'bg-blue-100 text-blue-700' :
                  activity.module === 'stock_in' ? 'bg-green-100 text-green-700' :
                  activity.module === 'stock_out' ? 'bg-yellow-100 text-yellow-700' :
                  activity.module === 'donor' ? 'bg-pink-100 text-pink-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {activity.module}
                </span>
              </div>
            ))}
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <div className="text-center py-8">
                <Activity size={40} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Beneficiaries by Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Beneficiaries Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{data?.beneficiaries?.total || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Total</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{data?.beneficiaries?.pending || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{data?.beneficiaries?.approved || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Approved</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{data?.beneficiaries?.rejected || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Rejected</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
