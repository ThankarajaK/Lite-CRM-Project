import { useEffect, useState } from 'react'
import {
  Clock3,
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
import { crmApi } from '../lib/api'


function CourseDurationForm({
  editingCourseDuration,
  onClose,
  onSave,
  saving,
}) {
  const [name, setName] = useState(
    editingCourseDuration?.name ?? '',
  )

  const [active, setActive] = useState(
    editingCourseDuration?.active !== false,
  )

  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError(
        'Course Duration name is required.',
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
          'Unable to save course duration.',
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Field
        label="Course Duration"
        htmlFor="course-duration-name"
        required
      >
        <Input
          id="course-duration-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="e.g. Short Term"
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
          Active course duration
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
            : editingCourseDuration
              ? 'Update Course Duration'
              : 'Create Course Duration'}
        </Button>
      </div>
    </form>
  )
}


export default function CourseDurations() {
  const {
    hasPermission,
    refreshCrm,
  } = useData()

  const toast = useToast()

  const [
    courseDurations,
    setCourseDurations,
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
    editingCourseDuration,
    setEditingCourseDuration,
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


  async function loadCourseDurations() {
    setLoading(true)

    try {
      const response =
        await crmApi.courseDurations()

      const items =
        Array.isArray(response)
          ? response
          : Array.isArray(
                response?.results,
              )
            ? response.results
            : []

      setCourseDurations(items)
    } catch (error) {
      setCourseDurations([])

      toast.error(
        'Course Durations could not be loaded',
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

    loadCourseDurations()
  }, [canManageCatalogue])


  const filteredCourseDurations =
    courseDurations.filter(
      (courseDuration) => {
        const term =
          search
            .trim()
            .toLowerCase()

        if (!term) return true

        return courseDuration.name
          ?.toLowerCase()
          .includes(term)
      },
    )


  function openCreate() {
    setEditingCourseDuration(null)
    setShowForm(true)
  }


  function openEdit(
    courseDuration,
  ) {
    setEditingCourseDuration(
      courseDuration,
    )
    setShowForm(true)
  }


  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingCourseDuration(null)
  }


  async function handleSave(values) {
    setSaving(true)

    try {
      if (editingCourseDuration) {
        await crmApi.updateCourseDuration(
          editingCourseDuration.id,
          values,
        )

        toast.success(
          'Course Duration updated',
          `${values.name} was updated successfully.`,
        )
      } else {
        await crmApi.createCourseDuration(
          values,
        )

        toast.success(
          'Course Duration created',
          `${values.name} was added successfully.`,
        )
      }

      closeForm()

      await loadCourseDurations()

      /*
       * Refresh the shared CRM data so the Lead form
       * immediately uses the current active Course
       * Durations without changing its existing architecture.
       */
      await refreshCrm()
    } catch (error) {
      toast.error(
        'Course Duration could not be saved',
        error?.message ||
          'Please try again.',
      )

      throw error
    } finally {
      setSaving(false)
    }
  }


  async function handleDelete(
    courseDuration,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${courseDuration.name}"? Existing Leads using this Course Duration may no longer be able to reference it.`,
      )

    if (!confirmed) return

    setDeletingId(
      courseDuration.id,
    )

    try {
      await crmApi.deleteCourseDuration(
        courseDuration.id,
      )

      toast.success(
        'Course Duration deleted',
        `${courseDuration.name} was removed from the catalogue.`,
      )

      await loadCourseDurations()

      await refreshCrm()
    } catch (error) {
      toast.error(
        'Course Duration could not be deleted',
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
          title="Course Durations"
          description="Manage the course durations available when capturing leads."
        />

        <Card>
          <EmptyState
            icon={Clock3}
            title="Course Duration access restricted"
            description="You do not have permission to manage Course Durations."
          />
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Durations"
        description="Create and manage the course durations available when capturing leads."
        actions={
          <Button
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Course Duration
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Course Durations"
          subtitle={`${courseDurations.length} course duration${
            courseDurations.length === 1
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
              placeholder="Search course durations..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Loading Course Durations...
          </div>
        ) : filteredCourseDurations.length ===
          0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={Clock3}
              title={
                search
                  ? 'No Course Durations found'
                  : 'No Course Durations yet'
              }
              description={
                search
                  ? 'Try a different search term.'
                  : 'Create the first Course Duration in your catalogue.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Course Duration
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
                {filteredCourseDurations.map(
                  (
                    courseDuration,
                  ) => (
                    <tr
                      key={
                        courseDuration.id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Clock3 className="h-4 w-4" />
                          </div>

                          <p className="font-medium text-slate-900">
                            {
                              courseDuration.name
                            }
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            courseDuration.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {courseDuration.active
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
                              openEdit(
                                courseDuration,
                              )
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
                              courseDuration.id
                            }
                            onClick={() =>
                              handleDelete(
                                courseDuration,
                              )
                            }
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />

                            {deletingId ===
                            courseDuration.id
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

      {showForm ? (
        <Modal
          open={showForm}
          onClose={closeForm}
          title={
            editingCourseDuration
              ? 'Edit Course Duration'
              : 'Create Course Duration'
          }
        >
          <CourseDurationForm
            editingCourseDuration={
              editingCourseDuration
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