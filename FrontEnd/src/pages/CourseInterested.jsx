import { useEffect, useState } from 'react'
import {
  Package,
  Trash2,
  Plus,
  X,
  Pencil,
  Search,
} from 'lucide-react'

import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Table, { TBody, TD, TH, THead, TR } from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/Skeleton'
import { Field, Input } from '../components/ui/FormField'

import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import { crmApi } from '../lib/api'


// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getRoleKey(user) {
  if (!user) return ''

  if (typeof user.role === 'string') {
    return user.role
  }

  if (user.role?.key) {
    return user.role.key
  }

  if (user.role?.name) {
    return user.role.name
  }

  return user.role_key || user.role_name || ''
}


function isAdminUser(user) {
  const role = getRoleKey(user)
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  return role === 'admin' || role === 'administrator'
}


function normalizeListResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.results)) {
    return response.results
  }

  return []
}


function formatMoneyMinor(value) {
  const amount = Number(value || 0) / 100

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}


// -----------------------------------------------------------------------------
// Product Catalogue
// -----------------------------------------------------------------------------

const EMPTY_PRODUCT_FORM = {
  name: '',
  description: '',
  price: '',
  active: true,
}


export default function CourseInterested() {
  const toast = useToast()
  const { user } = useData()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingStatusId, setTogglingStatusId] = useState(null)

  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const [form, setForm] = useState({
    ...EMPTY_PRODUCT_FORM,
  })

  const isAdmin = isAdminUser(user)


  // ---------------------------------------------------------------------------
  // Load products
  // ---------------------------------------------------------------------------

  async function loadProducts() {
    if (!isAdmin) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await crmApi.products()

      setProducts(
        normalizeListResponse(response)
      )
    } catch (error) {
      toast.error(
        'Products could not be loaded',
        error?.message ||
          'Unable to load the product catalogue.'
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadProducts()
  }, [isAdmin])


  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function resetProductForm() {
    setForm({
      ...EMPTY_PRODUCT_FORM,
    })

    setEditingProduct(null)
    setShowForm(false)
  }


  function startCreateProduct() {
    setEditingProduct(null)

    setForm({
      ...EMPTY_PRODUCT_FORM,
    })

    setShowForm(true)
  }


  function startEditProduct(product) {
    setEditingProduct(product)

    setForm({
      name: product.name || '',
      description: product.description || '',
      price:
        product.default_value_minor != null
          ? (
              Number(product.default_value_minor) / 100
            ).toString()
          : '',
      active:
        product.active !== false,
    })

    setShowForm(true)
  }


  // ---------------------------------------------------------------------------
  // Save product
  // ---------------------------------------------------------------------------

  async function saveProduct() {
    const name = form.name.trim()

    if (!name) {
      toast.error(
        'Product could not be saved',
        'Product name is required.'
      )

      return
    }

    const numericPrice =
      form.price === ''
        ? null
        : Number(form.price)

    if (
      numericPrice !== null &&
      (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
      )
    ) {
      toast.error(
        'Product could not be saved',
        'Enter a valid product price.'
      )

      return
    }

    const data = {
      name,
      description:
        form.description.trim(),

      default_value_minor:
        numericPrice === null
          ? null
          : Math.round(
              numericPrice * 100
            ),

      active:
        Boolean(form.active),
    }

    setSaving(true)

    try {
      if (editingProduct) {
        await crmApi.updateProduct(
          editingProduct.id,
          data
        )

        toast.success(
          'Product updated',
          `${name} was updated successfully.`
        )
      } else {
        await crmApi.createProduct(data)

        toast.success(
          'Product created',
          `${name} was added to the catalogue.`
        )
      }

      resetProductForm()
      await loadProducts()
    } catch (error) {
      toast.error(
        editingProduct
          ? 'Product update failed'
          : 'Product creation failed',

        error?.message ||
          'Unable to save the product.'
      )
    } finally {
      setSaving(false)
    }
  }


  // ---------------------------------------------------------------------------
  // Delete product
  // ---------------------------------------------------------------------------

  async function deleteProduct(product) {
    const confirmed =
      window.confirm(
        `Delete "${product.name}" from the product catalogue?`
      )

    if (!confirmed) {
      return
    }

    setDeletingId(product.id)

    try {
      await crmApi.deleteProduct(
        product.id
      )

      toast.success(
        'Product deleted',
        `${product.name} was removed from the catalogue.`
      )

      if (
        editingProduct?.id === product.id
      ) {
        resetProductForm()
      }

      await loadProducts()
    } catch (error) {
      toast.error(
        'Product deletion failed',
        error?.message ||
          'Unable to delete the product.'
      )
    } finally {
      setDeletingId(null)
    }
  }


  // ---------------------------------------------------------------------------
  // Activate / deactivate product
  // ---------------------------------------------------------------------------

  async function toggleProductStatus(product) {
    const nextActive = product.active === false

    const action = nextActive ? 'activate' : 'deactivate'
    const confirmed = window.confirm(
      `${nextActive ? 'Activate' : 'Deactivate'} "${product.name}"? ${nextActive ? 'It will be available for new deals again.' : 'It will no longer be available for new deals. Existing deals will remain unchanged.'}`
    )

    if (!confirmed) return

    setTogglingStatusId(product.id)
    try {
      await crmApi.updateProduct(product.id, { active: nextActive })
      toast.success(
        `Product ${nextActive ? 'activated' : 'deactivated'}`,
        `${product.name} was ${nextActive ? 'activated' : 'deactivated'} successfully.`,
      )
      await loadProducts()
    } catch (error) {
      toast.error(
        `Product ${action} failed`,
        error?.message || `Unable to ${action} this product.`,
      )
    } finally {
      setTogglingStatusId(null)
    }
  }


  // ---------------------------------------------------------------------------
  // Admin protection
  // ---------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Course Interested"
          description="Manage the courses available in the lead capture form."
        />

        <Card>
          <div className="p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-700">
              Admin access required
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Only Admin users can manage Course Interested options.
            </p>
          </div>
        </Card>
      </div>
    )
  }


  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const filteredProducts =
    products.filter((product) => {
      const query =
        search.trim().toLowerCase()

      if (!query) {
        return true
      }

      return (
        product.name
          ?.toLowerCase()
          .includes(query) ||
        product.description
          ?.toLowerCase()
          .includes(query)
      )
    })


  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      <PageHeader
        title="Course Interested"
        description="Create, update and remove courses available in the lead capture form."
      />

      <Card>

        <CardHeader
          title="Course Interested"
          subtitle={`${products.length} ${
            products.length === 1
              ? 'course'
              : 'courses'
          } in catalogue`}
        />

        <div className="p-5">

          {/* Top actions */}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>
              <div className="flex items-center gap-2">

                <Package className="h-5 w-5 text-slate-500" />

                <h3 className="text-sm font-semibold text-slate-900">
                  Course catalogue
                </h3>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                Only Admin users can create, edit and delete courses.
              </p>
            </div>


            <Button
              type="button"
              size="sm"
              onClick={startCreateProduct}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Course
            </Button>

          </div>


          {/* Search */}

          <div className="mb-5 max-w-lg">

            <div className="relative">

              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search courses..."
                className="pl-9"
              />

            </div>

          </div>


          {/* Create / Edit form */}

          {showForm && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingProduct
                      ? 'Edit Course'
                      : 'Add Course'}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {editingProduct
                      ? 'Update the course details.'
                      : 'Add a new course to the Course Interested dropdown.'}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={resetProductForm}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600"
                  aria-label="Close course form"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>


              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <Field
                  label="Course name"
                  htmlFor="course-name"
                >
                  <Input
                    id="course-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name:
                          event.target.value,
                      }))
                    }
                    placeholder="Website Development"
                  />
                </Field>


                <Field
                  label="Default value"
                  htmlFor="course-price"
                >
                  <Input
                    id="course-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price:
                          event.target.value,
                      }))
                    }
                    placeholder="100000"
                  />
                </Field>


                <div className="md:col-span-2">

                  <Field
                    label="Description"
                    htmlFor="course-description"
                  >
                    <textarea
                      id="course-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description:
                            event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Describe the course..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>

                </div>


                <div className="md:col-span-2">

                  <div className="flex items-start justify-between gap-4 py-3">

                    <div>

                      <p className="text-sm font-medium text-slate-900">
                        Active course
                      </p>

                      <p className="mt-0.5 text-sm text-slate-500">
                        Active courses will appear in the Add Lead dropdown.
                      </p>

                    </div>


                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.active}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          active:
                            !current.active,
                        }))
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        form.active
                          ? 'bg-brand-600'
                          : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          form.active
                            ? 'translate-x-[22px]'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>

                  </div>

                </div>

              </div>


              <div className="mt-4 flex justify-end gap-2">

                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetProductForm}
                  disabled={saving}
                >
                  Cancel
                </Button>


                <Button
                  type="button"
                  onClick={saveProduct}
                  disabled={
                    saving ||
                    !form.name.trim()
                  }
                >
                  {saving
                    ? 'Saving…'
                    : editingProduct
                      ? 'Update Course'
                      : 'Create Course'}
                </Button>

              </div>

            </div>
          )}


          {/* Course table */}

          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} columns={4} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title={search ? 'No matching courses found' : 'No courses in the catalogue'}
              message={
                search
                  ? 'Try adjusting your search terms.'
                  : 'Click "Add Course" to create the first course.'
              }
              action={
                !search ? (
                  <Button
                    icon={Plus}
                    onClick={() => {
                      setShowForm(true)
                      setEditingProduct(null)
                      setForm({
                        name: '',
                        description: '',
                        default_value: '',
                        active: true,
                      })
                    }}
                  >
                    Add Course
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {/* Desktop / tablet table (>=768px) */}
              <div className="hidden min-w-0 overflow-x-auto min-[768px]:block">
                <Table className="min-w-[680px]">
                  <THead>
                    <TR>
                      <TH>Course</TH>
                      <TH>Default value</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>

                  <TBody>
                    {filteredProducts.map((product) => (
                      <TR key={product.id}>
                        <TD>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                              <Package className="h-4 w-4 text-slate-500" />
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {product.name}
                              </p>

                              {product.description && (
                                <p className="mt-0.5 max-w-xl truncate text-xs text-slate-500">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TD>

                        <TD className="whitespace-nowrap text-slate-700">
                          {product.default_value_minor == null
                            ? '—'
                            : formatMoneyMinor(
                                product.default_value_minor
                              )}
                        </TD>

                        <TD>
                          <Badge
                            tone={
                              product.active
                                ? 'green'
                                : 'slate'
                            }
                          >
                            {product.active
                              ? 'Active'
                              : 'Inactive'}
                          </Badge>
                        </TD>

                        <TD>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                startEditProduct(product)
                              }
                              disabled={
                                deletingId ===
                                product.id
                              }
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleProductStatus(product)}
                              disabled={
                                deletingId === product.id ||
                                togglingStatusId === product.id
                              }
                            >
                              {togglingStatusId === product.id
                                ? 'Saving…'
                                : product.active
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </Button>

                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                deleteProduct(product)
                              }
                              disabled={
                                deletingId ===
                                product.id
                              }
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {deletingId === product.id
                                ? 'Deleting…'
                                : 'Delete'}
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              {/* Mobile cards (<768px) */}
              <div className="space-y-3 p-3 min-[768px]:hidden">
                {filteredProducts.map((product) => (
                  <article
                    key={`mobile-course-${product.id}`}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-sm text-slate-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {product.default_value_minor == null
                              ? 'No default value'
                              : formatMoneyMinor(product.default_value_minor)}
                          </p>
                        </div>
                      </div>
                      <Badge tone={product.active ? 'green' : 'slate'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {product.description && (
                      <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startEditProduct(product)}
                        disabled={deletingId === product.id}
                        className="flex-1 sm:flex-initial"
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => deleteProduct(product)}
                        disabled={deletingId === product.id}
                        className="flex-1 sm:flex-initial"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {deletingId === product.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

        </div>

      </Card>

    </div>
  )
}