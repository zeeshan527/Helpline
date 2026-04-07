import { useState, useEffect } from 'react'
import { donorsAPI } from '../services/api'
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
  Heart,
  Phone,
  Mail,
  Building2,
  User,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'

export default function Donors() {
  const [donors, setDonors] = useState([])
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
  
  const { success, error: showError } = useToast()
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm()
  
  const donorType = watch('type')

  useEffect(() => {
    fetchDonors()
  }, [pagination.page, search, typeFilter])

  const fetchDonors = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
      }
      const response = await donorsAPI.getAll(params)
      setDonors(response.data.data)
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (err) {
      showError('Failed to fetch donors')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    reset({
      name: '',
      type: 'individual',
      phone: '',
      email: '',
      address: '',
      companyName: '',
      website: '',
      taxId: '',
      notes: '',
    })
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (donor) => {
    setValue('name', donor.name)
    setValue('type', donor.type)
    setValue('phone', donor.contact?.phone || '')
    setValue('email', donor.contact?.email || '')
    setValue('address', donor.contact?.address || '')
    setValue('companyName', donor.company?.name || '')
    setValue('website', donor.company?.website || '')
    setValue('taxId', donor.company?.taxId || '')
    setValue('notes', donor.notes || '')
    setEditingId(donor._id)
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        name: data.name,
        type: data.type,
        contact: {
          phone: data.phone,
          email: data.email,
          address: data.address,
        },
        ...(data.type === 'company' && {
          company: {
            name: data.companyName,
            website: data.website,
            taxId: data.taxId,
          },
        }),
        notes: data.notes,
      }

      if (editingId) {
        await donorsAPI.update(editingId, payload)
        success('Donor updated successfully')
      } else {
        await donorsAPI.create(payload)
        success('Donor created successfully')
      }
      
      setModalOpen(false)
      fetchDonors()
    } catch (err) {
      showError(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await donorsAPI.delete(deleteDialog.id)
      success('Donor deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchDonors()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete')
    }
  }

  const viewDonor = async (id) => {
    try {
      const response = await donorsAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (err) {
      showError('Failed to fetch donor details')
    }
  }

  const typeOptions = [
    { value: 'individual', label: 'Individual' },
    { value: 'company', label: 'Company' },
    { value: 'organization', label: 'Organization' },
    { value: 'government', label: 'Government' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Donors</h1>
          <p className="page-subtitle">Manage individuals and organizations providing donations</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add Donor
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email..."
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
        ) : donors.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No donors found"
            description="Get started by adding your first donor"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                Add Donor
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
                  <TableHeaderCell>Contact</TableHeaderCell>
                  <TableHeaderCell>Donations</TableHeaderCell>
                  <TableHeaderCell>Total Value</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {donors.map((donor) => (
                  <TableRow key={donor._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                          ${donor.type === 'company' || donor.type === 'organization' 
                            ? 'bg-purple-100' 
                            : 'bg-pink-100'}`}
                        >
                          {donor.type === 'company' || donor.type === 'organization' 
                            ? <Building2 size={20} className="text-purple-600" />
                            : <User size={20} className="text-pink-600" />
                          }
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{donor.name}</div>
                          {donor.company?.name && (
                            <div className="text-sm text-gray-500">{donor.company.name}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="badge badge-gray capitalize">{donor.type}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {donor.contact?.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone size={14} />
                            {donor.contact.phone}
                          </div>
                        )}
                        {donor.contact?.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail size={14} />
                            {donor.contact.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package size={14} className="text-gray-400" />
                        {donor.stats?.totalDonations || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        Rs. {(donor.stats?.totalValue || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={donor.status || 'active'} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewDonor(donor._id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(donor)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, id: donor._id })}
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
        title={editingId ? 'Edit Donor' : 'Add Donor'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="Enter full name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Select
              label="Donor Type *"
              options={typeOptions}
              error={errors.type?.message}
              {...register('type', { required: 'Type is required' })}
            />
            <Input
              label="Phone"
              placeholder="03XX-XXXXXXX"
              {...register('phone')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              {...register('email')}
            />
          </div>

          {(donorType === 'company' || donorType === 'organization') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <Input
                label="Company Name"
                placeholder="Enter company name"
                {...register('companyName')}
              />
              <Input
                label="Website"
                placeholder="https://..."
                {...register('website')}
              />
              <Input
                label="Tax ID"
                placeholder="Tax registration number"
                {...register('taxId')}
              />
            </div>
          )}

          <Input
            label="Address"
            placeholder="Enter full address"
            {...register('address')}
          />
          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            rows={3}
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

      {/* View Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Donor Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center
                ${viewModal.data.type === 'company' || viewModal.data.type === 'organization' 
                  ? 'bg-purple-100' 
                  : 'bg-pink-100'}`}
              >
                {viewModal.data.type === 'company' || viewModal.data.type === 'organization' 
                  ? <Building2 size={32} className="text-purple-600" />
                  : <User size={32} className="text-pink-600" />
                }
              </div>
              <div>
                <h3 className="text-xl font-semibold">{viewModal.data.name}</h3>
                <p className="text-gray-500 capitalize">{viewModal.data.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{viewModal.data.contact?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{viewModal.data.contact?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Donations</p>
                <p className="font-medium">{viewModal.data.stats?.totalDonations || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="font-medium">Rs. {(viewModal.data.stats?.totalValue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewModal.data.status || 'active'} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Registered</p>
                <p className="font-medium">
                  {viewModal.data.createdAt 
                    ? format(new Date(viewModal.data.createdAt), 'MMM dd, yyyy')
                    : 'N/A'}
                </p>
              </div>
            </div>

            {viewModal.data.company?.name && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Company Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="font-medium">{viewModal.data.company.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <p className="font-medium">{viewModal.data.company.website || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tax ID</p>
                    <p className="font-medium">{viewModal.data.company.taxId || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {viewModal.data.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="mt-1 text-gray-700">{viewModal.data.notes}</p>
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
        title="Delete Donor"
        message="Are you sure you want to delete this donor? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
