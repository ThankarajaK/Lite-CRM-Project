import {
  ArrowRightLeft,
  Briefcase,
  CheckCircle2,
  Mail,
  PenLine,
  Phone,
  StickyNote,
  Trophy,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import { formatRelativeTime } from '../../utils/format'

/**
 * The Dashboard feed is the one place both logs are shown together — it is a
 * stream of everything happening across the team. Inside a record they stay
 * apart, in the Activity and History tabs.
 */
const ACTIVITY_STYLES = {
  // Logged by a rep
  Call: {
    icon: Phone,
    className: 'bg-brand-50 text-brand-600',
  },
  Email: {
    icon: Mail,
    className: 'bg-cyan-50 text-cyan-600',
  },
  Meeting: {
    icon: Users,
    className: 'bg-violet-50 text-violet-600',
  },
  Note: {
    icon: StickyNote,
    className: 'bg-slate-100 text-slate-600',
  },
  'Follow-up': {
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-600',
  },

  // Recorded by the system
  'Lead captured': {
    icon: UserPlus,
    className: 'bg-brand-50 text-brand-600',
  },
  'Moved to Contacts': {
    icon: ArrowRightLeft,
    className: 'bg-emerald-50 text-emerald-600',
  },
  'Contact created': {
    icon: Users,
    className: 'bg-emerald-50 text-emerald-600',
  },
  'Deal created': {
    icon: Briefcase,
    className: 'bg-amber-50 text-amber-600',
  },
  'Value updated': {
    icon: PenLine,
    className: 'bg-amber-50 text-amber-600',
  },
  'Stage changed': {
    icon: ArrowRightLeft,
    className: 'bg-amber-50 text-amber-600',
  },
  'Deal won': {
    icon: Trophy,
    className: 'bg-emerald-50 text-emerald-600',
  },
  'Deal lost': {
    icon: XCircle,
    className: 'bg-red-50 text-red-600',
  },
  'Task completed': {
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-600',
  },
}

/** Chronological feed of what the team has been doing. */
export default function RecentActivities({
  activities,
  limit = 6,
}) {
  const items = activities.slice(0, limit)

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <CardHeader
        title="Recent Activities"
        subtitle="What your team has been up to"
      />

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}
      {items.length === 0 ? (
        <EmptyState
          compact
          title="No activity yet"
          message="Actions you take will show up here."
        />
      ) : (
        <ul className="min-w-0 divide-y divide-slate-100">
          {items.map((activity) => {
            const style =
              ACTIVITY_STYLES[activity.type] ??
              ACTIVITY_STYLES.Note

            const Icon = style.icon

            return (
              <li
                key={activity.id}
                className="
                  flex
                  min-w-0
                  items-start
                  gap-2.5
                  px-4
                  py-3
                  sm:gap-3
                  sm:px-5
                  sm:py-3.5
                "
              >
                {/* =================================================
                    ACTIVITY ICON
                    ================================================= */}
                <span
                  className={`
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    sm:h-9
                    sm:w-9
                    ${style.className}
                  `}
                >
                  <Icon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </span>

                {/* =================================================
                    ACTIVITY CONTENT
                    ================================================= */}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm leading-5 text-slate-700">
                    <span className="font-medium text-slate-900">
                      {activity.actor}
                    </span>{' '}
                    {activity.description}
                  </p>

                  {activity.detail ? (
                    <p
                      className="
                        mt-0.5
                        truncate
                        text-sm
                        leading-5
                        text-slate-500
                      "
                      title={activity.detail}
                    >
                      {activity.detail}
                    </p>
                  ) : null}
                </div>

                {/* =================================================
                    TIME
                    ================================================= */}
                <span
                  className="
                    hidden
                    shrink-0
                    whitespace-nowrap
                    text-xs
                    text-slate-400
                    sm:block
                  "
                >
                  {formatRelativeTime(
                    activity.timestamp
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}