import { useState, useEffect } from 'react'
import { usersAPI, locationsAPI, authAPI } from '../services/api'
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
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  Mail,
} from 'lucide-react'
import { format } from 'date-fns'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const { success, error: showError } = useToast()
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm()
  
  const watchRole = watch('role')

  useEffect(() => {
    fetchUsers()
    fetchLocations()
  }, [pagination.page, search, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      }
      const response = await usersAPI.getAll(params)
      setUsers(response.data.data)
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (err) {
      showError('Failed to fetch users')
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

  const openCreateModal = () => {
    reset({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      assignedLocations: [],
      status: 'active',
    })
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (user) => {
    setValue('name', user.name)
    setValue('email', user.email)
    setValue('password', '')
    setValue('role', user.role)
    setValue('assignedLocations', user.assignedLocations?.map(l => l._id) || [])
    setValue('status', user.status)
    setEditingId(user._id)
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        ...(data.password && { password: data.password }),
        ...(data.role === 'staff' && { assignedLocations: data.assignedLocations }),
      }

      if (editingId) {
        await usersAPI.update(editingId, payload)
        success('User updated successfully')
      } else {
        if (!data.password) {
          showError('Password is required for new users')
          setSubmitting(false)
          return
        }
        // Use auth register endpoint for creating users
        await authAPI.register(payload)
        success('User created successfully')
      }
      
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      showError(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await usersAPI.delete(deleteDialog.id)
      success('User deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchUsers()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete')
    }
  }

  const locationOptions = locations.map(loc => ({
    value: loc._id,
    label: loc.name,
  }))

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
  ]

  const getRoleBadge = (role) => {
    return (
      <span className={`badge ${role === 'admin' ? 'badge-primary' : 'badge-gray'}`}>
        {role === 'admin' && <Shield size={12} className="mr-1" />}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system users and their permissions</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add User
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
            options={roleOptions}
            placeholder="All Roles"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <PageLoading />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Get started by adding your first user"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                Add User
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Assigned Locations</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                          ${user.role === 'admin' ? 'bg-primary-100' : 'bg-gray-100'}`}
                        >
                          <span className={`font-semibold ${
                            user.role === 'admin' ? 'text-primary-700' : 'text-gray-700'
                          }`}>
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail size={14} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <span className="text-gray-500">All locations</span>
                      ) : user.assignedLocations?.length > 0 ? (
                        <span>{user.assignedLocations.length} locations</span>
                      ) : (
                        <span className="text-gray-400">None assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status || 'active'} />
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, id: user._id })}
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
        title={editingId ? 'Edit User' : 'Add User'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="Enter full name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              }
            })}
          />
          <Input
            label={editingId ? 'Password (leave blank to keep current)' : 'Password *'}
            type="password"
            placeholder="Enter password"
            error={errors.password?.message}
            {...register('password', { 
              required: editingId ? false : 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              }
            })}
          />
          <Select
            label="Role *"
            options={roleOptions}
            error={errors.role?.message}
            {...register('role', { required: 'Role is required' })}
          />
          {watchRole === 'staff' && (
            <div>
              <label className="label">Assigned Locations</label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {locationOptions.map((location) => (
                  <label key={location.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={location.value}
                      {...register('assignedLocations')}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">{location.label}</span>
                  </label>
                ))}
                {locationOptions.length === 0 && (
                  <p className="text-sm text-gray-500">No locations available</p>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Staff users can only access data from assigned locations
              </p>
            </div>
          )}
          <Select
            label="Status"
            options={statusOptions}
            error={errors.status?.message}
            {...register('status')}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
