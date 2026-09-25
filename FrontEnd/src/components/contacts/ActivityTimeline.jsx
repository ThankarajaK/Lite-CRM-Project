import { Briefcase, CheckCircle2, Mail, Phone, StickyNote, Users } from 'lucide-react'
import EmptyState from '../ui/EmptyState'
import { formatRelativeTime } from '../../utils/format'

/**
 * The ACTIVITY log — what a rep actually did.
 *
 * Only the five activity types appear here. System events (moved, deal
 * created, value changed) live in the History tab instead, so this list stays
 * a readable account of the conversation.
 */
const TYPE_STYLES = {
  Call: { icon: Phone, className: 'bg-brand-50 text-brand-600 ring-brand-100' },
  Email: { icon: Mail, className: 'bg-cyan-50 text-cyan-600 ring-cyan-100' },
  Meeting: { icon: Users, className: 'bg-violet-50 text-violet-600 ring-violet-100' },
  Note: { icon: StickyNote, className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  'Follow-up': { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
}

export default function ActivityTimeline({ items = [], action }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={StickyNote}
        title="Nothing logged yet"
        message="Calls, emails, meetings and notes you log will appear here."
        action={action}
      />
    )
  }

  return (
    <ol className="relative space-y-5 pl-2">
      {items.map((item, index) => {
        const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.Note
        const Icon = style.icon
        const isLast = index === items.length - 1
        return (
          <li key={item.id} className="relative flex gap-3">
            {!isLast ? (
              <span className="absolute left-[15px] top-8 h-[calc(100%+4px)] w-px bg-slate-200" />
            ) : null}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${style.className}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <span className="text-xs text-slate-400">{formatRelativeTime(item.timestamp)}</span>
              </div>
              {item.detail ? (
                <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{item.detail}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span>
                  {item.type} · {item.actor}
                </span>
                {item.deal ? (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                    <Briefcase className="h-3 w-3" />
                    {item.deal}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
