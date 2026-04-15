import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { Plus, Edit2, Trash2, PackagePlus, HeartHandshake, Eye, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { externalStockInAPI, donorsAPI, locationsAPI } from '../services/api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import SearchInput from '../components/common/SearchInput'
import Pagination from '../components/common/Pagination'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PageLoading, EmptyState } from '../components/common/LoadingState'
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

export default function ExternalStockIn() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()

  const [items, setItems] = useState([])
  const [donors, setDonors] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [donorFilter, setDonorFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [transferModal, setTransferModal] = useState({ open: false, item: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm()

  const {
    register: registerTransfer,
    handleSubmit: handleTransferSubmit,
    reset: resetTransfer,
  } = useForm()

  const isLocationInventoryManager = user?.role === 'location_inventory_manager'

  const locationOptions = useMemo(() => {
    const assignedLocationIds = user?.assignedLocations?.map((location) => location._id || location) || []
    const filteredLocations = isLocationInventoryManager
      ? locations.filter((location) => assignedLocationIds.includes(location._id))
      : locations

    return filteredLocations.map((location) => ({
      value: location._id,
      label: location.name,
    }))
  }, [isLocationInventoryManager, locations, user?.assignedLocations])

  const donorOptions = useMemo(
    () => donors.map((donor) => ({ value: donor._id, label: donor.name })),
    [donors],
  )

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(donorFilter && { donorId: donorFilter }),
        ...(locationFilter && { locationId: locationFilter }),
      }

      const response = await externalStockInAPI.getAll(params)
      setItems(response.data.data || [])
      setPagination((previous) => ({
        ...previous,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (error) {
      showError('Failed to fetch external stock records')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, donorFilter, locationFilter, showError])

  const fetchDonors = useCallback(async () => {
    try {
      const response = await donorsAPI.getAll({ limit: 100 })
      setDonors(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch donors')
    }
  }, [])

  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsAPI.getAll({ limit: 100 })
      setLocations(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch locations')
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetchDonors()
    fetchLocations()
  }, [fetchDonors, fetchLocations])

  useEffect(() => {
    setPagination((previous) => ({ ...previous, page: 1 }))
  }, [search, donorFilter, locationFilter])

  const openCreateModal = () => {
    setEditingId(null)
    reset({
      packageName: '',
      quantity: '',
      donorId: '',
      locationId: '',
      notes: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingId(item._id)
    setValue('packageName', item.packageName || '')
    setValue('quantity', item.quantity || '')
    setValue('donorId', item.donorId?._id || item.donorId || '')
    setValue('locationId', item.locationId?._id || item.locationId || '')
    setValue('notes', item.notes || '')
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        packageName: data.packageName,
        quantity: parseInt(data.quantity, 10),
        donorId: data.donorId,
        locationId: data.locationId,
        ...(data.notes && { notes: data.notes }),
      }

      if (editingId) {
        await externalStockInAPI.update(editingId, payload)
        success('External stock updated successfully')
      } else {
        await externalStockInAPI.create(payload)
        success('External stock added successfully')
      }

      setModalOpen(false)
      fetchItems()
    } catch (error) {
      showError(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await externalStockInAPI.delete(deleteDialog.id)
      success('External stock deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchItems()
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete')
    }
  }

  const viewItem = async (id) => {
    try {
      const response = await externalStockInAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (error) {
      showError('Failed to fetch external stock details')
    }
  }

  const openTransferModal = (item) => {
    setTransferModal({ open: true, item })
    resetTransfer({
      toLocationId: '',
      quantity: '',
      notes: '',
    })
  }

  const closeTransferModal = () => {
    setTransferModal({ open: false, item: null })
    resetTransfer()
  }

  const handleTransfer = async (data) => {
    try {
      setSubmitting(true)
      await externalStockInAPI.transfer({
        externalStockInId: transferModal.item?._id,
        toLocationId: data.toLocationId,
        quantity: parseInt(data.quantity, 10),
        ...(data.notes && { notes: data.notes }),
      })
      success('External stock transferred successfully')
      closeTransferModal()
      fetchItems()
    } catch (error) {
      showError(error.response?.data?.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
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
          <h1 className="page-title">External Stock In</h1>
          <p className="page-subtitle">
            Manage external package stock entries across donors and locations
          </p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add External Stock
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by package name..."
            className="lg:col-span-1"
          />
          <Select
            options={donorOptions}
            placeholder="All Donors"
            value={donorFilter}
            onChange={(event) => setDonorFilter(event.target.value)}
          />
          <Select
            options={locationOptions}
            placeholder="All Locations"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <PageLoading />
        ) : items.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="No external stock found"
            description="Create your first external stock package to get started"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                Add External Stock
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Package</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Donor</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <PackagePlus size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.packageName}</div>
                          <div className="text-sm text-gray-500">External package entry</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {item.remainingQuantity ?? item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-700">
                        <HeartHandshake size={16} className="text-primary-600" />
                        <span>{item.donorId?.name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.locationId?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A'}
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
                          onClick={() => openTransferModal(item)}
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
              onPageChange={(page) => setPagination((previous) => ({ ...previous, page }))}
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit External Stock' : 'Add External Stock'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Package Name *"
            placeholder="Enter package name"
            error={errors.packageName?.message}
            {...register('packageName', {
              required: 'Package name is required',
            })}
          />
          <Input
            label="Quantity *"
            type="number"
            min="1"
            placeholder="Enter quantity"
            error={errors.quantity?.message}
            {...register('quantity', {
              required: 'Quantity is required',
              min: {
                value: 1,
                message: 'Quantity must be at least 1',
              },
            })}
          />
          <Select
            label="Donor *"
            options={donorOptions}
            placeholder="Select donor"
            error={errors.donorId?.message}
            {...register('donorId', {
              required: 'Donor is required',
            })}
          />
          <Select
            label="Location *"
            options={locationOptions}
            placeholder="Select location"
            error={errors.locationId?.message}
            {...register('locationId', {
              required: 'Location is required',
            })}
          />
          <Textarea
            label="Notes"
            rows={3}
            placeholder="Additional notes..."
            {...register('notes')}
          />
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

      <Modal
        isOpen={transferModal.open}
        onClose={closeTransferModal}
        title="Transfer External Stock"
        size="md"
      >
        <form onSubmit={handleTransferSubmit(handleTransfer)} className="space-y-4">
          <Input
            label="Package"
            value={transferModal.item?.packageName || ''}
            disabled
          />
          <Input
            label="Current Location"
            value={transferModal.item?.locationId?.name || 'N/A'}
            disabled
          />
          <Input
            label="Available Quantity"
            value={(transferModal.item?.remainingQuantity ?? transferModal.item?.quantity) || 0}
            disabled
          />
          <Select
            label="Destination Location *"
            options={locationOptions.filter((location) => location.value !== (transferModal.item?.locationId?._id || transferModal.item?.locationId))}
            placeholder="Select destination"
            {...registerTransfer('toLocationId', { required: true })}
          />
          <Input
            label="Transfer Quantity *"
            type="number"
            min="1"
            max={transferModal.item?.quantity || 1}
            placeholder="Enter quantity"
            {...registerTransfer('quantity', {
              required: true,
              min: 1,
              validate: (value) => Number(value) <= Number(transferModal.item?.quantity || 0),
            })}
          />
          <Textarea
            label="Notes"
            rows={2}
            placeholder="Optional transfer notes"
            {...registerTransfer('notes')}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={closeTransferModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Transfer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="External Stock Details"
        size="md"
      >
        {viewModal.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Package Name</p>
                <p className="font-medium">{viewModal.data.packageName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">
                  {viewModal.data.remainingQuantity ?? viewModal.data.quantity}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Donor</p>
                <p className="font-medium">{viewModal.data.donorId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{viewModal.data.locationId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium">{viewModal.data.createdBy?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium">
                  {viewModal.data.createdAt ? format(new Date(viewModal.data.createdAt), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="font-medium">{viewModal.data.notes || 'N/A'}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewModal({ open: false, data: null })}>
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
        title="Delete External Stock"
        message="Are you sure you want to delete this external stock record? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
