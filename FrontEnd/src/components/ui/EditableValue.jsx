import { useEffect, useRef, useState } from 'react'
import { Check, Lock, Pencil, X } from 'lucide-react'
import Tooltip from './Tooltip'
import { cn, formatCurrency } from '../../utils/format'

/**
 * Inline editable currency value.
 *
 * Used for deal values while the deal is still open.
 *
 * Behavior:
 * - Enter → save
 * - Escape → cancel
 * - Blur → save
 * - Won / Lost → locked
 *
 * Responsive:
 * - Keeps the value from overflowing narrow cards.
 * - Uses touch-friendly controls on smaller screens.
 * - Preserves the existing visual hierarchy.
 */
export default function EditableValue({
  value,
  onSave,
  editable = true,
  size = 'md',
  lockedHint = 'Locked — this deal is closed',
  label = 'deal value',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  const inputRef = useRef(null)

  useEffect(() => {
    setDraft(String(value ?? ''))
  }, [value])

  useEffect(() => {
    if (!editing) return

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const text = size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'

  function commit() {
    const next = Number(draft)

    setEditing(false)

    if (Number.isNaN(next) || next < 0 || next === Number(value)) {
      setDraft(String(value ?? ''))
      return
    }

    onSave?.(next)
  }

  function cancel() {
    setDraft(String(value ?? ''))
    setEditing(false)
  }

  function startEditing(event) {
    event.stopPropagation()
    setEditing(true)
  }

  if (!editable) {
    return (
      <Tooltip label={lockedHint} side="top">
        <span
          className={cn(
            'inline-flex min-w-0 max-w-full items-center gap-1.5 font-semibold tracking-tight text-slate-900',
            text
          )}
        >
          <span className="truncate">{formatCurrency(value)}</span>

          <Lock
            className="h-3.5 w-3.5 shrink-0 text-slate-300"
            aria-hidden="true"
          />
        </span>
      </Tooltip>
    )
  }

  if (editing) {
    return (
      <span
        className="inline-flex max-w-full items-center gap-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Input */}
        <span className="relative min-w-0">
          <span
            className="
              pointer-events-none
              absolute
              left-2.5
              top-1/2
              -translate-y-1/2
              text-sm
              text-slate-400
            "
            aria-hidden="true"
          >
            ₹
          </span>

          <input
            ref={inputRef}
            type="number"
            min="0"
            step="100"
            inputMode="decimal"
            value={draft}
            aria-label={`Edit ${label}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.stopPropagation()
                commit()
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancel()
              }
            }}
            className="
              h-9
              w-28
              rounded-lg
              border
              border-brand-400
              bg-white
              py-1
              pl-6
              pr-2
              text-sm
              font-semibold
              text-slate-900
              shadow-sm
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-brand-500
              focus:ring-2
              focus:ring-brand-500/20
              sm:w-32
              sm:text-base
            "
          />
        </span>

        {/* Save */}
        <button
          type="button"
          aria-label={`Save ${label}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-emerald-600
            transition-colors
            hover:bg-emerald-50
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-emerald-500
            focus-visible:ring-offset-1
            active:bg-emerald-100
          "
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Cancel */}
        <button
          type="button"
          aria-label={`Cancel editing ${label}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancel}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-slate-400
            transition-colors
            hover:bg-slate-100
            hover:text-slate-600
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-slate-400
            focus-visible:ring-offset-1
            active:bg-slate-200
          "
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label={`${formatCurrency(value)} — click to edit the ${label}`}
      onClick={startEditing}
      className={cn(
        'group/val inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-1 -mx-1 font-semibold tracking-tight text-slate-900',
        'transition-colors hover:bg-brand-50 hover:text-brand-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        'active:bg-brand-100',
        text
      )}
    >
      <span className="truncate">{formatCurrency(value)}</span>

      <Pencil
        className="
          h-3.5
          w-3.5
          shrink-0
          text-slate-300
          transition-colors
          group-hover/val:text-brand-500
        "
        aria-hidden="true"
      />
    </button>
  )
}