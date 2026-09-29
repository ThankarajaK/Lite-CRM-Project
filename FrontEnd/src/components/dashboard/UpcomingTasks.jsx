import { useMemo } from 'react'
import { CalendarCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card, { CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import EmptyState from '../ui/EmptyState'
import Avatar from '../ui/Avatar'
import { cn, formatDueDate, isOverdue } from '../../utils/format'

/**
 * The next few open tasks, soonest first.
 *
 * Responsive behavior:
 * - Comfortable spacing on desktop.
 * - Compact rows on mobile.
 * - Long task/contact names cannot create horizontal overflow.
 * - Priority remains available on larger screens.
 * - Owner avatar remains visible at all sizes.
 *
 * Existing task filtering and sorting behavior is preserved.
 */
export default function UpcomingTasks({
  tasks,
  limit = 5,
}) {
  const items = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .sort(
          (a, b) =>
            new Date(a.dueDate) -
            new Date(b.dueDate)
        )
        .slice(0, limit),
    [tasks, limit]
  )

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <CardHeader
        title="Upcoming Tasks"
        subtitle="Your next follow-ups"
        action={
          <Link
            to="/tasks"
            className="
              shrink-0
              text-xs
              font-semibold
              text-brand-600
              transition-colors
              hover:text-brand-700
              sm:text-sm
            "
          >
            View all
          </Link>
        }
      />

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarCheck2}
          title="You're all caught up"
          message="No open tasks right now."
        />
      ) : (
        <ul className="min-w-0 divide-y divide-slate-100">
          {items.map((task) => {
            const overdue = isOverdue(task.dueDate)

            return (
              <li
                key={task.id}
                className="
                  flex
                  min-w-0
                  items-center
                  gap-2.5
                  px-4
                  py-3
                  transition-colors
                  hover:bg-slate-50/70
                  sm:gap-3
                  sm:px-5
                  sm:py-3.5
                "
              >
                {/* =================================================
                    TASK CONTENT
                    ================================================= */}
                <div className="min-w-0 flex-1">
                  <p
                    className="
                      truncate
                      text-sm
                      font-medium
                      leading-5
                      text-slate-900
                    "
                    title={task.title}
                  >
                    {task.title}
                  </p>

                  <div
                    className="
                      mt-0.5
                      flex
                      min-w-0
                      flex-wrap
                      items-center
                      gap-x-1.5
                      gap-y-0.5
                      text-xs
                      leading-5
                      text-slate-500
                      sm:gap-x-2
                    "
                  >
                    {/* Contact */}
                    <span
                      className="min-w-0 max-w-full truncate"
                      title={task.contact}
                    >
                      {task.contact}
                    </span>

                    <span
                      className="shrink-0 text-slate-300"
                      aria-hidden="true"
                    >
                      ·
                    </span>

                    {/* Due date */}
                    <span
                      className={cn(
                        'shrink-0',
                        overdue &&
                          'font-semibold text-red-600'
                      )}
                    >
                      {formatDueDate(
                        task.dueDate,
                        task.dueTime
                      )}
                    </span>
                  </div>
                </div>

                {/* =================================================
                    PRIORITY
                    ================================================= */}
                <StatusBadge
                  status={task.priority}
                  dot={false}
                  className="
                    hidden
                    shrink-0
                    sm:inline-flex
                  "
                />

                {/* =================================================
                    OWNER
                    ================================================= */}
                <div
                  className="shrink-0"
                  title={task.owner}
                >
                  <Avatar
                    name={task.owner}
                    size="xs"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}