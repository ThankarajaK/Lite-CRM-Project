import { Check, Pencil, Trash2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import StatusBadge from '../ui/StatusBadge'
import Badge from '../ui/Badge'
import Tooltip from '../ui/Tooltip'
import { cn, formatDueDate, isOverdue } from '../../utils/format'

/**
 * One row in the task list.
 * Ticking the checkbox marks it complete — the row then dims and strikes through.
 */
export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const overdue = !task.completed && isOverdue(task.dueDate)

  return (
    <li
      className={cn(
        'group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:items-center',
        task.completed && 'bg-slate-50/60'
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'not completed' : 'completed'}`}
        onClick={() => onToggle(task)}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors sm:mt-0',
          task.completed
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-300 bg-white hover:border-brand-500'
        )}
      >
        {task.completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </button>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium',
            task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
          )}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          <span className="truncate">{task.contact}</span>
          <span className="text-slate-300">·</span>
          <span className={cn(overdue && 'font-medium text-red-600')}>
            {formatDueDate(task.dueDate, task.dueTime)}
          </span>
          <span className="text-slate-300">·</span>
          <span>{task.type}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex shrink-0 items-center gap-2">
        {overdue ? <Badge tone="red">Overdue</Badge> : null}
        <StatusBadge status={task.priority} dot={false} className="hidden sm:inline-flex" />
        <StatusBadge
          status={task.completed ? 'Completed' : 'Pending'}
          dot={false}
          className="hidden md:inline-flex"
        />
        <Tooltip label={task.owner} side="left">
          <Avatar name={task.owner} size="xs" />
        </Tooltip>

        <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Tooltip label="Edit task" side="top">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="Delete task" side="top">
            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label={`Delete ${task.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </li>
  )
}
