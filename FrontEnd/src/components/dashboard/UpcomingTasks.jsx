import { useMemo } from 'react'
import { CalendarCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card, { CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import EmptyState from '../ui/EmptyState'
import Avatar from '../ui/Avatar'
import { cn, formatDueDate, isOverdue } from '../../utils/format'

/** The next few open tasks, soonest first. */
export default function UpcomingTasks({ tasks, limit = 5 }) {
  const items = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, limit),
    [tasks, limit]
  )

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Upcoming Tasks"
        subtitle="Your next follow-ups"
        action={
          <Link
            to="/tasks"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            View all
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarCheck2}
          title="You're all caught up"
          message="No open tasks right now."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((task) => {
            const overdue = isOverdue(task.dueDate)
            return (
              <li key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span className="truncate">{task.contact}</span>
                    <span className="text-slate-300">·</span>
                    <span className={cn(overdue && 'font-medium text-red-600')}>
                      {formatDueDate(task.dueDate, task.dueTime)}
                    </span>
                  </div>
                </div>
                <StatusBadge status={task.priority} dot={false} className="hidden sm:inline-flex" />
                <Avatar name={task.owner} size="xs" />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
