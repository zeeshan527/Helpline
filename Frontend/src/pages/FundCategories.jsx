import { useEffect, useMemo, useState } from 'react'
import { fundCategoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Textarea from '../components/common/Textarea'
import SearchInput from '../components/common/SearchInput'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PageLoading, EmptyState } from '../components/common/LoadingState'
import Table, { TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/common/Table'
import { StatusBadge } from '../components/common/Badge'
import { Plus, Edit2, Trash2, Wallet, Layers } from 'lucide-react'

const DEFAULT_FORM = {
  name: '',
  code: '',
  description: '',
  status: 'active',
}

export default function FundCategories() {
  const { hasPermission } = useAuth()
  const { success, error: showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [subSearch, setSubSearch] = useState('')

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState(DEFAULT_FORM)
  const [subcategoryForm, setSubcategoryForm] = useState(DEFAULT_FORM)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null })
  const [submitting, setSubmitting] = useState(false)

  const canCreate = hasPermission('fundCategories.create')
  const canUpdate = hasPermission('fundCategories.update')
  const canDelete = hasPermission('fundCategories.delete')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fundCategoriesAPI.getAll({
        limit: 100,
        includeSubcategories: true,
      })

      const rows = response.data.data || []
      setCategories(rows)

      if (rows.length > 0) {
        setSelectedCategoryId((prev) => prev || rows[0]._id)
      } else {
        setSelectedCategoryId('')
      }
    } catch (err) {
      showError('Failed to fetch fund categories')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase()
    if (!term) return categories

    return categories.filter((item) => {
      const name = item.name?.toLowerCase() || ''
      const code = item.code?.toLowerCase() || ''
      return name.includes(term) || code.includes(term)
    })
  }, [categories, categorySearch])

  const selectedCategory = useMemo(
    () => categories.find((item) => item._id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  )

  const filteredSubcategories = useMemo(() => {
    const list = selectedCategory?.subcategories || []
    const term = subSearch.trim().toLowerCase()
    if (!term) return list

    return list.filter((item) => {
      const name = item.name?.toLowerCase() || ''
      const code = item.code?.toLowerCase() || ''
      return name.includes(term) || code.includes(term)
    })
  }, [selectedCategory, subSearch])

  const categoryOptions = categories.map((item) => ({
    value: item._id,
    label: item.name,
  }))

  const resetCategoryForm = () => {
    setCategoryForm(DEFAULT_FORM)
    setEditingCategory(null)
  }

  const resetSubcategoryForm = () => {
    setSubcategoryForm(DEFAULT_FORM)
    setEditingSubcategory(null)
  }

  const openCreateCategory = () => {
    resetCategoryForm()
    setCategoryModalOpen(true)
  }

  const openEditCategory = (category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name || '',
      code: category.code || '',
      description: category.description || '',
      status: category.status || 'active',
    })
    setCategoryModalOpen(true)
  }

  const openCreateSubcategory = () => {
    if (!selectedCategoryId) return
    resetSubcategoryForm()
    setSubcategoryModalOpen(true)
  }

  const openEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory)
    setSelectedCategoryId(subcategory.categoryId?._id || subcategory.categoryId || selectedCategoryId)
    setSubcategoryForm({
      name: subcategory.name || '',
      code: subcategory.code || '',
      description: subcategory.description || '',
      status: subcategory.status || 'active',
    })
    setSubcategoryModalOpen(true)
  }

  const submitCategory = async (e) => {
    e.preventDefault()

    if (!categoryForm.name.trim()) {
      showError('Category name is required')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: categoryForm.name.trim(),
        code: categoryForm.code.trim() || undefined,
        description: categoryForm.description.trim() || undefined,
        status: categoryForm.status,
      }

      if (editingCategory?._id) {
        await fundCategoriesAPI.update(editingCategory._id, payload)
        success('Fund category updated successfully')
      } else {
        await fundCategoriesAPI.create(payload)
        success('Fund category created successfully')
      }

      setCategoryModalOpen(false)
      resetCategoryForm()
      await fetchCategories()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  const submitSubcategory = async (e) => {
    e.preventDefault()

    if (!selectedCategoryId) {
      showError('Please select a category first')
      return
    }

    if (!subcategoryForm.name.trim()) {
      showError('Subcategory name is required')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: subcategoryForm.name.trim(),
        code: subcategoryForm.code.trim() || undefined,
        description: subcategoryForm.description.trim() || undefined,
        status: subcategoryForm.status,
      }

      if (editingSubcategory?._id) {
        await fundCategoriesAPI.updateSubcategory(editingSubcategory._id, payload)
        success('Fund subcategory updated successfully')
      } else {
        await fundCategoriesAPI.createSubcategory(selectedCategoryId, payload)
        success('Fund subcategory created successfully')
      }

      setSubcategoryModalOpen(false)
      resetSubcategoryForm()
      await fetchCategories()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save subcategory')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return

    try {
      setSubmitting(true)

      if (deleteDialog.type === 'category') {
        await fundCategoriesAPI.delete(deleteDialog.id)
        success('Fund category deleted successfully')
      } else {
        await fundCategoriesAPI.deleteSubcategory(deleteDialog.id)
        success('Fund subcategory deleted successfully')
      }

      setDeleteDialog({ open: false, type: '', id: null })
      await fetchCategories()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete record')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Fund Categories</h1>
          <p className="page-subtitle">Manage fund categories and their subcategories</p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <Button icon={Plus} variant="secondary" onClick={openCreateSubcategory} disabled={!selectedCategoryId}>
              Add Subcategory
            </Button>
            <Button icon={Plus} onClick={openCreateCategory}>
              Add Category
            </Button>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No fund categories yet"
            description="Create your first fund category to organize funding buckets."
            action={
              canCreate ? (
                <Button icon={Plus} onClick={openCreateCategory}>Add Category</Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <SearchInput
              value={categorySearch}
              onChange={setCategorySearch}
              placeholder="Search categories by name or code"
            />
          </Card>

          <Card>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Categories</h2>
              <span className="text-sm text-gray-500">{filteredCategories.length} found</span>
            </div>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Subcategories</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow
                    key={category._id}
                    className={selectedCategoryId === category._id ? 'bg-primary-50' : ''}
                    onClick={() => setSelectedCategoryId(category._id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        <Wallet size={16} className="text-primary-600" />
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell>{category.code || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={category.status || 'active'} />
                    </TableCell>
                    <TableCell>{category.subcategories?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canUpdate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditCategory(category)
                            }}
                            className="p-1 rounded hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit2 size={16} className="text-primary-600" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteDialog({ open: true, type: 'category', id: category._id })
                            }}
                            className="p-1 rounded hover:bg-gray-100"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-danger-600" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4">
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
              {/* <Select
                label="Selected Category"
                options={categoryOptions}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              /> */}
              <SearchInput
                value={subSearch}
                onChange={setSubSearch}
                placeholder="Search subcategories by name or code"
              />
            {/* </div> */}
          </Card>

          <Card>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Layers size={18} className="text-primary-600" />
                Subcategories ({selectedCategory?.name || 'None'})
              </h2>
              <span className="text-sm text-gray-500">{filteredSubcategories.length} found</span>
            </div>
            {selectedCategoryId ? (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Description</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredSubcategories.map((subcategory) => (
                    <TableRow key={subcategory._id}>
                      <TableCell>{subcategory.name}</TableCell>
                      <TableCell>{subcategory.code || '-'}</TableCell>
                      <TableCell>{subcategory.description || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={subcategory.status || 'active'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => openEditSubcategory(subcategory)}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit2 size={16} className="text-primary-600" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteDialog({ open: true, type: 'subcategory', id: subcategory._id })}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-danger-600" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Layers}
                title="No category selected"
                description="Select a category to view its subcategories."
              />
            )}
          </Card>
        </>
      )}

      <Modal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false)
          resetCategoryForm()
        }}
        title={editingCategory ? 'Edit Fund Category' : 'Add Fund Category'}
      >
        <form onSubmit={submitCategory} className="space-y-4">
          <Input
            label="Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Community Welfare"
            required
          />
          <Input
            label="Code"
            value={categoryForm.code}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, code: e.target.value }))}
            placeholder="CWF"
          />
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={categoryForm.status}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, status: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={3}
            value={categoryForm.description}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional notes about this category"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCategoryModalOpen(false)
                resetCategoryForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={subcategoryModalOpen}
        onClose={() => {
          setSubcategoryModalOpen(false)
          resetSubcategoryForm()
        }}
        title={editingSubcategory ? 'Edit Fund Subcategory' : 'Add Fund Subcategory'}
      >
        <form onSubmit={submitSubcategory} className="space-y-4">
          <Select
            label="Parent Category"
            options={categoryOptions}
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
          />
          <Input
            label="Name"
            value={subcategoryForm.name}
            onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Emergency Medical Support"
            required
          />
          <Input
            label="Code"
            value={subcategoryForm.code}
            onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, code: e.target.value }))}
            placeholder="EMS"
          />
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={subcategoryForm.status}
            onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, status: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={3}
            value={subcategoryForm.description}
            onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional notes about this subcategory"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSubcategoryModalOpen(false)
                resetSubcategoryForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: '', id: null })}
        onConfirm={confirmDelete}
        loading={submitting}
        title={`Delete Fund ${deleteDialog.type === 'category' ? 'Category' : 'Subcategory'}?`}
        message={
          deleteDialog.type === 'category'
            ? 'This will permanently remove the category. You must remove all subcategories first.'
            : 'This will permanently remove the selected subcategory.'
        }
        confirmText="Delete"
      />
    </div>
  )
}
