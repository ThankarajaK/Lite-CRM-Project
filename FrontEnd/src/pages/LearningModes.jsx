import { useEffect, useState } from 'react'
import {
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'

import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Table, { TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { TableSkeleton } from '../components/ui/Skeleton'
import { Field, Input } from '../components/ui/FormField'
import EmptyState from '../components/ui/EmptyState'

import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { crmApi } from '../lib/api'


function LearningModeForm({
  editingLearningMode,
  onClose,
  onSave,
  saving,
}) {
  const [name, setName] = useState(
    editingLearningMode?.name ?? '',
  )

  const [active, setActive] = useState(
    editingLearningMode?.active !== false,
  )

  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError(
        'Learning Mode name is required.',
      )
      return
    }

    try {
      await onSave({
        name: trimmedName,
        active,
      })
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Unable to save learning mode.',
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Field
        label="Learning Mode"
        htmlFor="learning-mode-name"
        required
      >
        <Input
          id="learning-mode-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="e.g. Online"
          autoFocus
        />
      </Field>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) =>
            setActive(
              event.target.checked,
            )
          }
          className="h-4 w-4 rounded border-slate-300"
        />

        <span className="text-sm font-medium text-slate-700">
          Active learning mode
        </span>
      </label>

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
          {saving
            ? 'Saving...'
            : editingLearningMode
              ? 'Update Learning Mode'
              : 'Create Learning Mode'}
        </Button>
      </div>
    </form>
  )
}


export default function LearningModes() {
  const {
    hasPermission,
    refreshCrm,
  } = useData()

  const toast = useToast()

  const [
    learningModes,
    setLearningModes,
  ] = useState([])

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [
    showForm,
    setShowForm,
  ] = useState(false)

  const [
    editingLearningMode,
    setEditingLearningMode,
  ] = useState(null)

  const [saving, setSaving] =
    useState(false)

  const [
    deletingId,
    setDeletingId,
  ] = useState(null)

  const canManageCatalogue =
    hasPermission(
      'manage_catalogue',
    )


  async function loadLearningModes() {
    setLoading(true)

    try {
      const response =
        await crmApi.learningModes()

      const items =
        Array.isArray(response)
          ? response
          : Array.isArray(
                response?.results,
              )
            ? response.results
            : []

      setLearningModes(items)
    } catch (error) {
      setLearningModes([])

      toast.error(
        'Learning Modes could not be loaded',
        error?.message ||
          'Please try again.',
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

    loadLearningModes()
  }, [canManageCatalogue])


  const filteredLearningModes =
    learningModes.filter(
      (learningMode) => {
        const term =
          search
            .trim()
            .toLowerCase()

        if (!term) return true

        return learningMode.name
          ?.toLowerCase()
          .includes(term)
      },
    )


  function openCreate() {
    setEditingLearningMode(null)
    setShowForm(true)
  }


  function openEdit(
    learningMode,
  ) {
    setEditingLearningMode(
      learningMode,
    )
    setShowForm(true)
  }


  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingLearningMode(null)
  }


  async function handleSave(values) {
    setSaving(true)

    try {
      if (editingLearningMode) {
        await crmApi.updateLearningMode(
          editingLearningMode.id,
          values,
        )

        toast.success(
          'Learning Mode updated',
          `${values.name} was updated successfully.`,
        )
      } else {
        await crmApi.createLearningMode(
          values,
        )

        toast.success(
          'Learning Mode created',
          `${values.name} was added successfully.`,
        )
      }

      closeForm()

      await loadLearningModes()

      /*
       * Refresh the shared CRM data so the Lead form
       * immediately uses the current active Learning
       * Modes without changing its existing architecture.
       */
      await refreshCrm()
    } catch (error) {
      toast.error(
        'Learning Mode could not be saved',
        error?.message ||
          'Please try again.',
      )

      throw error
    } finally {
      setSaving(false)
    }
  }


  async function handleDelete(
    learningMode,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${learningMode.name}"? Existing Leads using this Learning Mode may no longer be able to reference it.`,
      )

    if (!confirmed) return

    setDeletingId(
      learningMode.id,
    )

    try {
      await crmApi.deleteLearningMode(
        learningMode.id,
      )

      toast.success(
        'Learning Mode deleted',
        `${learningMode.name} was removed from the catalogue.`,
      )

      await loadLearningModes()

      await refreshCrm()
    } catch (error) {
      toast.error(
        'Learning Mode could not be deleted',
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
          title="Learning Modes"
          description="Manage the learning modes available when capturing leads."
        />

        <Card>
          <EmptyState
            icon={Monitor}
            title="Learning Mode access restricted"
            description="You do not have permission to manage Learning Modes."
          />
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Modes"
        description="Create and manage the learning modes available when capturing leads."
        actions={
          <Button
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Learning Mode
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Learning Modes"
          subtitle={`${learningModes.length} learning mode${
            learningModes.length === 1
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
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search learning modes..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} columns={3} />
          </div>
        ) : filteredLearningModes.length === 0 ? (
          <EmptyState
            icon={Monitor}
            title={
              search
                ? 'No Learning Modes found'
                : 'No Learning Modes yet'
            }
            message={
              search
                ? 'Try a different search term.'
                : 'Create the first Learning Mode in your catalogue.'
            }
            action={
              !search ? (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setEditingLearningMode(null)
                    setShowForm(true)
                  }}
                >
                  Add Learning Mode
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {/* Desktop / tablet table (>=768px) */}
            <div className="hidden min-w-0 overflow-x-auto min-[768px]:block">
              <Table className="min-w-[500px]">
                <THead>
                  <TR>
                    <TH>Learning Mode</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>

                <TBody>
                  {filteredLearningModes.map((learningMode) => (
                    <TR key={learningMode.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Monitor className="h-4 w-4" />
                          </div>

                          <p className="font-medium text-slate-900">
                            {learningMode.name}
                          </p>
                        </div>
                      </TD>

                      <TD>
                        <Badge
                          tone={
                            learningMode.active
                              ? 'green'
                              : 'slate'
                          }
                        >
                          {learningMode.active
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>
                      </TD>

                      <TD>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              openEdit(learningMode)
                            }
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            disabled={
                              deletingId === learningMode.id
                            }
                            onClick={() =>
                              handleDelete(learningMode)
                            }
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            {deletingId === learningMode.id
                              ? 'Deleting...'
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
              {filteredLearningModes.map((learningMode) => (
                <article
                  key={`mobile-lm-${learningMode.id}`}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Monitor className="h-4 w-4" />
                      </div>
                      <p className="truncate font-semibold text-sm text-slate-900">
                        {learningMode.name}
                      </p>
                    </div>

                    <Badge
                      tone={
                        learningMode.active ? 'green' : 'slate'
                      }
                    >
                      {learningMode.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(learningMode)}
                      className="flex-1 sm:flex-initial"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deletingId === learningMode.id}
                      onClick={() => handleDelete(learningMode)}
                      className="flex-1 sm:flex-initial"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {deletingId === learningMode.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {showForm ? (
        <Modal
          open={showForm}
          onClose={closeForm}
          title={
            editingLearningMode
              ? 'Edit Learning Mode'
              : 'Create Learning Mode'
          }
        >
          <LearningModeForm
            editingLearningMode={
              editingLearningMode
            }
            onClose={closeForm}
            onSave={handleSave}
            saving={saving}
          />
        </Modal>
      ) : null}
    </div>
  )
}