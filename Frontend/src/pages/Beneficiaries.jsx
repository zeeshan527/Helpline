import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { beneficiariesAPI, locationsAPI } from '../services/api'
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
import { maskCnic, maskMobile } from '../utils/inputMasks'
import Select from '../components/common/Select'
import Textarea from '../components/common/Textarea'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  Users,
  Filter,
  Download,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'

export default function Beneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm()

  useEffect(() => {
    fetchBeneficiaries()
    fetchLocations()
  }, [pagination.page, search, statusFilter])

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      }
      const response = await beneficiariesAPI.getAll(params)
      setBeneficiaries(response.data.data)
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (err) {
      showError('Failed to fetch beneficiaries')
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
      headOfFamilyName: '',
      cnic: '',
      mobile: '',
      address: '',
      area: '',
      city: '',
      totalMembers: 1,
      schoolGoingChildren: 0,
      elderlyCount: 0,
      disabledCount: 0,
      mainSource: '',
      monthlyIncome: '',
      otherSources: '',
      employmentStatus: '',
      govtSupport: false,
      zakatSupport: false,
      assistanceType: '',
      foodRation: false,
      medical: false,
      education: false,
      utilityBills: false,
      vocationalTraining: false,
      emergencyRelief: false,
      houseImage: '',
      locationId: '',
      status: 'pending',
      remarks: '',
      surveyorName: '',
      surveyorDesignation: '',
    })
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (beneficiary) => {
    setValue('headOfFamilyName', beneficiary.basicInfo?.headOfFamilyName || '')
    setValue('cnic', beneficiary.basicInfo?.cnic || '')
    setValue('mobile', beneficiary.basicInfo?.mobile || '')
    setValue('address', beneficiary.basicInfo?.address || '')
    setValue('area', beneficiary.basicInfo?.area || '')
    setValue('city', beneficiary.basicInfo?.city || '')
    setValue('totalMembers', beneficiary.family?.totalMembers || 1)
    setValue('schoolGoingChildren', beneficiary.family?.schoolGoingChildren || 0)
    setValue('elderlyCount', beneficiary.family?.elderlyCount || 0)
    setValue('disabledCount', beneficiary.family?.disabledCount || 0)
    setValue('mainSource', beneficiary.income?.mainSource || '')
    setValue('monthlyIncome', beneficiary.income?.monthlyIncome || '')
    setValue('otherSources', beneficiary.income?.otherSources || '')
    setValue('employmentStatus', beneficiary.income?.employmentStatus || '')
    setValue('govtSupport', beneficiary.assistance?.govtSupport || false)
    setValue('zakatSupport', beneficiary.assistance?.zakatSupport || false)
    setValue('assistanceType', beneficiary.assistance?.assistanceType || '')
    setValue('foodRation', beneficiary.needs?.foodRation || false)
    setValue('medical', beneficiary.needs?.medical || false)
    setValue('education', beneficiary.needs?.education || false)
    setValue('utilityBills', beneficiary.needs?.utilityBills || false)
    setValue('vocationalTraining', beneficiary.needs?.vocationalTraining || false)
    setValue('emergencyRelief', beneficiary.needs?.emergencyRelief || false)
    // setValue('houseImage', beneficiary.documents?.houseImage || '')
    setValue('locationId', beneficiary.locationId?._id || beneficiary.locationId || '')
    setValue('status', beneficiary.status)
    setValue('remarks', beneficiary.remarks || '')
    setValue('surveyorName', beneficiary.declaration?.surveyor?.name || '')
    setValue('surveyorDesignation', beneficiary.declaration?.surveyor?.designation || '')
    setEditingId(beneficiary._id)
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      setSubmitting(true)
      // Build payload matching backend structure
      const payload = {
        basicInfo: {
          headOfFamilyName: data.headOfFamilyName,
          cnic: data.cnic,
          mobile: data.mobile || undefined,
          address: data.address || undefined,
          area: data.area || undefined,
          city: data.city || undefined,
        },
        family: {
          totalMembers: parseInt(data.totalMembers) || 1,
          schoolGoingChildren: data.schoolGoingChildren ? parseInt(data.schoolGoingChildren) : 0,
          elderlyCount: data.elderlyCount ? parseInt(data.elderlyCount) : 0,
          disabledCount: data.disabledCount ? parseInt(data.disabledCount) : 0,
        },
        income: {
          mainSource: data.mainSource || undefined,
          monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : undefined,
          otherSources: data.otherSources || undefined,
          employmentStatus: data.employmentStatus || undefined,
        },
        assistance: {
          govtSupport: Boolean(data.govtSupport),
          zakatSupport: Boolean(data.zakatSupport),
          assistanceType: data.assistanceType || undefined,
        },
        needs: {
          foodRation: Boolean(data.foodRation),
          medical: Boolean(data.medical),
          education: Boolean(data.education),
          utilityBills: Boolean(data.utilityBills),
          vocationalTraining: Boolean(data.vocationalTraining),
          emergencyRelief: Boolean(data.emergencyRelief),
        },
        // documents: {
        //   ...(data.houseImage ? { houseImage: data.houseImage } : {}),
        // },
        declaration: {
          surveyor: {
            name: data.surveyorName || undefined,
            designation: data.surveyorDesignation || undefined,
          }
        },
        locationId: data.locationId,
        status: data.status,
        remarks: data.remarks || undefined,
      }

      if (editingId) {
        await beneficiariesAPI.update(editingId, payload)
        success('Beneficiary updated successfully')
      } else {
        await beneficiariesAPI.create(payload)
        success('Beneficiary created successfully')
      }
      
      setModalOpen(false)
      fetchBeneficiaries()
    } catch (err) {
      const errorMessage = err.response?.data?.errors 
        ? err.response.data.errors.map(e => e.message).join(', ')
        : err.response?.data?.message || 'Operation failed'
      showError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await beneficiariesAPI.delete(deleteDialog.id)
      success('Beneficiary deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchBeneficiaries()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete')
    }
  }

  const viewBeneficiary = async (id) => {
    try {
      const response = await beneficiariesAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (err) {
      showError('Failed to fetch beneficiary details')
    }
  }

  const locationOptions = locations.map(loc => ({
    value: loc._id,
    label: loc.name,
  }))

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
  ]

  const employmentOptions = [
    { value: '', label: 'Select status' },
    { value: 'employed', label: 'Employed' },
    { value: 'daily_wages', label: 'Daily Wages' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'widow_led', label: 'Widow-led Household' },
    { value: 'orphan_family', label: 'Orphan Family' },
    { value: 'disabled_breadwinner', label: 'Disabled Breadwinner' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Beneficiaries</h1>
          <p className="page-subtitle">Manage people receiving aid from your organization</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add Beneficiary
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, CNIC..."
            className="flex-1"
          />
          <Select
            options={statusOptions}
            placeholder="All Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <PageLoading />
        ) : beneficiaries.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No beneficiaries found"
            description="Get started by adding your first beneficiary"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                Add Beneficiary
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>CNIC</TableHeaderCell>
                  <TableHeaderCell>Contact</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Family Size</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {beneficiaries.map((beneficiary) => (
                  <TableRow key={beneficiary._id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {beneficiary.basicInfo?.headOfFamilyName || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{beneficiary.basicInfo?.cnic || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone size={14} />
                        {beneficiary.basicInfo?.mobile || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin size={14} />
                        {beneficiary.locationId?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{beneficiary.family?.totalMembers || 1}</TableCell>
                    <TableCell>
                      <StatusBadge status={beneficiary.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewBeneficiary(beneficiary._id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(beneficiary)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, id: beneficiary._id })}
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
        title={editingId ? 'Edit Beneficiary' : 'Add Beneficiary'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-gray-50 px-4 py-2 -mx-6 mb-4">
            <h3 className="text-sm font-medium text-gray-700">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Head of Family Name *"
              placeholder="Enter full name"
              error={errors.headOfFamilyName?.message}
              {...register('headOfFamilyName', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Name must be less than 100 characters' }
              })}
            />
            <Input
              label="CNIC *"
              placeholder="12345-1234567-1"
              error={errors.cnic?.message}
              {...register('cnic', {
                required: 'CNIC is required',
                pattern: {
                  value: /^\d{5}-\d{7}-\d{1}$/,
                  message: 'Invalid CNIC format (12345-1234567-1)',
                }
              })}
              onChange={e => {
                const masked = maskCnic(e.target.value);
                e.target.value = masked;
                register('cnic').onChange(e);
              }}
              maxLength={15}
            />
            <Input
              label="Mobile"
              placeholder="03XX XXXXXXX"
              error={errors.mobile?.message}
              {...register('mobile', {
                pattern: {
                  value: /^03\d{2} \d{7}$/,
                  message: 'Invalid mobile format (03XX XXXXXXX)',
                }
              })}
              onChange={e => {
                const masked = maskMobile(e.target.value);
                e.target.value = masked;
                register('mobile').onChange(e);
              }}
              maxLength={12}
            />
            <Select
              label="Location *"
              options={locationOptions}
              placeholder="Select location"
              error={errors.locationId?.message}
              {...register('locationId', { required: 'Location is required' })}
            />
          </div>

          <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
            <h3 className="text-sm font-medium text-gray-700">Address</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Address"
              placeholder="Street address"
              error={errors.address?.message}
              {...register('address', {
                maxLength: { value: 200, message: 'Address must be less than 200 characters' }
              })}
            />
            <Input
              label="Area"
              placeholder="Area / Neighborhood"
              error={errors.area?.message}
              {...register('area', {
                maxLength: { value: 100, message: 'Area must be less than 100 characters' }
              })}
            />
            <Input
              label="City"
              placeholder="City"
              error={errors.city?.message}
              {...register('city', {
                maxLength: { value: 100, message: 'City must be less than 100 characters' }
              })}
            />
          </div>

          <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
            <h3 className="text-sm font-medium text-gray-700">Family & Income</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Total Family Members"
              type="number"
              min="1"
              error={errors.totalMembers?.message}
              {...register('totalMembers', {
                min: { value: 1, message: 'Must have at least 1 family member' },
                max: { value: 50, message: 'Family size cannot exceed 50 members' },
                validate: (value, formValues) => {
                  const schoolGoing = parseInt(formValues.schoolGoingChildren) || 0;
                  const elderly = parseInt(formValues.elderlyCount) || 0;
                  const disabled = parseInt(formValues.disabledCount) || 0;
                  const total = parseInt(value) || 0;
                  
                  if (schoolGoing + elderly + disabled > total) {
                    return 'Sum of school children, elderly, and disabled cannot exceed total family members';
                  }
                  return true;
                }
              })}
            />
            <Input
              label="School Going Children"
              type="number"
              min="0"
              error={errors.schoolGoingChildren?.message}
              {...register('schoolGoingChildren', {
                min: { value: 0, message: 'Cannot be negative' },
                max: { value: 20, message: 'Cannot exceed 20 children' },
                validate: (value, formValues) => {
                  const schoolGoing = parseInt(value) || 0;
                  const elderly = parseInt(formValues.elderlyCount) || 0;
                  const disabled = parseInt(formValues.disabledCount) || 0;
                  const total = parseInt(formValues.totalMembers) || 0;
                  
                  if (schoolGoing + elderly + disabled > total) {
                    return 'Sum of school children, elderly, and disabled cannot exceed total family members';
                  }
                  return true;
                }
              })}
            />
            <Input
              label="Elderly Count"
              type="number"
              min="0"
              error={errors.elderlyCount?.message}
              {...register('elderlyCount', {
                min: { value: 0, message: 'Cannot be negative' },
                max: { value: 20, message: 'Cannot exceed 20 elderly members' },
                validate: (value, formValues) => {
                  const schoolGoing = parseInt(formValues.schoolGoingChildren) || 0;
                  const elderly = parseInt(value) || 0;
                  const disabled = parseInt(formValues.disabledCount) || 0;
                  const total = parseInt(formValues.totalMembers) || 0;
                  
                  if (schoolGoing + elderly + disabled > total) {
                    return 'Sum of school children, elderly, and disabled cannot exceed total family members';
                  }
                  return true;
                }
              })}
            />
            <Input
              label="Disabled Count"
              type="number"
              min="0"
              error={errors.disabledCount?.message}
              {...register('disabledCount', {
                min: { value: 0, message: 'Cannot be negative' },
                max: { value: 20, message: 'Cannot exceed 20 disabled members' },
                validate: (value, formValues) => {
                  const schoolGoing = parseInt(formValues.schoolGoingChildren) || 0;
                  const elderly = parseInt(formValues.elderlyCount) || 0;
                  const disabled = parseInt(value) || 0;
                  const total = parseInt(formValues.totalMembers) || 0;
                  
                  if (schoolGoing + elderly + disabled > total) {
                    return 'Sum of school children, elderly, and disabled cannot exceed total family members';
                  }
                  return true;
                }
              })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Monthly Income (PKR)"
              type="number"
              min="0"
              placeholder="0"
              error={errors.monthlyIncome?.message}
              {...register('monthlyIncome', {
                min: { value: 0, message: 'Income cannot be negative' },
                max: { value: 10000000, message: 'Income cannot exceed 10,000,000 PKR' }
              })}
            />
            <Select
              label="Employment Status"
              options={employmentOptions}
              error={errors.employmentStatus?.message}
              {...register('employmentStatus')}
            />
            <Input
              label="Main Source of Income"
              placeholder="e.g. farming, labor"
              error={errors.mainSource?.message}
              {...register('mainSource', {
                maxLength: { value: 200, message: 'Source must be less than 200 characters' }
              })}
            />
          </div>
          <Textarea
            label="Other Income Sources"
            placeholder="Additional income details"
            rows={3}
            error={errors.otherSources?.message}
            {...register('otherSources', {
              maxLength: { value: 1000, message: 'Details must be less than 1000 characters' }
            })}
          />

          <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
            <h3 className="text-sm font-medium text-gray-700">Current Assistance</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  id="govtSupport"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  {...register('govtSupport')}
                />
                <label htmlFor="govtSupport" className="text-sm text-gray-700">Government Support</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="zakatSupport"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  {...register('zakatSupport')}
                />
                <label htmlFor="zakatSupport" className="text-sm text-gray-700">Zakat Support</label>
              </div>
            </div>
            <Input
              label="Assistance Type"
              placeholder="Cash, food, medical, etc."
              error={errors.assistanceType?.message}
              {...register('assistanceType', {
                maxLength: { value: 200, message: 'Assistance type must be less than 200 characters' }
              })}
            />
            {/* <div>
              <label className="label">House Photo</label>
              <input
                type="file"
                accept="image/*"
                className="input"
                {...register('houseImage', {
                  validate: {
                    fileSize: (value) => {
                      if (value && value[0]) {
                        const file = value[0];
                        const maxSize = 5 * 1024 * 1024; // 5MB
                        if (file.size > maxSize) {
                          return 'File size must be less than 5MB';
                        }
                      }
                      return true;
                    },
                    fileType: (value) => {
                      if (value && value[0]) {
                        const file = value[0];
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                        if (!allowedTypes.includes(file.type)) {
                          return 'Only JPEG, PNG, GIF, and WebP images are allowed';
                        }
                      }
                      return true;
                    }
                  }
                })}
              />
              {errors.houseImage && (
                <p className="mt-1 text-sm text-danger-600">{errors.houseImage.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Upload a photo of the beneficiary's house (max 5MB)</p>
            </div> */}
          </div>

          <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
            <h3 className="text-sm font-medium text-gray-700">Needs Assessment</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="foodRation"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                {...register('foodRation')}
              />
              <label htmlFor="foodRation" className="text-sm text-gray-700">Food Ration</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="medical"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                {...register('medical')}
              />
              <label htmlFor="medical" className="text-sm text-gray-700">Medical</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="education"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                {...register('education')}
              />
              <label htmlFor="education" className="text-sm text-gray-700">Education</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="utilityBills"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                {...register('utilityBills')}
              />
              <label htmlFor="utilityBills" className="text-sm text-gray-700">Utility Bills</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="vocationalTraining"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                {...register('vocationalTraining')}
              />
              <label htmlFor="vocationalTraining" className="text-sm text-gray-700">Vocational Training</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="emergencyRelief"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                {...register('emergencyRelief')}
              />
              <label htmlFor="emergencyRelief" className="text-sm text-gray-700">Emergency Relief</label>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
            <h3 className="text-sm font-medium text-gray-700">Status & Notes</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              options={statusOptions}
              {...register('status')}
            />
          </div>
          <Textarea
            label="Remarks"
            placeholder="Additional notes..."
            rows={3}
            error={errors.remarks?.message}
            {...register('remarks', {
              maxLength: { value: 1000, message: 'Remarks must be less than 1000 characters' }
            })}
          />

          <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
            <h3 className="text-sm font-medium text-gray-700">Surveyor Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Surveyor Name"
              placeholder="Enter surveyor's name"
              error={errors.surveyorName?.message}
              {...register('surveyorName', {
                maxLength: { value: 100, message: 'Name must be less than 100 characters' }
              })}
            />
            <Input
              label="Surveyor Designation"
              placeholder="Enter designation"
              error={errors.surveyorDesignation?.message}
              {...register('surveyorDesignation', {
                maxLength: { value: 100, message: 'Designation must be less than 100 characters' }
              })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
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
        title="Beneficiary Details"
        size="xl"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="bg-gray-50 px-4 py-2 -mx-6 mb-4">
              <h3 className="text-sm font-medium text-gray-700">Basic Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Head of Family</p>
                <p className="font-medium">{viewModal.data.basicInfo?.headOfFamilyName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CNIC</p>
                <p className="font-medium">{viewModal.data.basicInfo?.cnic || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mobile</p>
                <p className="font-medium">{viewModal.data.basicInfo?.mobile || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{viewModal.data.locationId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">
                  {[viewModal.data.basicInfo?.address, viewModal.data.basicInfo?.area, viewModal.data.basicInfo?.city]
                    .filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewModal.data.status} />
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
              <h3 className="text-sm font-medium text-gray-700">Family & Income</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Family Members</p>
                <p className="font-medium">{viewModal.data.family?.totalMembers || 1}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">School Going Children</p>
                <p className="font-medium">{viewModal.data.family?.schoolGoingChildren ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Elderly Count</p>
                <p className="font-medium">{viewModal.data.family?.elderlyCount ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Disabled Count</p>
                <p className="font-medium">{viewModal.data.family?.disabledCount ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Income</p>
                <p className="font-medium">
                  {viewModal.data.income?.monthlyIncome 
                    ? `PKR ${viewModal.data.income.monthlyIncome.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Employment Status</p>
                <p className="font-medium capitalize">
                  {viewModal.data.income?.employmentStatus?.replace('_', ' ') || 'N/A'}
                </p>
              </div>
                <div>
                <p className="text-sm text-gray-500">Main Income Source</p>
                <p className="font-medium">{viewModal.data.income?.mainSource || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Other Income Sources</p>
                <p className="font-medium">{viewModal.data.income?.otherSources || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
              <h3 className="text-sm font-medium text-gray-700">Current Assistance</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Government Support</p>
                <p className="font-medium">{viewModal.data.assistance?.govtSupport ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zakat Support</p>
                <p className="font-medium">{viewModal.data.assistance?.zakatSupport ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Assistance Type</p>
                <p className="font-medium">{viewModal.data.assistance?.assistanceType || 'N/A'}</p>
              </div>
              {/* <div>
                <p className="text-sm text-gray-500">House Photo</p>
                {viewModal.data.documents?.houseImage ? (
                  <img
                    src={viewModal.data.documents.houseImage}
                    alt="House"
                    className="max-h-40 w-full rounded-lg object-cover border"
                  />
                ) : (
                  <p className="font-medium">N/A</p>
                )}
              </div> */}
            </div>

            <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
              <h3 className="text-sm font-medium text-gray-700">Needs Assessment</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Food Ration</p>
                <p className="font-medium">{viewModal.data.needs?.foodRation ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Medical</p>
                <p className="font-medium">{viewModal.data.needs?.medical ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Education</p>
                <p className="font-medium">{viewModal.data.needs?.education ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Utility Bills</p>
                <p className="font-medium">{viewModal.data.needs?.utilityBills ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vocational Training</p>
                <p className="font-medium">{viewModal.data.needs?.vocationalTraining ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Emergency Relief</p>
                <p className="font-medium">{viewModal.data.needs?.emergencyRelief ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {viewModal.data.remarks && (
              <>
                <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
                  <h3 className="text-sm font-medium text-gray-700">Remarks</h3>
                </div>
                <p className="text-gray-700">{viewModal.data.remarks}</p>
              </>
            )}

            {viewModal.data.distributionHistory?.totalReceived > 0 && (
              <>
                <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
                  <h3 className="text-sm font-medium text-gray-700">Distribution History</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Received</p>
                    <p className="font-medium">{viewModal.data.distributionHistory.totalReceived} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="font-medium">PKR {viewModal.data.distributionHistory.totalValue?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </>
            )}

            <div className="bg-gray-50 px-4 py-2 -mx-6 my-4">
              <h3 className="text-sm font-medium text-gray-700">Surveyor Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Surveyor Name</p>
                <p className="font-medium">{viewModal.data.declaration?.surveyor?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Designation</p>
                <p className="font-medium">{viewModal.data.declaration?.surveyor?.designation || 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
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
        title="Delete Beneficiary"
        message="Are you sure you want to delete this beneficiary? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
