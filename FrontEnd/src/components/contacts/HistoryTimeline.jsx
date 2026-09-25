import {
  ArrowRightLeft,
  Briefcase,
  CircleSlash,
  FileClock,
  PenLine,
  Trophy,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react'
import EmptyState from '../ui/EmptyState'
import { formatDate, formatTime } from '../../utils/format'

/**
 * The HISTORY log — the audit trail.
 *
 * Every row here was written by the system, not by a person: the lead was
 * qualified, it moved to Contacts, a deal was created, the value changed, the
 * stage moved. It is deliberately drier and denser than the Activity tab —
 * a record of what happened, not an account of a conversation.
 */
const TYPE_STYLES = {
  'Lead captured': { icon: UserPlus, className: 'text-slate-500' },
  Qualified: { icon: UserCheck, className: 'text-emerald-600' },
  'Not qualified': { icon: CircleSlash, className: 'text-slate-400' },
  'Moved to Contacts': { icon: ArrowRightLeft, className: 'text-brand-600' },
  'Deal created': { icon: Briefcase, className: 'text-brand-600' },
  'Value updated': { icon: PenLine, className: 'text-amber-600' },
  'Stage changed': { icon: ArrowRightLeft, className: 'text-amber-600' },
  'Deal won': { icon: Trophy, className: 'text-emerald-600' },
  'Deal lost': { icon: XCircle, className: 'text-red-500' },
  'Record updated': { icon: PenLine, className: 'text-slate-400' },
}

/** "Sep 21, 2026 · 10:30" */
function stamp(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  const clock = formatTime(
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  )
  return `${formatDate(date)} · ${clock}`
}

export default function HistoryTimeline({ items = [] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileClock}
        title="No history yet"
        message="Stage changes and other system events are recorded here automatically."
      />
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Recorded automatically. Nothing here is typed by hand — log a call or a note in the
        Activity tab instead.
      </p>
      <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {items.map((item) => {
          const style = TYPE_STYLES[item.type] ?? TYPE_STYLES['Record updated']
          const Icon = style.icon
          return (
            <li key={item.id} className="flex items-start gap-3 px-3.5 py-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.className}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-sm text-slate-600">{item.detail}</p>
                ) : null}
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  {stamp(item.timestamp)} · {item.actor}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {item.type}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
