import { useEffect, useState } from 'react'
import {
  Megaphone,
  Plus,
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
import { crmApi } from '../lib/api'


function LeadSourceForm({
  onClose,
  onSave,
  saving,
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Lead source name is required.')
      return
    }

    try {
      await onSave({
        name: trimmedName,
        active: true,
      })
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Unable to create lead source.',
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Field
        label="Lead Source"
        htmlFor="lead-source-name"
        required
      >
        <Input
          id="lead-source-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="e.g. Google Ads"
          autoFocus
        />
      </Field>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

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
          {saving ? 'Creating...' : 'Create Lead Source'}
        </Button>
      </div>
    </form>
  )
}


export default function LeadSources() {
  const { hasPermission, refreshCrm } = useData()
  const toast = useToast()

  const [sources, setSources] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const canManageCatalogue = hasPermission('manage_catalogue')

  async function loadSources() {
    setLoading(true)

    try {
      const response = await crmApi.sources()

      const items =
        Array.isArray(response)
          ? response
          : Array.isArray(response?.results)
            ? response.results
            : []

      setSources(items)
    } catch (error) {
      setSources([])
      toast.error(
        'Lead Sources could not be loaded',
        error?.message || 'Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManageCatalogue) {
      setLoading(false)
      return
    }

    loadSources()
  }, [canManageCatalogue])

  const filteredSources = sources.filter((source) => {
    const term = search.trim().toLowerCase()

    if (!term) return true

    return source.name?.toLowerCase().includes(term)
  })

  function closeForm() {
    if (saving) return
    setShowForm(false)
  }

  async function handleSave(values) {
    setSaving(true)

    try {
      await crmApi.createSource(values)

      toast.success(
        'Lead Source created',
        `${values.name} was added successfully.`,
      )

      closeForm()
      await loadSources()
      await refreshCrm()
    } catch (error) {
      toast.error(
        'Lead Source could not be created',
        error?.message || 'Please try again.',
      )
      throw error
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(source) {
    const confirmed = window.confirm(
      `Delete "${source.name}"? Existing Leads using this source cannot be changed by this action.`,
    )

    if (!confirmed) return

    setDeletingId(source.id)

    try {
      await crmApi.deleteSource(source.id)

      toast.success(
        'Lead Source deleted',
        `${source.name} was removed from the source list.`,
      )

      await loadSources()
      await refreshCrm()
    } catch (error) {
      toast.error(
        'Lead Source could not be deleted',
        error?.message || 'Please try again.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  if (!canManageCatalogue) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Lead Sources"
          description="Manage the sources available when capturing leads."
        />

        <Card>
          <EmptyState
            icon={Megaphone}
            title="Lead Source access restricted"
            message="You do not have permission to manage Lead Sources."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Sources"
        description="Create and manage the sources available when capturing leads."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Lead Sources"
          subtitle={`${sources.length} source${sources.length === 1 ? '' : 's'} in catalogue`}
        />

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lead sources..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Loading Lead Sources...
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={Megaphone}
              title={search ? 'No Lead Sources found' : 'No Lead Sources yet'}
              message={
                search
                  ? 'Try a different search term.'
                  : 'Create the first Lead Source in your catalogue.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Source
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
                {filteredSources.map((source) => (
                  <tr key={source.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <Megaphone className="h-4 w-4" />
                        </div>

                        <p className="font-medium text-slate-900">
                          {source.name}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          source.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {source.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={deletingId === source.id}
                          onClick={() => handleDelete(source)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {deletingId === source.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm ? (
        <Modal
          open={showForm}
          onClose={closeForm}
          title="Create Lead Source"
          description="Add a source that can be selected when capturing a lead."
        >
          <LeadSourceForm
            onClose={closeForm}
            onSave={handleSave}
            saving={saving}
          />
        </Modal>
      ) : null}
    </div>
  )
}
