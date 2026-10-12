import {
  ArrowRightLeft,
  Briefcase,
  CircleSlash,
  FileClock,
  PenLine,
  Trophy,
  UserCheck,
  UserPlus,
  UserRoundCog,
  XCircle,
  Trash2,
  GitMerge,
} from 'lucide-react'
import EmptyState from '../ui/EmptyState'

/**
 * EPIC 9 — system-owned record history.
 *
 * History is deliberately separate from Activity: it is an append-only audit
 * trail of system-recorded lifecycle changes and cannot be typed by a user.
 */
const ACTION_STYLES = {
  lead_captured: { icon: UserPlus, className: 'text-slate-500' },
  qualified: { icon: UserCheck, className: 'text-emerald-600' },
  not_qualified: { icon: CircleSlash, className: 'text-slate-400' },
  moved_to_contacts: { icon: ArrowRightLeft, className: 'text-brand-600' },
  deal_created: { icon: Briefcase, className: 'text-brand-600' },
  deal_value_updated: { icon: PenLine, className: 'text-amber-600' },
  deal_stage_changed: { icon: ArrowRightLeft, className: 'text-amber-600' },
  deal_won: { icon: Trophy, className: 'text-emerald-600' },
  deal_lost: { icon: XCircle, className: 'text-red-500' },
  reassigned: { icon: UserRoundCog, className: 'text-brand-600' },
  edited: { icon: PenLine, className: 'text-slate-500' },
  merged: { icon: GitMerge, className: 'text-brand-600' },
  deleted: { icon: Trash2, className: 'text-red-500' },
}

function stamp(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })
}

export default function HistoryTimeline({ items = [] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileClock}
        title="No history yet"
        message="System-recorded lifecycle changes appear here automatically. Nothing in History can be typed by hand."
      />
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        History is an append-only system record. Nothing here is typed, edited, or deleted by a
        user. Log calls, emails, meetings, and notes in Activity instead.
      </p>
      <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {items.map((item) => {
          const style = ACTION_STYLES[item.type] ?? ACTION_STYLES.edited
          const Icon = style.icon

          return (
            <li key={item.id} className="flex items-start gap-3 px-3 py-2.5">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.className}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.detail}</p>
                ) : null}
                <p className="mt-1 font-mono text-[10px] tracking-wide text-slate-400">
                  {stamp(item.timestamp)} · {item.actor || 'System'}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
