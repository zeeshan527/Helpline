import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useToast } from '../context/ToastContext'
import { stockInAPI, locationsAPI, donorsAPI } from '../services/api'

const initialStockDefaults = {
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
}

const initialPackageDefaults = {
  packageName: '',
  location: '',
  distributionPolicy: 'flexible',
  controlPrice: '',
  maxDiscount: '',
  eligibilityFrequency: 'unlimited',
  maxQuantityPerBeneficiary: '',
  batchNumber: '',
  notes: '',
}

const sourceOptions = [
  { value: 'donor', label: 'Donor' },
  { value: 'company', label: 'Company' },
  { value: 'purchase', label: 'Purchase' },
]

const recordTypeOptions = [
  { value: 'stock', label: 'Stock' },
  { value: 'package', label: 'Package' },
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
  { value: 'packet', label: 'Packet' },
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

export function useStockIn(user) {
  const { success, error: showError } = useToast()

  const [stockItems, setStockItems] = useState([])
  const [availableStockItems, setAvailableStockItems] = useState([])
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
  const [recordTypeFilter, setRecordTypeFilter] = useState('stock')
  const [modalOpen, setModalOpen] = useState(false)
  const [transferModal, setTransferModal] = useState({ open: false, id: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [viewModal, setViewModal] = useState({ open: false, data: null })
  const [editingId, setEditingId] = useState(null)
  const [editingRecordType, setEditingRecordType] = useState('stock')
  const [submitting, setSubmitting] = useState(false)
  const [packageSearch, setPackageSearch] = useState('')
  const [selectedPackageItems, setSelectedPackageItems] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm()

  const {
    register: registerTransfer,
    handleSubmit: handleTransferSubmit,
    reset: resetTransfer,
  } = useForm()

  const sourceType = watch('sourceType')
  const distributionPolicy = watch('distributionPolicy')
  const isPackageView = recordTypeFilter === 'package'
  const isPackageEditing = editingRecordType === 'package'

  const getLocationFilterParams = useCallback(() => {
    if (user?.role === 'location_inventory_manager' && user.assignedLocations?.length > 0) {
      return { locationId: user.assignedLocations[0] }
    }

    return {}
  }, [user?.assignedLocations, user?.role])

  const locationOptions = useMemo(() => {
    const assignedLocationIds = user?.assignedLocations?.map((location) => location._id || location) || []
    const filteredLocations = user?.role === 'location_inventory_manager'
      ? locations.filter((location) => assignedLocationIds.includes(location._id))
      : locations

    return filteredLocations.map((location) => ({ value: location._id, label: location.name }))
  }, [locations, user?.assignedLocations, user?.role])

  const donorOptions = useMemo(() => donors.map((donor) => ({
    value: donor._id,
    label: donor.name,
  })), [donors])

  const packageProductOptions = useMemo(() => {
    const query = packageSearch.trim().toLowerCase()
    const selectedIds = new Set(selectedPackageItems.map((item) => item.stockInId))

    return availableStockItems
      .filter((item) => !selectedIds.has(item._id))
      .filter((item) => (item.remainingQuantity || 0) > 0)
      .filter((item) => {
        if (!query) return true
        const fields = [
          item.product?.name || '',
          item.product?.category || '',
          item.product?.unit || '',
          item.batchNumber || '',
        ]
        return fields.some((field) => field.toLowerCase().includes(query))
      })
  }, [availableStockItems, packageSearch, selectedPackageItems])

  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsAPI.getAll({ limit: 100 })
      setLocations(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch locations')
    }
  }, [])

  const fetchDonors = useCallback(async () => {
    try {
      const response = await donorsAPI.getAll({ limit: 100 })
      setDonors(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch donors')
    }
  }, [])

  const fetchStockItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await stockInAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        recordType: recordTypeFilter,
        ...(search && { search }),
        ...(!isPackageView && sourceFilter && { sourceType: sourceFilter }),
        ...getLocationFilterParams(),
      })

      setStockItems(response.data.data || [])
      setPagination((previous) => ({
        ...previous,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (error) {
      showError('Failed to fetch stock items')
    } finally {
      setLoading(false)
    }
  }, [
    pagination.page,
    pagination.limit,
    recordTypeFilter,
    search,
    isPackageView,
    sourceFilter,
    getLocationFilterParams,
    showError,
  ])

  const fetchAvailableStockItems = useCallback(async () => {
    try {
      const response = await stockInAPI.getAll({
        limit: 100,
        recordType: 'stock',
        status: 'active',
        ...getLocationFilterParams(),
      })
      setAvailableStockItems(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch available stock items')
    }
  }, [getLocationFilterParams])

  useEffect(() => {
    fetchStockItems()
  }, [fetchStockItems])

  useEffect(() => {
    fetchLocations()
    fetchDonors()
  }, [fetchLocations, fetchDonors])

  useEffect(() => {
    setPagination((previous) => ({ ...previous, page: 1 }))
    if (isPackageView) {
      setSourceFilter('')
    }
  }, [recordTypeFilter, isPackageView])

  useEffect(() => {
    if (!modalOpen || editingId) {
      return
    }

    if (recordTypeFilter === 'package' && editingRecordType !== 'package') {
      setEditingRecordType('package')
      reset(initialPackageDefaults)
      setSelectedPackageItems([])
      setPackageSearch('')
      return
    }

    if (recordTypeFilter === 'stock' && editingRecordType !== 'stock') {
      setEditingRecordType('stock')
      reset(initialStockDefaults)
      setSelectedPackageItems([])
      setPackageSearch('')
    }
  }, [modalOpen, editingId, recordTypeFilter, editingRecordType, reset])

  useEffect(() => {
    if (modalOpen && isPackageEditing) {
      fetchAvailableStockItems()
    }
  }, [modalOpen, isPackageEditing, fetchAvailableStockItems])

  const addPackageItem = useCallback((stockItem) => {
    if (!stockItem || (stockItem.remainingQuantity || 0) <= 0) {
      showError('This product is out of stock')
      return
    }

    if (selectedPackageItems.some((item) => item.stockInId === stockItem._id)) {
      showError('This product is already selected')
      return
    }

    setSelectedPackageItems((previous) => ([
      ...previous,
      {
        stockInId: stockItem._id,
        productName: stockItem.product?.name || 'Unnamed product',
        unit: stockItem.product?.unit || 'piece',
        availableQuantity: stockItem.remainingQuantity || 0,
        quantity: 1,
        locationId: stockItem.locationId?._id || stockItem.locationId || '',
      },
    ]))
    setPackageSearch('')
  }, [selectedPackageItems, showError])

  const updatePackageItemQuantity = useCallback((stockInId, quantity) => {
    const nextQuantity = Math.max(1, parseInt(quantity, 10) || 1)
    setSelectedPackageItems((previous) => previous.map((item) => (
      item.stockInId === stockInId
        ? { ...item, quantity: Math.min(nextQuantity, item.availableQuantity || nextQuantity) }
        : item
    )))
  }, [])

  const removePackageItem = useCallback((stockInId) => {
    setSelectedPackageItems((previous) => previous.filter((item) => item.stockInId !== stockInId))
  }, [])

  const openCreateModal = useCallback(() => {
    setEditingId(null)
    setEditingRecordType(recordTypeFilter)

    if (isPackageView) {
      reset(initialPackageDefaults)
      setSelectedPackageItems([])
      setPackageSearch('')
    } else {
      reset(initialStockDefaults)
    }

    setModalOpen(true)
  }, [recordTypeFilter, isPackageView, reset])

  const openEditModal = useCallback((item) => {
    const itemType = item.recordType || 'stock'
    setEditingId(item._id)
    setEditingRecordType(itemType)

    if (itemType === 'package') {
      reset({
        packageName: item.package?.name || item.product?.name || '',
        location: item.locationId?._id || '',
        distributionPolicy: item.distributionPolicy?.type || 'flexible',
        controlPrice: item.distributionPolicy?.controlPrice || '',
        maxDiscount: item.distributionPolicy?.maxDiscountPercent || '',
        eligibilityFrequency: item.eligibilityRules?.frequency || 'unlimited',
        maxQuantityPerBeneficiary: item.eligibilityRules?.maxQuantityPerBeneficiary || '',
        batchNumber: item.batchNumber || '',
        notes: item.notes || '',
      })

      setSelectedPackageItems((item.package?.items || []).map((product) => ({
        stockInId: product.stockInId?._id || product.stockInId,
        productName: product.productName || product.stockInId?.product?.name || 'Unnamed product',
        unit: product.unit || product.stockInId?.product?.unit || 'piece',
        availableQuantity: product.stockInId?.remainingQuantity || product.availableQuantity || 0,
        quantity: product.quantity || 1,
        locationId: product.locationId?._id || product.locationId || product.stockInId?.locationId?._id || product.stockInId?.locationId || '',
      })))
      setPackageSearch('')
    } else {
      setValue('productName', item.product?.name || '')
      setValue('category', item.product?.category || '')
      setValue('quantity', item.quantity || '')
      setValue('unit', item.product?.unit || 'piece')
      setValue('unitPrice', item.pricing?.unitPrice || item.pricing?.costPrice || '')
      setValue('sourceType', item.source?.type || 'donor')
      setValue('sourceReference', item.source?.referenceId?._id || item.source?.referenceId || '')
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
    }

    setModalOpen(true)
  }, [reset, setValue])

  const onSubmit = useCallback(async (data) => {
    try {
      setSubmitting(true)
      const packageMode = editingRecordType === 'package'
      const packageSelection = selectedPackageItems.map((item) => ({
        stockInId: item.stockInId,
        quantity: parseInt(item.quantity, 10),
      }))

      if (packageMode) {
        if (!data.packageName) {
          throw new Error('Package name is required')
        }
        if (packageSelection.length === 0) {
          throw new Error('Select at least one product for the package')
        }
        if (packageSelection.some((item) => !item.quantity || item.quantity <= 0)) {
          throw new Error('Package item quantity must be at least 1')
        }
        if (selectedPackageItems.some((item) => parseInt(item.quantity, 10) > (item.availableQuantity || 0))) {
          throw new Error('One or more selected products exceed the available stock')
        }
      }

      const payload = packageMode
        ? {
            recordType: 'package',
            package: {
              name: data.packageName,
              items: packageSelection,
            },
            locationId: data.location,
            distributionPolicy: {
              type: data.distributionPolicy,
              ...(data.distributionPolicy === 'control_price' && { controlPrice: parseFloat(data.controlPrice) }),
              ...(data.distributionPolicy === 'flexible' && data.maxDiscount && { maxDiscountPercent: parseFloat(data.maxDiscount) }),
            },
            eligibilityRules: {
              frequency: data.eligibilityFrequency,
              ...(data.maxQuantityPerBeneficiary && { maxQuantityPerBeneficiary: parseInt(data.maxQuantityPerBeneficiary, 10) }),
            },
            ...(data.batchNumber && { batchNumber: data.batchNumber }),
            ...(data.notes && { notes: data.notes }),
          }
        : {
            product: {
              name: data.productName,
              category: data.category,
              unit: data.unit,
            },
            quantity: parseInt(data.quantity, 10),
            source: {
              type: data.sourceType,
              ...(data.sourceType === 'donor' && data.sourceReference && { referenceId: data.sourceReference }),
              ...(data.sourceType === 'company' && data.companyName && { companyName: data.companyName }),
              ...(data.sourceType === 'purchase' && { companyName: data.companyName || 'Purchase' }),
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
              ...(data.maxQuantityPerBeneficiary && { maxQuantityPerBeneficiary: parseInt(data.maxQuantityPerBeneficiary, 10) }),
            },
            ...(data.batchNumber && { batchNumber: data.batchNumber }),
            ...(data.notes && { notes: data.notes }),
          }

      if (editingId) {
        await stockInAPI.update(editingId, payload)
        success(packageMode ? 'Package updated successfully' : 'Stock item updated successfully')
      } else {
        await stockInAPI.create(payload)
        success(packageMode ? 'Package created successfully' : 'Stock item created successfully')
      }

      setModalOpen(false)
      fetchStockItems()
      if (packageMode) {
        fetchAvailableStockItems()
      }
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }, [
    editingRecordType,
    selectedPackageItems,
    editingId,
    success,
    fetchStockItems,
    fetchAvailableStockItems,
    showError,
  ])

  const handleTransfer = useCallback(async (data) => {
    try {
      setSubmitting(true)
      await stockInAPI.transfer(transferModal.id, {
        toLocationId: data.toLocation,
        quantity: parseInt(data.transferQuantity, 10),
      })
      success('Stock transferred successfully')
      setTransferModal({ open: false, id: null })
      resetTransfer()
      fetchStockItems()
    } catch (error) {
      showError(error.response?.data?.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }, [transferModal.id, success, resetTransfer, fetchStockItems, showError])

  const handleDelete = useCallback(async () => {
    try {
      await stockInAPI.delete(deleteDialog.id)
      success(isPackageView ? 'Package deleted successfully' : 'Stock item deleted successfully')
      setDeleteDialog({ open: false, id: null })
      fetchStockItems()
      if (isPackageView) {
        fetchAvailableStockItems()
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete')
    }
  }, [deleteDialog.id, success, isPackageView, fetchStockItems, fetchAvailableStockItems, showError])

  const viewStockItem = useCallback(async (id) => {
    try {
      const response = await stockInAPI.getById(id)
      setViewModal({ open: true, data: response.data.data })
    } catch (error) {
      showError('Failed to fetch stock details')
    }
  }, [showError])

  const closeTransferModal = useCallback(() => {
    setTransferModal({ open: false, id: null })
    resetTransfer()
  }, [resetTransfer])

  const selectedPackageCount = useMemo(() => selectedPackageItems.length, [selectedPackageItems])
  const selectedPackageQuantity = useMemo(
    () => selectedPackageItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0),
    [selectedPackageItems],
  )

  return {
    stockItems,
    loading,
    pagination,
    search,
    sourceFilter,
    recordTypeFilter,
    modalOpen,
    transferModal,
    deleteDialog,
    viewModal,
    editingId,
    isPackageView,
    isPackageEditing,
    submitting,
    packageSearch,
    selectedPackageItems,
    packageProductOptions,
    selectedPackageCount,
    selectedPackageQuantity,
    sourceType,
    distributionPolicy,
    errors,
    register,
    handleSubmit,
    registerTransfer,
    handleTransferSubmit,
    locationOptions,
    donorOptions,
    sourceOptions,
    recordTypeOptions,
    policyOptions,
    frequencyOptions,
    unitOptions,
    categoryOptions,
    setPagination,
    setSearch,
    setSourceFilter,
    setRecordTypeFilter,
    setModalOpen,
    setTransferModal,
    setDeleteDialog,
    setViewModal,
    setPackageSearch,
    openCreateModal,
    openEditModal,
    addPackageItem,
    updatePackageItemQuantity,
    removePackageItem,
    onSubmit,
    handleTransfer,
    handleDelete,
    viewStockItem,
    closeTransferModal,
  }
}
