import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { stockInAPI, locationsAPI, donorsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import SearchInput from '../components/common/SearchInput'
import Pagination from '../components/common/Pagination'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PageLoading, EmptyState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/Badge'
import Table, { TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/common/Table'
import { useForm } from 'react-hook-form'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Textarea from '../components/common/Textarea'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  PackagePlus,
  ArrowRightLeft,
  Calendar,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { useState, useEffect, useMemo } from 'react'

export default function StockIn() {
  const { user, hasRole } = useAuth()
  // Route protection: Only allow master/location inventory managers and admin
  if (!user) return null
  if (!['admin', 'master_inventory_manager', 'location_inventory_manager'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  const [stockItems, setStockItems] = useState([])
  const [locations, setLocations] = useState([])
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [transferModal, setTransferModal] = useState({ open: false, id: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const { success, error: showError } = useToast()
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm()
  const { register: registerTransfer, handleSubmit: handleTransferSubmit, reset: resetTransfer } = useForm()

  const sourceType = watch('sourceType')
  const distributionPolicy = watch('distributionPolicy')

  useEffect(() => {
    fetchStockItems()
    fetchLocations()
    fetchDonors()
  }, [pagination.page, search, sourceFilter])

  const fetchStockItems = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(sourceFilter && { sourceType: sourceFilter }),
      }
      // If location inventory manager, filter by assigned locations
      if (user.role === 'location_inventory_manager' && user.assignedLocations?.length > 0) {
        params.locationId = user.assignedLocations[0] // Only their assigned location (assume one)
      }
      const response = await stockInAPI.getAll(params)
      setStockItems(response.data.data)
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (err) {
      showError('Failed to fetch stock items')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await locationsAPI.getAll({ limit: 100 })
      setLocations(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch locations')
    }
  }

  const fetchDonors = async () => {
    try {
      const response = await donorsAPI.getAll({ limit: 100 })
      setDonors(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch donors')
    }
  }

  const openCreateModal = () => {
    reset({
      productName: '',
      category: '',
      quantity: '',
      unit: 'piece',
      unitPrice: '',
      sourceType: 'donor',
      sourceReference: '',
      companyName: '',
      location: '',
      distributionPolicy: 'flexible',
      controlPrice: '',
      maxDiscount: '',
      eligibilityFrequency: 'unlimited',
      maxQuantityPerBeneficiary: '',
      expiryDate: '',
      batchNumber: '',
      notes: '',
    })
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    setValue('productName', item.product?.name || '')
    setValue('category', item.product?.category || '')
    setValue('quantity', item.quantity || '')
    setValue('unit', item.product?.unit || 'piece')
    setValue('unitPrice', item.pricing?.unitPrice || '')
    setValue('sourceType', item.source?.type || 'donor')
    setValue('sourceReference', item.source?.referenceId || '')
    setValue('companyName', item.source?.companyName || '')
    setValue('location', item.locationId?._id || '')
    setValue('distributionPolicy', item.distributionPolicy?.type || 'flexible')
    setValue('controlPrice', item.distributionPolicy?.controlPrice || '')
    setValue('maxDiscount', item.distributionPolicy?.maxDiscountPercent || '')
    setValue('eligibilityFrequency', item.eligibilityRules?.frequency || 'unlimited')
    setValue('maxQuantityPerBeneficiary', item.eligibilityRules?.maxQuantityPerBeneficiary || '')
    setValue('expiryDate', item.product?.expiryDate?.split('T')[0] || '')
    setValue('batchNumber', item.batchNumber || '')
    setValue('notes', item.notes || '')
    setEditingId(item._id)
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        product: {
          name: data.productName,
          category: data.category,
          unit: data.unit,
          ...(data.expiryDate && { expiryDate: data.expiryDate }),
        },
        quantity: parseInt(data.quantity),
        source: {
          type: data.sourceType,
          ...(data.sourceType === 'donor' && data.sourceReference && { referenceId: data.sourceReference }),
          ...(data.sourceType === 'company' && { companyName: data.companyName }),
        },
        locationId: data.location,
        pricing: {
          unitPrice: parseFloat(data.unitPrice) || 0,
        },
        distributionPolicy: {
          type: data.distributionPolicy,
          ...(data.distributionPolicy === 'control_price' && { controlPrice: parseFloat(data.controlPrice) }),
          ...(data.distributionPolicy === 'flexible' && data.maxDiscount && { maxDiscountPercent: parseFloat(data.maxDiscount) }),
        },
        eligibilityRules: {
          frequency: data.eligibilityFrequency,
          ...(data.maxQuantityPerBeneficiary && { maxQuantityPerBeneficiary: parseInt(data.maxQuantityPerBeneficiary) }),
        },
        ...(data.batchNumber && { batchNumber: data.batchNumber }),
        ...(data.notes && { notes: data.notes }),
      }

      if (editingId) {
        await stockInAPI.update(editingId, payload)
        success('Stock item updated successfully')
      } else {
        await stockInAPI.create(payload)
        success('Stock item created successfully')
      }
      
      setModalOpen(false)
      fetchStockItems()
    } catch (err) {
      showError(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTransfer = async (data) => {
    try {
      setSubmitting(true)
      await stockInAPI.transfer(transferModal.id, {
        toLocation: data.toLocation,
        quantity: parseInt(data.transferQuantity),
      })
      success('Stock transferred successfully')
      setTransferModal({ open: false, id: null })
      resetTransfer()
      fetchStockItems()
    } catch (err) {
      showError(err.response?.data?.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await stockInAPI.delete(deleteDialog.id)
      success('Stock item deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchStockItems()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete')
    }
  }

  const viewStockItem = async (id) => {
    try {
      const response = await stockInAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (err) {
      showError('Failed to fetch stock details')
    }
  }

  // For location inventory manager, only show their assigned location in dropdown
const locationOptions = useMemo(() => {
  const assignedLocationIds = user.assignedLocations?.map(l => l._id || l) || [];
  return user.role === 'location_inventory_manager'
    ? locations
        .filter(loc => assignedLocationIds.includes(loc._id))
        .map(loc => ({ value: loc._id, label: loc.name }))
    : locations.map(loc => ({ value: loc._id, label: loc.name }));
}, [locations, user.assignedLocations, user.role]);

  const donorOptions = donors.map(d => ({
    value: d._id,
    label: d.name,
  }))

  const sourceOptions = [
    { value: 'donor', label: 'Donor' },
    { value: 'company', label: 'Company' },
    { value: 'purchase', label: 'Purchase' },
  ]

  const policyOptions = [
    { value: 'free_only', label: 'Free Only' },
    { value: 'control_price', label: 'Control Price' },
    { value: 'flexible', label: 'Flexible' },
  ]

  const frequencyOptions = [
    { value: 'unlimited', label: 'Unlimited' },
    { value: 'once', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ]

  const unitOptions = [
    { value: 'piece', label: 'Piece' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'liter', label: 'Liter' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'bag', label: 'Bag' },
    { value: 'carton', label: 'Carton' }, 
  ]

  const categoryOptions = [
    { value: 'food', label: 'Food' },
    { value: 'clothes', label: 'Clothes' },
    { value: 'medical', label: 'Medical' },
    { value: 'household', label: 'Household' },
    { value: 'education', label: 'Education' },
    { value: 'other', label: 'Other' },
  ]

  const getPolicyBadge = (policy) => {
    const colors = {
      free_only: 'badge-success',
      control_price: 'badge-warning',
      flexible: 'badge-primary',
    }
    const labels = {
      free_only: 'Free Only',
      control_price: 'Control Price',
      flexible: 'Flexible',
    }
    return (
      <span className={`badge ${colors[policy] || 'badge-gray'}`}>
        {labels[policy] || policy}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Stock In</h1>
          <p className="page-subtitle">Manage incoming inventory from donors, companies, and purchases</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add Stock
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by product name..."
            className="flex-1"
          />
          <Select
            options={sourceOptions}
            placeholder="All Sources"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <PageLoading />
        ) : stockItems.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="No stock items found"
            description="Get started by adding your first stock entry"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                Add Stock
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Policy</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {stockItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Package size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.product?.name}</div>
                          <div className="text-sm text-gray-500">
                            Rs. {(item.pricing?.unitPrice || 0).toLocaleString()} / {item.product?.unit}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="badge badge-gray capitalize">{item.product?.category || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.remainingQuantity || item.quantity}</span>
                        <span className="text-gray-500"> / {item.quantity} {item.product?.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="capitalize">{item.source?.type}</div>
                      {item.source?.type === 'donor' && item.source?.donor && (
                        <div className="text-sm text-gray-500">{item.source.donor.name}</div>
                      )}
                    </TableCell>
                    <TableCell>{item.locationId?.name || 'N/A'}</TableCell>
                    <TableCell>{getPolicyBadge(item.distributionPolicy?.type)}</TableCell>
                    <TableCell>
                      {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewStockItem(item._id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => setTransferModal({ open: true, id: item._id })}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Transfer"
                        >
                          <ArrowRightLeft size={16} className="text-green-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, id: item._id })}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-danger-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            />
          </>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Stock Item' : 'Add Stock Item'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Product Information */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Product Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Product Name *"
                placeholder="Enter product name"
                error={errors.productName?.message}
                {...register('productName', { required: 'Product name is required' })}
              />
              <Select
                label="Category *"
                options={categoryOptions}
                error={errors.category?.message}
                {...register('category', { required: 'Category is required' })}
              />
              <Select
                label="Unit *"
                options={unitOptions}
                error={errors.unit?.message}
                {...register('unit', { required: 'Unit is required' })}
              />
              <Input
                label="Quantity *"
                type="number"
                min="1"
                placeholder="Enter quantity"
                error={errors.quantity?.message}
                {...register('quantity', { required: 'Quantity is required', min: 1 })}
              />
              <Input
                label="Unit Price (Rs.)"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price per unit"
                {...register('unitPrice')}
              />
              <Input
                label="Expiry Date"
                type="date"
                {...register('expiryDate')}
              />
            </div>
          </div>

          {/* Source Information */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Source Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Source Type *"
                options={sourceOptions}
                error={errors.sourceType?.message}
                {...register('sourceType', { required: 'Source type is required' })}
              />
              {sourceType === 'donor' && (
                <Select
                  label="Donor"
                  options={donorOptions}
                  placeholder="Select donor"
                  {...register('sourceReference')}
                />
              )}
              {sourceType === 'company' && (
                <Input
                  label="Company Name"
                  placeholder="Enter company name"
                  {...register('companyName')}
                />
              )}
              <Select
                label="Location *"
                options={locationOptions}
                error={errors.location?.message}
                {...register('location', { required: 'Location is required' })}
              />
            </div>
          </div>

          {/* Distribution Policy */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribution Policy</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Policy Type *"
                options={policyOptions}
                error={errors.distributionPolicy?.message}
                {...register('distributionPolicy', { required: 'Policy is required' })}
              />
              {distributionPolicy === 'control_price' && (
                <Input
                  label="Control Price (Rs.) *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Fixed selling price"
                  {...register('controlPrice', { required: 'Control price is required' })}
                />
              )}
              {distributionPolicy === 'flexible' && (
                <Input
                  label="Max Discount (%)"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Maximum discount allowed"
                  {...register('maxDiscount')}
                />
              )}
            </div>
          </div>

          {/* Eligibility Rules */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Eligibility Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Frequency"
                options={frequencyOptions}
                {...register('eligibilityFrequency')}
              />
              <Input
                label="Max Quantity Per Beneficiary"
                type="number"
                min="1"
                placeholder="Leave empty for unlimited"
                {...register('maxQuantityPerBeneficiary')}
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Batch Number"
                placeholder="Optional batch/lot number"
                {...register('batchNumber')}
              />
            </div>
            <Textarea
              label="Notes"
              placeholder="Additional notes..."
              rows={2}
              className="mt-4"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={transferModal.open}
        onClose={() => {
          setTransferModal({ open: false, id: null })
          resetTransfer()
        }}
        title="Transfer Stock"
        size="md"
      >
        <form onSubmit={handleTransferSubmit(handleTransfer)} className="space-y-4">
          <Select
            label="Destination Location *"
            options={locationOptions}
            placeholder="Select location"
            {...registerTransfer('toLocation', { required: true })}
          />
          <Input
            label="Quantity to Transfer *"
            type="number"
            min="1"
            placeholder="Enter quantity"
            {...registerTransfer('transferQuantity', { required: true, min: 1 })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => {
              setTransferModal({ open: false, id: null })
              resetTransfer()
            }}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Stock Item Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                <Package size={32} className="text-primary-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{viewModal.data.product?.name}</h3>
                <p className="text-gray-500 capitalize">{viewModal.data.product?.category}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">
                  {viewModal.data.remainingQuantity || viewModal.data.quantity} / {viewModal.data.quantity} {viewModal.data.product?.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unit Price</p>
                <p className="font-medium">Rs. {(viewModal.data.pricing?.unitPrice || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source Type</p>
                <p className="font-medium capitalize">{viewModal.data.source?.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{viewModal.data.locationId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Distribution Policy</p>
                {getPolicyBadge(viewModal.data.distributionPolicy?.type)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Eligibility</p>
                <p className="font-medium capitalize">{viewModal.data.eligibilityRules?.frequency || 'Unlimited'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Received Date</p>
                <p className="font-medium">
                  {viewModal.data.createdAt ? format(new Date(viewModal.data.createdAt), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Batch Number</p>
                <p className="font-medium">{viewModal.data.batchNumber || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModal({ open: false, data: null })}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Stock Item"
        message="Are you sure you want to delete this stock item? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
