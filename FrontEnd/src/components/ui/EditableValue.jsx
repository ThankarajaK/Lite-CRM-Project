import { useEffect, useRef, useState } from 'react'
import { Check, Lock, Pencil, X } from 'lucide-react'
import Tooltip from './Tooltip'
import { cn, formatCurrency } from '../../utils/format'

/**
 * A money figure you can edit in place.
 *
 * Used for the deal value, which a salesperson needs to change while a deal is
 * in Proposal or Negotiation. Pass `editable={false}` once the deal is Won or
 * Lost and it renders as a locked figure instead.
 *
 * Enter saves, Escape cancels, blur saves.
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
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const text = size === 'lg' ? 'text-3xl' : 'text-lg'

  function commit() {
    const next = Number(draft)
    setEditing(false)
    if (Number.isNaN(next) || next < 0 || next === value) {
      setDraft(String(value ?? ''))
      return
    }
    onSave(next)
  }

  function cancel() {
    setDraft(String(value ?? ''))
    setEditing(false)
  }

  if (!editable) {
    return (
      <Tooltip label={lockedHint} side="top">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-semibold tracking-tight text-slate-900',
            text
          )}
        >
          {formatCurrency(value)}
          <Lock className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
        </span>
      </Tooltip>
    )
  }

  if (editing) {
    return (
      <span
        className="inline-flex items-center gap-1"
        // Keep a click inside the editor from reaching the card behind it.
        onClick={(event) => event.stopPropagation()}
      >
        <span className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            $
          </span>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="100"
            value={draft}
            aria-label={`Edit ${label}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                // Stop the key reaching the card behind, which would open it.
                event.stopPropagation()
                commit()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancel()
              }
            }}
            className="w-32 rounded-lg border border-brand-400 bg-white py-1 pl-5 pr-2 text-base font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </span>
        <button
          type="button"
          aria-label="Save value"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancel}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label={`${formatCurrency(value)} — click to edit the ${label}`}
      onClick={(event) => {
        event.stopPropagation()
        setEditing(true)
      }}
      className={cn(
        'group/val inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 font-semibold tracking-tight text-slate-900',
        'transition-colors hover:bg-brand-50 hover:text-brand-700',
        text
      )}
    >
      {formatCurrency(value)}
      <Pencil className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover/val:text-brand-500" />
    </button>
  )
}
