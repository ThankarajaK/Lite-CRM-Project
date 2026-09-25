import { useEffect, useState } from 'react'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'

import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input } from '../components/ui/FormField'
import EmptyState from '../components/ui/EmptyState'

import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'


function ProductForm({
  editingProduct,
  onClose,
  onSave,
  saving,
}) {
  const [name, setName] = useState(
    editingProduct?.name ?? '',
  )

  const [description, setDescription] =
    useState(
      editingProduct?.description ?? '',
    )

  const [price, setPrice] = useState(
    editingProduct?.default_value_minor != null
      ? String(
          Number(
            editingProduct.default_value_minor,
          ) / 100,
        )
      : '',
  )

  const [active, setActive] = useState(
    editingProduct?.active !== false,
  )

  const [error, setError] = useState('')


  async function handleSubmit(event) {
    event.preventDefault()

    setError('')

    if (!name.trim()) {
      setError('Product name is required.')
      return
    }

    const numericPrice =
      price.trim() === ''
        ? null
        : Number(price)

    if (
      numericPrice !== null &&
      (!Number.isFinite(numericPrice) ||
        numericPrice < 0)
    ) {
      setError(
        'Price must be a valid positive number.',
      )
      return
    }

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        default_value_minor:
          numericPrice === null
            ? null
            : Math.round(
                numericPrice * 100,
              ),
        active,
      })
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Unable to save product.',
      )
    }
  }


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Field
        label="Product Name"
        htmlFor="product-name"
        required
      >
        <Input
          id="product-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="e.g. CRM Licence"
          autoFocus
        />
      </Field>


      <Field
        label="Description"
        htmlFor="product-description"
      >
        <textarea
          id="product-description"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Describe the product..."
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </Field>


      <Field
        label="Default Value"
        htmlFor="product-price"
      >
        <Input
          id="product-price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) =>
            setPrice(event.target.value)
          }
          placeholder="0.00"
        />
      </Field>


      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) =>
            setActive(event.target.checked)
          }
          className="h-4 w-4 rounded border-slate-300"
        />

        <span className="text-sm font-medium text-slate-700">
          Active product
        </span>
      </label>


      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}


      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : editingProduct
              ? 'Update Product'
              : 'Create Product'}
        </Button>
      </div>
    </form>
  )
}


export default function Products() {
  const {
    products,
    createProduct,
    updateProduct,
    deleteProduct,
    hasPermission,
  } = useData()

  const toast = useToast()

  const [search, setSearch] = useState('')

  const [showForm, setShowForm] =
    useState(false)

  const [editingProduct, setEditingProduct] =
    useState(null)

  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] =
    useState(null)


  const canManageCatalogue =
    hasPermission('manage_catalogue')


  const filteredProducts =
    products.filter((product) => {
      const term =
        search.trim().toLowerCase()

      if (!term) return true

      return (
        product.name
          ?.toLowerCase()
          .includes(term) ||
        product.description
          ?.toLowerCase()
          .includes(term)
      )
    })


  function openCreate() {
    setEditingProduct(null)
    setShowForm(true)
  }


  function openEdit(product) {
    setEditingProduct(product)
    setShowForm(true)
  }


  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingProduct(null)
  }


  async function handleSave(values) {
    setSaving(true)

    try {
      if (editingProduct) {
        await updateProduct(
          editingProduct.id,
          values,
        )

        toast.success(
          'Product updated',
          `${values.name} was updated successfully.`,
        )
      } else {
        await createProduct(values)

        toast.success(
          'Product created',
          `${values.name} was added to the catalogue.`,
        )
      }

      closeForm()
    } catch (error) {
      toast.error(
        'Product could not be saved',
        error?.message ||
          'Please try again.',
      )

      throw error
    } finally {
      setSaving(false)
    }
  }


  async function handleDelete(product) {
    const confirmed =
      window.confirm(
        `Delete "${product.name}"? This action cannot be undone.`,
      )

    if (!confirmed) return

    setDeletingId(product.id)

    try {
      await deleteProduct(product.id)

      toast.success(
        'Product deleted',
        `${product.name} was removed from the catalogue.`,
      )
    } catch (error) {
      toast.error(
        'Product could not be deleted',
        error?.message ||
          'Please try again.',
      )
    } finally {
      setDeletingId(null)
    }
  }


  if (!canManageCatalogue) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Product Catalogue"
          description="Manage the products available for deals."
        />

        <Card>
          <EmptyState
            icon={Package}
            title="Catalogue access restricted"
            description="You do not have permission to manage the product catalogue."
          />
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Catalogue"
        description="Create and manage the products available when creating deals."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        }
      />


      <Card>
        <CardHeader
          title="Products"
          subtitle={`${products.length} product${
            products.length === 1
              ? ''
              : 's'
          } in catalogue`}
        />


        <div className="border-b border-slate-100 px-5 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>


        {filteredProducts.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={Package}
              title={
                search
                  ? 'No products found'
                  : 'No products yet'
              }
              description={
                search
                  ? 'Try a different search term.'
                  : 'Create the first product in your catalogue.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Product
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Default Value
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>


              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredProducts.map(
                  (product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Package className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {product.name}
                            </p>

                            {product.description && (
                              <p className="mt-0.5 max-w-md truncate text-sm text-slate-500">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>


                      <td className="px-5 py-4 text-sm text-slate-700">
                        {product.default_value_minor != null
                          ? (
                              Number(
                                product.default_value_minor,
                              ) / 100
                            ).toLocaleString(
                              'en-IN',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )
                          : '—'}
                      </td>


                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            product.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {product.active
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </td>


                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              openEdit(product)
                            }
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={
                              deletingId ===
                              product.id
                            }
                            onClick={() =>
                              handleDelete(
                                product,
                              )
                            }
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            {deletingId ===
                            product.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>


      {showForm && (
        <Modal
          open={showForm}
          onClose={closeForm}
          title={
            editingProduct
              ? 'Edit Product'
              : 'Create Product'
          }
        >
          <ProductForm
            editingProduct={
              editingProduct
            }
            onClose={closeForm}
            onSave={handleSave}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  )
}