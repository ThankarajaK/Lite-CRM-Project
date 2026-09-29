import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useClickOutside, useEscapeKey } from '../../hooks/useDismissable'
import { cn } from '../../utils/format'

/**
 * Single-select filter, e.g. Status / Source / Assigned To.
 *
 * `value` of "" means "All".
 *
 * Responsive behavior:
 * - Uses the available width of its parent
 * - Prevents horizontal overflow
 * - Keeps the dropdown aligned with the trigger
 * - Long labels are truncated safely
 * - Preserves the existing controlled API
 */
export default function FilterDropdown({
  label,
  value,
  options = [],
  onChange,
  allLabel = 'All',
  className,
}) {
  const [open, setOpen] = useState(false)

  const ref = useClickOutside(open, () => setOpen(false))

  useEscapeKey(open, () => setOpen(false))

  const items = [
    { label: allLabel, value: '' },
    ...options.map((option) =>
      typeof option === 'string'
        ? { label: option, value: option }
        : option
    ),
  ]

  const active = items.find((item) => item.value === value) ?? items[0]

  function handleSelect(nextValue) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      className={cn(
        'relative min-w-0 w-full max-w-full',
        className
      )}
    >
      {/* Filter trigger */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full min-w-0 max-w-full items-center justify-between',
          'gap-2 rounded-lg border bg-white px-3 text-sm',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-brand-500 focus-visible:ring-offset-1',
          value
            ? 'border-brand-300 bg-brand-50/60 text-brand-800'
            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="text-slate-500">{label}:</span>{' '}
          <span className="font-medium">{active.label}</span>
        </span>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="
            absolute
            left-0
            z-40
            mt-1.5
            max-h-64
            w-full
            min-w-[12rem]
            max-w-[calc(100vw-2rem)]
            overflow-x-hidden
            overflow-y-auto
            rounded-lg
            border
            border-slate-200
            bg-white
            py-1
            shadow-pop
            animate-fade-in
          "
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              No options available
            </li>
          ) : (
            items.map((item) => {
              const selected = item.value === value

              return (
                <li key={item.value || 'all'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(item.value)}
                    className={cn(
                      'flex w-full min-w-0 items-center justify-between',
                      'gap-3 px-3 py-2 text-left text-sm',
                      'transition-colors',
                      'focus-visible:outline-none focus-visible:bg-slate-100',
                      selected
                        ? 'bg-brand-50/60 text-brand-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>

                    {selected ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-brand-600"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}