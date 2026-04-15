import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { stockOutAPI, stockInAPI, beneficiariesAPI, locationsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const initialValues = {
  stockIn: '',
  beneficiary: '',
  quantity: '',
  distributionMode: 'free',
  priceApplied: '',
  discountPercent: '',
  notes: '',
}

const modeOptions = [
  { value: 'free', label: 'Free' },
  { value: 'control_price', label: 'Control Price' },
  { value: 'discounted', label: 'Discounted' },
]

const recordTypeOptions = [
  { value: 'stock', label: 'Stock' },
  { value: 'package', label: 'Package' },
]

export function useStockOut() {
  const { success, error: showError } = useToast()

  const [stockOutItems, setStockOutItems] = useState([])
  const [stockInItems, setStockInItems] = useState([])
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
  const [modeFilter, setModeFilter] = useState('')
  const [recordTypeFilter, setRecordTypeFilter] = useState('stock')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })
  const [submitting, setSubmitting] = useState(false)
  const [selectedStockIn, setSelectedStockIn] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm()

  const watchStockIn = watch('stockIn')
  const watchMode = watch('distributionMode')

  const fetchStockOutItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        recordType: recordTypeFilter,
        ...(search && { search }),
        ...(modeFilter && { mode: modeFilter }),
      }

      const response = await stockOutAPI.getAll(params)
      setStockOutItems(response.data.data || [])
      setPagination((previous) => ({
        ...previous,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (error) {
      showError('Failed to fetch stock out items')
    } finally {
      setLoading(false)
    }
  }, [modeFilter, pagination.limit, pagination.page, recordTypeFilter, search, showError])

  const fetchStockInItems = useCallback(async () => {
    try {
      const response = await stockInAPI.getAll({
        limit: 100,
        recordType: recordTypeFilter,
      })
      setStockInItems(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch stock items')
    }
  }, [recordTypeFilter])

  const fetchBeneficiaries = useCallback(async () => {
    try {
      const response = await beneficiariesAPI.getAll({ limit: 20, status: 'approved' })
      setBeneficiaries(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch beneficiaries')
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
    fetchStockOutItems()
    fetchStockInItems()
    fetchBeneficiaries()
    fetchLocations()
  }, [fetchStockOutItems, fetchStockInItems, fetchBeneficiaries, fetchLocations])

  useEffect(() => {
    setPagination((previous) => ({ ...previous, page: 1 }))
    setValue('stockIn', '')
    setSelectedStockIn(null)
  }, [recordTypeFilter, setValue])

  useEffect(() => {
    if (watchStockIn) {
      const item = stockInItems.find((stockItem) => stockItem._id === watchStockIn)
      setSelectedStockIn(item || null)
    } else {
      setSelectedStockIn(null)
    }
  }, [watchStockIn, stockInItems])

  const openCreateModal = useCallback(() => {
    setEditingId(null)
    setEditingRecord(null)
    reset(initialValues)
    setSelectedStockIn(null)
    setModalOpen(true)
  }, [reset])

  const openEditModal = useCallback((item) => {
    setEditingId(item._id)
    setEditingRecord(item)
    reset({
      stockIn: item.stockInId?._id || item.stockInId || '',
      beneficiary: item.beneficiaryId?._id || item.beneficiaryId || '',
      quantity: item.quantity || '',
      distributionMode: item.distribution?.mode || 'free',
      priceApplied:
        item.distribution?.mode === 'discounted'
          ? (item.distribution?.originalPrice ?? item.distribution?.price ?? '')
          : (item.distribution?.price ?? ''),
      discountPercent: item.distribution?.discountPercent ?? '',
      notes: item.notes || '',
    })
    setModalOpen(true)
  }, [reset])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
    setEditingRecord(null)
    reset(initialValues)
    setSelectedStockIn(null)
  }, [reset])

  const selectedStockInAvailableQuantity = useMemo(() => {
    if (!selectedStockIn) return 0

    const base = selectedStockIn.remainingQuantity || selectedStockIn.quantity || 0
    const selectedId = selectedStockIn._id
    const editingStockInId = editingRecord?.stockInId?._id || editingRecord?.stockInId

    if (editingId && editingStockInId && String(selectedId) === String(editingStockInId)) {
      return base + (editingRecord?.quantity || 0)
    }

    return base
  }, [selectedStockIn, editingId, editingRecord])

  const onSubmit = useCallback(async (data) => {
    try {
      setSubmitting(true)
      const payload = {
        stockInId: data.stockIn,
        beneficiaryId: data.beneficiary,
        locationId: selectedStockIn?.locationId?._id || selectedStockIn?.locationId || selectedStockIn?.location?._id || selectedStockIn?.location,
        quantity: parseInt(data.quantity, 10),
        distribution: {
          mode: data.distributionMode,
          price: data.distributionMode === 'free' ? 0 : parseFloat(data.priceApplied) || 0,
          ...(data.distributionMode === 'discounted' && { discountPercent: parseFloat(data.discountPercent) || 0 }),
          ...(data.distributionMode === 'discounted' && { originalPrice: parseFloat(data.priceApplied) || 0 }),
        },
        ...(data.notes && { notes: data.notes }),
      }

      if (editingId) {
        await stockOutAPI.update(editingId, payload)
        success('Distribution updated successfully')
      } else {
        await stockOutAPI.create(payload)
        success('Stock distributed successfully')
      }

      closeModal()
      fetchStockOutItems()
      fetchStockInItems()
    } catch (error) {
      showError(error.response?.data?.message || 'Distribution failed')
    } finally {
      setSubmitting(false)
    }
  }, [editingId, closeModal, fetchStockInItems, fetchStockOutItems, selectedStockIn, showError, success])

  const handleDeleteDistribution = useCallback(async () => {
    try {
      await stockOutAPI.delete(deleteDialog.id)
      success('Distribution deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchStockOutItems()
      fetchStockInItems()
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete')
    }
  }, [deleteDialog.id, fetchStockInItems, fetchStockOutItems, showError, success])

  const viewStockOut = useCallback(async (id) => {
    try {
      const response = await stockOutAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (error) {
      showError('Failed to fetch distribution details')
    }
  }, [showError])

  const stockInOptions = useMemo(() => {
    const editingStockInId = editingRecord?.stockInId?._id || editingRecord?.stockInId

    return stockInItems
      .map((item) => {
        const base = item.remainingQuantity || item.quantity || 0
        const effectiveAvailable =
          editingId && editingStockInId && String(item._id) === String(editingStockInId)
            ? base + (editingRecord?.quantity || 0)
            : base

        return {
          value: item._id,
          effectiveAvailable,
          label: `${item.product?.name} - ${effectiveAvailable} ${item.product?.unit} (${item.locationId?.name || item.location?.name || 'N/A'})`,
        }
      })
      .filter((item) => item.effectiveAvailable > 0)
  }, [stockInItems, editingId, editingRecord])

  const beneficiaryOptions = useMemo(() => beneficiaries.map((beneficiary) => ({
    value: beneficiary._id,
    label: `${beneficiary?.basicInfo?.headOfFamilyName || beneficiary.name || 'Unknown'} (${beneficiary?.basicInfo?.cnic || beneficiary.cnic || 'N/A'})`,
  })), [beneficiaries])

  const isDistributionModeAllowed = useCallback((mode) => {
    if (!selectedStockIn) return true

    const policy = selectedStockIn.distributionPolicy?.type
    if (policy === 'free_only') return mode === 'free'
    if (policy === 'control_price') return mode === 'control_price'
    return true
  }, [selectedStockIn])

  const filteredModeOptions = useMemo(
    () => modeOptions.filter((option) => isDistributionModeAllowed(option.value)),
    [isDistributionModeAllowed],
  )

  return {
    stockOutItems,
    stockInItems,
    beneficiaries,
    locations,
    loading,
    pagination,
    search,
    modeFilter,
    recordTypeFilter,
    modalOpen,
    editingId,
    deleteDialog,
    viewModal,
    submitting,
    selectedStockIn,
    selectedStockInAvailableQuantity,
    errors,
    watchMode,
    register,
    handleSubmit,
    setPagination,
    setSearch,
    setModeFilter,
    setRecordTypeFilter,
    setModalOpen,
    closeModal,
    setDeleteDialog,
    setViewModal,
    setValue,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleDeleteDistribution,
    viewStockOut,
    stockInOptions,
    beneficiaryOptions,
    modeOptions: filteredModeOptions,
    recordTypeOptions,
  }
}