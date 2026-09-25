import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useClickOutside, useEscapeKey } from '../../hooks/useDismissable'
import { cn } from '../../utils/format'

/**
 * The "..." menu at the end of a table row.
 * `actions` is [{ label, icon, onClick, tone }] — tone "danger" turns it red.
 */
export default function RowActions({ actions, label = 'Row actions' }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(open, () => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-pop animate-fade-in"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
                action.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50',
                action.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'
              )}
            >
              {action.icon ? <action.icon className="h-4 w-4 shrink-0 opacity-70" /> : null}
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
