import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { Plus, Eye, PackageMinus, XCircle, User, Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { externalStockOutAPI, externalStockInAPI, beneficiariesAPI } from '../services/api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import SearchInput from '../components/common/SearchInput'
import Pagination from '../components/common/Pagination'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PageLoading, EmptyState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/Badge'
import Table, {
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '../components/common/Table'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Textarea from '../components/common/Textarea'

const roleAccess = ['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager']

export default function ExternalStockOut() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()

  const [items, setItems] = useState([])
  const [packages, setPackages] = useState([])
  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [beneficiaryFilter, setBeneficiaryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm()

  const watchedPackageId = watch('externalStockInId')

  const getPackageAvailableQuantity = useCallback((item) => {
    const baseQuantity = item.remainingQuantity ?? item.quantity ?? 0

    if (
      editingRecord &&
      String(item._id) === String(editingRecord.externalStockInId?._id || editingRecord.externalStockInId)
    ) {
      return baseQuantity + (editingRecord.quantity || 0)
    }

    return baseQuantity
  }, [editingRecord])

  const packageOptions = useMemo(() => packages
    .map((item) => {
      const availableQuantity = getPackageAvailableQuantity(item)
      const isCurrentSource = Boolean(
        editingRecord &&
        String(item._id) === String(editingRecord.externalStockInId?._id || editingRecord.externalStockInId)
      )

      return {
        value: item._id,
        label: `${item.packageName} (${availableQuantity} available)`,
        availableQuantity,
        isCurrentSource,
      }
    })
    .filter((item) => (editingRecord ? item.availableQuantity > 0 || item.isCurrentSource : item.availableQuantity > 0)), [packages, getPackageAvailableQuantity, editingRecord])

  const beneficiaryOptions = useMemo(() => beneficiaries.map((beneficiary) => ({
    value: beneficiary._id,
    label: beneficiary.basicInfo?.headOfFamilyName || beneficiary.name || 'Beneficiary',
  })), [beneficiaries])

  const locationManagerAssignedIds = useMemo(() => {
    return (user?.assignedLocations || []).map((location) => location._id || location)
  }, [user?.assignedLocations])

  const selectedPackage = useMemo(
    () => packages.find((item) => item._id === watchedPackageId),
    [packages, watchedPackageId],
  )

  const selectedPackageAvailableQuantity = useMemo(() => {
    if (!selectedPackage) {
      return 0
    }

    return getPackageAvailableQuantity(selectedPackage)
  }, [selectedPackage, getPackageAvailableQuantity])

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await externalStockOutAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(beneficiaryFilter && { beneficiaryId: beneficiaryFilter }),
      })
      setItems(response.data.data || [])
      setPagination((previous) => ({
        ...previous,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (error) {
      showError('Failed to fetch external stock distributions')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, beneficiaryFilter, showError])

  const fetchPackages = useCallback(async () => {
    try {
      const response = await externalStockInAPI.getAll({ limit: 200 })
      setPackages(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch external stock packages')
    }
  }, [])

  const fetchBeneficiaries = useCallback(async () => {
    try {
      const response = await beneficiariesAPI.getAll({ limit: 500 })
      setBeneficiaries(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch beneficiaries')
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetchPackages()
    fetchBeneficiaries()
  }, [fetchPackages, fetchBeneficiaries])

  useEffect(() => {
    setPagination((previous) => ({ ...previous, page: 1 }))
  }, [search, beneficiaryFilter])

  const openCreateModal = () => {
    setEditingId(null)
    setEditingRecord(null)
    reset({
      externalStockInId: '',
      beneficiaryId: '',
      quantity: '',
      notes: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingId(item._id)
    setEditingRecord(item)
    setValue('externalStockInId', item.externalStockInId?._id || item.externalStockInId || '')
    setValue('beneficiaryId', item.beneficiaryId?._id || item.beneficiaryId || '')
    setValue('quantity', item.quantity || '')
    setValue('notes', item.notes || '')
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        externalStockInId: data.externalStockInId,
        beneficiaryId: data.beneficiaryId,
        quantity: parseInt(data.quantity, 10),
        ...(data.notes && { notes: data.notes }),
      }

      if (editingId) {
        await externalStockOutAPI.update(editingId, payload)
        success('External stock distribution updated successfully')
      } else {
        await externalStockOutAPI.create(payload)
        success('External stock distributed successfully')
      }

      setModalOpen(false)
      setEditingRecord(null)
      fetchItems()
      fetchPackages()
    } catch (error) {
      showError(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await externalStockOutAPI.delete(deleteDialog.id)
      success('External stock distribution deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchItems()
      fetchPackages()
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete')
    }
  }

  const viewItem = async (id) => {
    try {
      const response = await externalStockOutAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (error) {
      showError('Failed to fetch distribution details')
    }
  }

  if (!user) return null
  if (!roleAccess.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">External Stock Out</h1>
          <p className="page-subtitle">Distribute external packages to beneficiaries</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          New Distribution
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by package or beneficiary..."
            className="flex-1"
          />
          <Select
            options={beneficiaryOptions}
            placeholder="All Beneficiaries"
            value={beneficiaryFilter}
            onChange={(event) => setBeneficiaryFilter(event.target.value)}
            className="w-full sm:w-64"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <PageLoading />
        ) : items.length === 0 ? (
          <EmptyState
            icon={PackageMinus}
            title="No distributions found"
            description="Start distributing external stock to beneficiaries"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                New Distribution
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Package</TableHeaderCell>
                  <TableHeaderCell>Beneficiary</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center">
                          <Package size={20} className="text-warning-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.packageName || item.externalStockInId?.packageName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            External package distribution
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span>
                          {item.beneficiaryId?.basicInfo?.headOfFamilyName || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.locationId?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status || 'completed'} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewItem(item._id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye size={16} className="text-gray-600" />
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
              onPageChange={(page) => setPagination((previous) => ({ ...previous, page }))}
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Distribution' : 'New Distribution'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Package Name *"
            options={packageOptions}
            placeholder="Select package"
            error={errors.externalStockInId?.message}
            {...register('externalStockInId', { required: 'Package is required' })}
          />

          {selectedPackage && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Available: </span>
                  <span className="font-medium">
                    {selectedPackageAvailableQuantity}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Location: </span>
                  <span className="font-medium">{selectedPackage.locationId?.name || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <Select
            label="Beneficiary *"
            options={beneficiaryOptions}
            placeholder="Select beneficiary"
            error={errors.beneficiaryId?.message}
            {...register('beneficiaryId', { required: 'Beneficiary is required' })}
          />

          <Input
            label="Quantity *"
            type="number"
            min="1"
            max={selectedPackageAvailableQuantity || 999999}
            placeholder="Enter quantity"
            error={errors.quantity?.message}
            {...register('quantity', {
              required: 'Quantity is required',
              min: { value: 1, message: 'Minimum 1' },
              max: {
                value: selectedPackageAvailableQuantity || 999999,
                message: 'Exceeds available quantity',
              },
            })}
          />

          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            rows={2}
            {...register('notes')}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Update' : 'Distribute'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Distribution Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-warning-50 rounded-xl flex items-center justify-center">
                <PackageMinus size={32} className="text-warning-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {viewModal.data.packageName || viewModal.data.externalStockInId?.packageName || 'N/A'}
                </h3>
                <p className="text-gray-500">
                  Distribution to {viewModal.data.beneficiaryId?.basicInfo?.headOfFamilyName || 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Beneficiary</p>
                <p className="font-medium">{viewModal.data.beneficiaryId?.basicInfo?.headOfFamilyName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CNIC</p>
                <p className="font-medium">{viewModal.data.beneficiaryId?.basicInfo?.cnic || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">{viewModal.data.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{viewModal.data.locationId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {viewModal.data.createdAt
                    ? format(new Date(viewModal.data.createdAt), 'MMM dd, yyyy hh:mm a')
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewModal.data.status || 'completed'} />
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="font-medium">{viewModal.data.notes || 'N/A'}</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setViewModal({ open: false, data: null })}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Distribution"
        message="Are you sure you want to delete this external stock distribution? This will return the stock to the source package."
        confirmText="Delete"
      />
    </div>
  )
}
