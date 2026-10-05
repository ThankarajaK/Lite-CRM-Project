import { useMemo, useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Tabs from '../components/ui/Tabs'
import SearchBar from '../components/ui/SearchBar'
import FilterDropdown from '../components/ui/FilterDropdown'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { TableSkeleton } from '../components/ui/Skeleton'
import TaskItem from '../components/tasks/TaskItem'
import TaskFormModal from '../components/tasks/TaskFormModal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { TASK_PRIORITIES } from '../data/mockData'
import { daysFromToday } from '../utils/format'

/** Which tasks belong in each tab. */
const TAB_FILTERS = {
  all: () => true,
  today: (task) =>
    !task.completed && daysFromToday(task.dueDate) === 0,
  upcoming: (task) =>
    !task.completed && daysFromToday(task.dueDate) > 0,
  completed: (task) => task.completed,
  overdue: (task) =>
    !task.completed && daysFromToday(task.dueDate) < 0,
}

export default function Tasks() {
  const {
    tasks,
    contacts,
    users,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  } = useData()

  const toast = useToast()
  const loading = useSimulatedLoading()

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [assignee, setAssignee] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const counts = useMemo(
    () => ({
      all: tasks.length,
      today: tasks.filter(TAB_FILTERS.today).length,
      upcoming: tasks.filter(TAB_FILTERS.upcoming).length,
      completed: tasks.filter(TAB_FILTERS.completed).length,
      overdue: tasks.filter(TAB_FILTERS.overdue).length,
    }),
    [tasks]
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()

    return tasks
      .filter(TAB_FILTERS[tab])
      .filter((task) => {
        const matchesTerm =
          !term ||
          task.title.toLowerCase().includes(term) ||
          (task.contact ?? '').toLowerCase().includes(term)

        return (
          matchesTerm &&
          (!priority || task.priority === priority) &&
          (!assignee || task.owner === assignee)
        )
      })
      .sort((a, b) => {
        // Open tasks first, then by due date.
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1
        }

        return new Date(a.dueDate) - new Date(b.dueDate)
      })
  }, [tasks, tab, query, priority, assignee])

  const hasFilters = Boolean(
    query || priority || assignee
  )

  async function handleToggle(task) {
    const next = await toggleTask(task.id)

    if (next?.completed) {
      toast.success(
        'Task completed',
        task.title
      )
    } else {
      toast.info(
        'Task reopened',
        task.title
      )
    }
  }

  async function handleSubmit(values) {
    if (editing) {
      updateTask(editing.id, values)

      toast.success(
        'Task updated successfully',
        values.title
      )
    } else {
      await addTask(values)

      toast.success(
        'Task created successfully',
        values.title
      )
    }

    setEditing(null)
    setFormOpen(false)
  }

  function handleDelete() {
    if (!pendingDelete) return

    deleteTask(pendingDelete.id)

    toast.success(
      'Task deleted',
      pendingDelete.title
    )

    setPendingDelete(null)
  }

  function openCreateForm() {
    setEditing(null)
    setFormOpen(true)
  }

  function clearFilters() {
    setQuery('')
    setPriority('')
    setAssignee('')
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* Page header */}
      <PageHeader
        title="Tasks"
        subtitle="Manage your follow-ups and activities"
        actions={
          <Button
            icon={Plus}
            onClick={openCreateForm}
            className="w-full sm:w-auto"
          >
            Add Task
          </Button>
        }
      />

      {/* Tasks card */}
      <Card className="min-w-0 overflow-hidden">
        {/* Tabs */}
        <div className="min-w-0 overflow-x-auto scrollbar-slim">
          <Tabs
            value={tab}
            onChange={setTab}
            className="min-w-max px-2"
            tabs={[
              {
                id: 'all',
                label: 'All',
                count: counts.all,
              },
              {
                id: 'today',
                label: 'Today',
                count: counts.today,
              },
              {
                id: 'upcoming',
                label: 'Upcoming',
                count: counts.upcoming,
              },
              {
                id: 'completed',
                label: 'Completed',
                count: counts.completed,
              },
              {
                id: 'overdue',
                label: 'Overdue',
                count: counts.overdue,
              },
            ]}
          />
        </div>

        {/* Search + filters */}
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="w-full min-w-0 lg:max-w-sm">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search tasks..."
                className="w-full"
              />
            </div>

            {/* Filters */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-auto lg:flex lg:w-auto lg:items-center">
              <FilterDropdown
                label="Priority"
                value={priority}
                options={TASK_PRIORITIES}
                onChange={setPriority}
                className="w-full lg:w-44"
              />

              <FilterDropdown
                label="Assigned"
                value={assignee}
                options={users.map(
                  (item) => item.display_name
                )}
                onChange={setAssignee}
                className="w-full lg:w-52"
              />
            </div>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="min-w-0 overflow-hidden">
            <TableSkeleton
              rows={6}
              columns={4}
            />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={
              hasFilters
                ? 'No tasks match your filters'
                : tab === 'completed'
                  ? 'Nothing completed yet'
                  : 'No tasks here'
            }
            message={
              hasFilters
                ? 'Try a different search term or clear the filters.'
                : 'Tasks you add will show up in this list.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  icon={Plus}
                  onClick={openCreateForm}
                >
                  Add Task
                </Button>
              )
            }
          />
        ) : (
          <div className="w-full min-w-0 overflow-hidden">
            <ul className="w-full divide-y divide-slate-100">
              {visible.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={(item) => {
                    setEditing(item)
                    setFormOpen(true)
                  }}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Task form */}
      <TaskFormModal
        open={formOpen}
        task={editing}
        contacts={contacts}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this task?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from your task list.`
            : ''
        }
        confirmLabel="Delete task"
      />
    </div>
  )
}