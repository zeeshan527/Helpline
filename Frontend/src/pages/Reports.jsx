import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { reportsAPI, beneficiariesAPI, donorsAPI, locationsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Select from '../components/common/Select'
import Input from '../components/common/Input'
import { PageLoading, EmptyState } from '../components/common/LoadingState'
import Table, { TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/common/Table'
import {
  FileBarChart,
  Download,
  User,
  Heart,
  MapPin,
  PackagePlus,
  PackageMinus,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

const reportTypes = [
  { value: 'beneficiary', label: 'Beneficiary Report', icon: User, description: 'Track items received by beneficiaries' },
  { value: 'donor', label: 'Donor Compliance Report', icon: Heart, description: 'Ensure donor policy compliance' },
  { value: 'location', label: 'Location Report', icon: MapPin, description: 'Inventory by location' },
  { value: 'stock-in', label: 'Stock In Report', icon: PackagePlus, description: 'Total stock received' },
  { value: 'stock-out', label: 'Stock Out Report', icon: PackageMinus, description: 'Items distributed' },
  { value: 'financial', label: 'Financial Report', icon: DollarSign, description: 'Revenue and discounts' },
  { value: 'low-stock', label: 'Low Stock Alert', icon: AlertTriangle, description: 'Items below threshold' },
  { value: 'compliance', label: 'Compliance Report', icon: ShieldCheck, description: 'Policy violations' },
]

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedReport, setSelectedReport] = useState(searchParams.get('type') || '')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    beneficiaryId: '',
    donorId: '',
    locationId: '',
    threshold: 10,
  })
  const [beneficiaries, setBeneficiaries] = useState([])
  const [donors, setDonors] = useState([])
  const [locations, setLocations] = useState([])
  
  const { error: showError } = useToast()

  useEffect(() => {
    fetchDropdownData()
  }, [])

  useEffect(() => {
    if (selectedReport) {
      setSearchParams({ type: selectedReport })
    }
  }, [selectedReport])

  const fetchDropdownData = async () => {
    try {
      const [beneficiariesRes, donorsRes, locationsRes] = await Promise.all([
        beneficiariesAPI.getAll({ limit: 100 }),
        donorsAPI.getAll({ limit: 100 }),
        locationsAPI.getAll({ limit: 100 }),
      ])
      console.log('Beneficiaries:', beneficiariesRes.data.data)
      setBeneficiaries(beneficiariesRes.data.data || [])
      setDonors(donorsRes.data.data || [])
      setLocations(locationsRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch dropdown data')
    }
  }

  const generateReport = async () => {
    if (!selectedReport) return

    setLoading(true)
    try {
      let response
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      }

      switch (selectedReport) {
        case 'beneficiary':
          if (!filters.beneficiaryId) {
            showError('Please select a beneficiary')
            setLoading(false)
            return
          }
          response = await reportsAPI.getBeneficiaryReport(filters.beneficiaryId)
          break
        case 'donor':
          if (!filters.donorId) {
            showError('Please select a donor')
            setLoading(false)
            return
          }
          response = await reportsAPI.getDonorReport(filters.donorId)
          break
        case 'location':
          if (!filters.locationId) {
            showError('Please select a location')
            setLoading(false)
            return
          }
          response = await reportsAPI.getLocationReport(filters.locationId)
          break
        case 'stock-in':
          response = await reportsAPI.getStockInReport(params)
          break
        case 'stock-out':
          response = await reportsAPI.getStockOutReport(params)
          break
        case 'financial':
          response = await reportsAPI.getFinancialReport(params)
          break
        case 'low-stock':
          response = await reportsAPI.getLowStockReport({ threshold: filters.threshold })
          break
        case 'compliance':
          response = await reportsAPI.getComplianceReport(params)
          break
        default:
          showError('Invalid report type')
          setLoading(false)
          return
      }

      setReportData(response.data.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!reportData) return
    
    // Convert to CSV
    let csv = ''
    if (Array.isArray(reportData)) {
      const headers = Object.keys(reportData[0] || {})
      csv = headers.join(',') + '\n'
      reportData.forEach(row => {
        csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n'
      })
    } else {
      csv = JSON.stringify(reportData, null, 2)
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedReport}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const renderFilters = () => {
    switch (selectedReport) {
      case 'beneficiary':
        return (
          <Select
            label="Beneficiary *"
            options={beneficiaries.map(b => ({ value: b._id, label: `${b?.basicInfo?.headOfFamilyName} (${b?.basicInfo?.cnic})` }))}
            placeholder="Select beneficiary"
            value={filters.beneficiaryId}
            onChange={(e) => setFilters(prev => ({ ...prev, beneficiaryId: e.target.value }))}
          />
        )
      case 'donor':
        return (
          <Select
            label="Donor *"
            options={donors.map(d => ({ value: d._id, label: d.name }))}
            placeholder="Select donor"
            value={filters.donorId}
            onChange={(e) => setFilters(prev => ({ ...prev, donorId: e.target.value }))}
          />
        )
      case 'location':
        return (
          <Select
            label="Location *"
            options={locations.map(l => ({ value: l._id, label: l.name }))}
            placeholder="Select location"
            value={filters.locationId}
            onChange={(e) => setFilters(prev => ({ ...prev, locationId: e.target.value }))}
          />
        )
      case 'low-stock':
        return (
          <Input
            label="Stock Threshold"
            type="number"
            min="1"
            value={filters.threshold}
            onChange={(e) => setFilters(prev => ({ ...prev, threshold: e.target.value }))}
          />
        )
      default:
        return null
    }
  }

  const renderReportContent = () => {
    if (!reportData) return null

    switch (selectedReport) {
      case 'beneficiary':
        return <BeneficiaryReportView data={reportData} />
      case 'donor':
        return <DonorReportView data={reportData} />
      case 'location':
        return <LocationReportView data={reportData} />
      case 'stock-in':
        return <StockInReportView data={reportData} />
      case 'stock-out':
        return <StockOutReportView data={reportData} />
      case 'financial':
        return <FinancialReportView data={reportData} />
      case 'low-stock':
        return <LowStockReportView data={reportData} />
      case 'compliance':
        return <ComplianceReportView data={reportData} />
      default:
        return <pre className="p-4 bg-gray-100 rounded overflow-auto">{JSON.stringify(reportData, null, 2)}</pre>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and export detailed reports</p>
        </div>
        {reportData && (
          <Button icon={Download} variant="secondary" onClick={exportReport}>
            Export CSV
          </Button>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon
          return (
            <button
              key={report.value}
              onClick={() => {
                setSelectedReport(report.value)
                setReportData(null)
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedReport === report.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                selectedReport === report.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">{report.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{report.description}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      {selectedReport && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderFilters()}
            {!['beneficiary', 'donor', 'location', 'low-stock'].includes(selectedReport) && (
              <>
                <Input
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button icon={RefreshCw} onClick={generateReport} loading={loading}>
              Generate Report
            </Button>
          </div>
        </Card>
      )}

      {/* Report Results */}
      {loading ? (
        <PageLoading />
      ) : selectedReport && !reportData ? (
        <Card className="p-12">
          <EmptyState
            icon={FileBarChart}
            title="No report generated"
            description="Select filters and click 'Generate Report' to view results"
          />
        </Card>
      ) : (
        reportData && (
          <Card className="p-6">
            {renderReportContent()}
          </Card>
        )
      )}
    </div>
  )
}

// Report view components
function BeneficiaryReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <User size={32} className="text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{data.beneficiary?.name || 'Beneficiary'}</h3>
          <p className="text-gray-500">{data.beneficiary?.cnic}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">{data.summary?.totalItems || 0}</p>
          <p className="text-sm text-gray-500">Items Received</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">{data.summary?.freeItems || 0}</p>
          <p className="text-sm text-gray-500">Free Items</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">
            Rs. {(data.summary?.totalPaid || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Paid</p>
        </div>
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Quantity</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Date</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.distributions || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.product?.name || 'N/A'}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell className="capitalize">{item.distributionMode}</TableCell>
              <TableCell>Rs. {(item.priceApplied || 0).toLocaleString()}</TableCell>
              <TableCell>{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DonorReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
          <Heart size={32} className="text-pink-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{data.donor?.name || 'Donor'}</h3>
          <p className="text-gray-500 capitalize">{data.donor?.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">{data.summary?.totalDonations || 0}</p>
          <p className="text-sm text-gray-500">Total Donations</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">{data.summary?.beneficiariesServed || 0}</p>
          <p className="text-sm text-gray-500">Beneficiaries Served</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">{data.summary?.locationsUsed || 0}</p>
          <p className="text-sm text-gray-500">Locations Used</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className={`text-2xl font-bold ${data.summary?.violations > 0 ? 'text-danger-600' : 'text-success-600'}`}>
            {data.summary?.violations || 0}
          </p>
          <p className="text-sm text-gray-500">Violations</p>
        </div>
      </div>

      {data.summary?.violations > 0 && (
        <div className="p-4 bg-danger-50 rounded-lg border border-danger-200">
          <div className="flex items-center gap-2 text-danger-700 mb-2">
            <AlertTriangle size={18} />
            <span className="font-semibold">Policy Violations Detected</span>
          </div>
          <p className="text-sm text-danger-600">
            Some distributions violated the donor's specified distribution policy.
          </p>
        </div>
      )}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Quantity</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Policy</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.donations || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.product?.name || 'N/A'}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.location || 'N/A'}</TableCell>
              <TableCell className="capitalize">{item.policy}</TableCell>
              <TableCell>
                <span className={`badge ${item.compliant ? 'badge-success' : 'badge-danger'}`}>
                  {item.compliant ? 'Compliant' : 'Violation'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LocationReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <MapPin size={32} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{data.location?.name || 'Location'}</h3>
          <p className="text-gray-500 capitalize">{data.location?.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">{data.summary?.totalStock || 0}</p>
          <p className="text-sm text-gray-500">Total Stock</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">{data.summary?.stockIn || 0}</p>
          <p className="text-sm text-gray-500">Stock In</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">{data.summary?.stockOut || 0}</p>
          <p className="text-sm text-gray-500">Stock Out</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">{data.summary?.beneficiariesServed || 0}</p>
          <p className="text-sm text-gray-500">Beneficiaries</p>
        </div>
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>In Stock</TableHeaderCell>
            <TableHeaderCell>Distributed</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.inventory || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.name || 'N/A'}</TableCell>
              <TableCell className="capitalize">{item.category}</TableCell>
              <TableCell>{item.inStock}</TableCell>
              <TableCell>{item.distributed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StockInReportView({ data }) {
  const chartData = data.byCategory || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-primary-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">{data.summary?.totalItems || 0}</p>
          <p className="text-sm text-gray-500">Total Items</p>
        </div>
        <div className="text-center p-4 bg-success-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">{data.summary?.totalQuantity || 0}</p>
          <p className="text-sm text-gray-500">Total Quantity</p>
        </div>
        <div className="text-center p-4 bg-warning-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">
            Rs. {(data.summary?.totalValue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Value</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Quantity</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.items || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.product || 'N/A'}</TableCell>
              <TableCell className="capitalize">{item.category}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell className="capitalize">{item.source}</TableCell>
              <TableCell>{item.location}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StockOutReportView({ data }) {
  const chartData = data.byMode || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-primary-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">{data.summary?.totalDistributions || 0}</p>
          <p className="text-sm text-gray-500">Distributions</p>
        </div>
        <div className="text-center p-4 bg-success-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">{data.summary?.beneficiariesServed || 0}</p>
          <p className="text-sm text-gray-500">Beneficiaries</p>
        </div>
        <div className="text-center p-4 bg-warning-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">{data.summary?.totalQuantity || 0}</p>
          <p className="text-sm text-gray-500">Items Distributed</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">
            Rs. {(data.summary?.revenue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Revenue</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Beneficiary</TableHeaderCell>
            <TableHeaderCell>Quantity</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.distributions || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.product || 'N/A'}</TableCell>
              <TableCell>{item.beneficiary}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell className="capitalize">{item.mode}</TableCell>
              <TableCell>Rs. {(item.amount || 0).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FinancialReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-success-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">
            Rs. {(data.summary?.totalRevenue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
        <div className="text-center p-4 bg-primary-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">
            Rs. {(data.summary?.controlPriceRevenue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Control Price Sales</p>
        </div>
        <div className="text-center p-4 bg-warning-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">
            Rs. {(data.summary?.discountsGiven || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Discounts Given</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-600">
            Rs. {(data.summary?.freeDistributionValue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Free Distribution Value</p>
        </div>
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.transactions || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="capitalize">{item.type}</TableCell>
              <TableCell className={item.type === 'revenue' ? 'text-success-600' : 'text-warning-600'}>
                Rs. {(item.amount || 0).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LowStockReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
        <div className="flex items-center gap-2 text-warning-700 mb-2">
          <AlertTriangle size={18} />
          <span className="font-semibold">Low Stock Alert</span>
        </div>
        <p className="text-sm text-warning-600">
          {data.items?.length || 0} items are below the stock threshold
        </p>
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Remaining</TableHeaderCell>
            <TableHeaderCell>Threshold</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {(data.items || []).map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.product || 'N/A'}</TableCell>
              <TableCell className="capitalize">{item.category}</TableCell>
              <TableCell>{item.location}</TableCell>
              <TableCell className="text-danger-600 font-medium">{item.remaining}</TableCell>
              <TableCell>{item.threshold}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ComplianceReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-success-50 rounded-lg">
          <p className="text-2xl font-bold text-success-600">{data.summary?.compliant || 0}</p>
          <p className="text-sm text-gray-500">Compliant</p>
        </div>
        <div className="text-center p-4 bg-danger-50 rounded-lg">
          <p className="text-2xl font-bold text-danger-600">{data.summary?.violations || 0}</p>
          <p className="text-sm text-gray-500">Violations</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-600">
            {data.summary?.complianceRate ? `${data.summary.complianceRate}%` : 'N/A'}
          </p>
          <p className="text-sm text-gray-500">Compliance Rate</p>
        </div>
      </div>

      {data.violations?.length > 0 && (
        <>
          <h4 className="font-semibold text-gray-700">Violations</h4>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>Donor</TableHeaderCell>
                <TableHeaderCell>Expected Policy</TableHeaderCell>
                <TableHeaderCell>Actual Mode</TableHeaderCell>
                <TableHeaderCell>Reason</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {data.violations.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                  <TableCell>{item.product || 'N/A'}</TableCell>
                  <TableCell>{item.donor}</TableCell>
                  <TableCell className="capitalize">{item.expectedPolicy}</TableCell>
                  <TableCell className="capitalize">{item.actualMode}</TableCell>
                  <TableCell className="text-danger-600">{item.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
