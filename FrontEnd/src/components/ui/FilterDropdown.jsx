import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useClickOutside, useEscapeKey } from '../../hooks/useDismissable'
import { cn } from '../../utils/format'

/**
 * Single-select filter, e.g. Status / Source / Assigned To.
 * `value` of "" means "All".
 */
export default function FilterDropdown({
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
  className,
}) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(open, () => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  const items = [{ label: allLabel, value: '' }, ...options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option
  )]
  const active = items.find((item) => item.value === value) ?? items[0]

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm transition-colors',
          value
            ? 'border-brand-300 bg-brand-50/60 text-brand-800'
            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
        )}
      >
        <span className="truncate">
          <span className="text-slate-500">{label}:</span>{' '}
          <span className="font-medium">{active.label}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 z-30 mt-1 max-h-64 w-full min-w-[12rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-pop animate-fade-in"
        >
          {items.map((item) => (
            <li key={item.value || 'all'}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="truncate">{item.label}</span>
                {item.value === value ? (
                  <Check className="h-4 w-4 shrink-0 text-brand-600" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
