import { useState, useEffect } from 'react'
import { locationsAPI } from '../services/api'
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
  MapPin,
  Building,
  Warehouse,
  Store,
  Package,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { format } from 'date-fns'

const locationTypeIcons = {
  shop: Store,
  warehouse: Warehouse,
  office: Building,
  depot: Package,
}

export default function Locations() {
  const [locations, setLocations] = useState([])
  const [allLocations, setAllLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set())
  
  const { success, error: showError } = useToast()
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm()

  useEffect(() => {
    fetchLocations()
    fetchAllLocations()
  }, [pagination.page, search, typeFilter])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
      }
      const response = await locationsAPI.getAll(params)
      setLocations(response.data.data)
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (err) {
      showError('Failed to fetch locations')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllLocations = async () => {
    try {
      const response = await locationsAPI.getAll({ limit: 100 })
      setAllLocations(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch all locations')
    }
  }

  const openCreateModal = () => {
    reset({
      name: '',
      type: 'shop',
      code: '',
      parent: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      description: '',
    })
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (location) => {
    setValue('name', location.name)
    setValue('type', location.type)
    setValue('code', location.code || '')
    setValue('parent', location.parent?._id || '')
    setValue('city', location.address?.city || '')
    setValue('address', location.address?.street || '')
    setValue('phone', location.contact?.phone || '')
    setValue('email', location.contact?.email || '')
    setValue('description', location.description || '')
    setEditingId(location._id)
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        name: data.name,
        type: data.type,
        code: data.code,
        ...(data.parent && { parent: data.parent }),
        address: {
          city: data.city,
          street: data.address,
        },
        contact: {
          phone: data.phone,
          email: data.email,
        },
        description: data.description,
      }

      if (editingId) {
        await locationsAPI.update(editingId, payload)
        success('Location updated successfully')
      } else {
        await locationsAPI.create(payload)
        success('Location created successfully')
      }
      
      setModalOpen(false)
      fetchLocations()
      fetchAllLocations()
    } catch (err) {
      showError(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await locationsAPI.delete(deleteDialog.id)
      success('Location deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchLocations()
      fetchAllLocations()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete')
    }
  }

  const viewLocation = async (id) => {
    try {
      const response = await locationsAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (err) {
      showError('Failed to fetch location details')
    }
  }

  const toggleExpand = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const typeOptions = [
    { value: 'shop', label: 'Shop' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'office', label: 'Office' },
    { value: 'depot', label: 'Depot' },
  ]

  const parentOptions = allLocations
    .filter(loc => loc._id !== editingId)
    .map(loc => ({
      value: loc._id,
      label: `${loc.name} (${loc.type})`,
    }))

  const getLocationIcon = (type) => {
    const Icon = locationTypeIcons[type] || MapPin
    return Icon
  }

  const getTypeColor = (type) => {
    const colors = {
      shop: 'bg-blue-100 text-blue-600',
      warehouse: 'bg-amber-100 text-amber-600',
      office: 'bg-purple-100 text-purple-600',
      depot: 'bg-green-100 text-green-600',
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Manage shops, warehouses, offices, and depots</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, code..."
            className="flex-1"
          />
          <Select
            options={typeOptions}
            placeholder="All Types"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <PageLoading />
        ) : locations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations found"
            description="Get started by adding your first location"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                Add Location
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Parent</TableHeaderCell>
                  <TableHeaderCell>City</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {locations.map((location) => {
                  const Icon = getLocationIcon(location.type)
                  return (
                    <TableRow key={location._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(location.type)}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{location.name}</div>
                            {location.contact?.phone && (
                              <div className="text-sm text-gray-500">{location.contact.phone}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="badge badge-gray capitalize">{location.type}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {location.code || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {location.parent?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {location.address?.city || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={location.status || 'active'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewLocation(location._id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="View"
                          >
                            <Eye size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => openEditModal(location)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit2 size={16} className="text-primary-600" />
                          </button>
                          <button
                            onClick={() => setDeleteDialog({ open: true, id: location._id })}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-danger-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
        title={editingId ? 'Edit Location' : 'Add Location'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location Name *"
              placeholder="Enter location name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Select
              label="Type *"
              options={typeOptions}
              error={errors.type?.message}
              {...register('type', { required: 'Type is required' })}
            />
            <Input
              label="Code"
              placeholder="Location code (e.g., WH-001)"
              {...register('code')}
            />
            <Select
              label="Parent Location"
              options={parentOptions}
              placeholder="Select parent (optional)"
              {...register('parent')}
            />
            <Input
              label="City"
              placeholder="Enter city"
              {...register('city')}
            />
            <Input
              label="Phone"
              placeholder="Contact phone"
              {...register('phone')}
            />
          </div>
          <Input
            label="Address"
            placeholder="Enter full address"
            {...register('address')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="Contact email"
            {...register('email')}
          />
          <Textarea
            label="Description"
            placeholder="Additional details about this location..."
            rows={3}
            {...register('description')}
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

      {/* View Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Location Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              {(() => {
                const Icon = getLocationIcon(viewModal.data.type)
                return (
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getTypeColor(viewModal.data.type)}`}>
                    <Icon size={32} />
                  </div>
                )
              })()}
              <div>
                <h3 className="text-xl font-semibold">{viewModal.data.name}</h3>
                <p className="text-gray-500 capitalize">{viewModal.data.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Code</p>
                <p className="font-medium">{viewModal.data.code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Parent</p>
                <p className="font-medium">{viewModal.data.parent?.name || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="font-medium">{viewModal.data.address?.city || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{viewModal.data.contact?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{viewModal.data.contact?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewModal.data.status || 'active'} />
              </div>
            </div>

            {viewModal.data.address?.street && (
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="mt-1 text-gray-700">{viewModal.data.address.street}</p>
              </div>
            )}

            {viewModal.data.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-1 text-gray-700">{viewModal.data.description}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModal({ open: false, data: null })}>
                Close
              </Button>
              <Button onClick={() => {
                setViewModal({ open: false, data: null })
                openEditModal(viewModal.data)
              }}>
                Edit
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
        title="Delete Location"
        message="Are you sure you want to delete this location? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
