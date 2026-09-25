import { Inbox } from 'lucide-react'

/** Shown when a filtered list returns nothing, or a section has no records. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message = 'Try adjusting your search or filters.',
  action,
  compact = false,
}) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center px-4 py-10 text-center'
          : 'flex flex-col items-center justify-center px-6 py-16 text-center'
      }
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
