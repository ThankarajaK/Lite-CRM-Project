import { AlertCircle } from 'lucide-react'
import { cn } from '../../utils/format'

/**
 * Label + control + inline error message.
 * Errors are plain strings; see `hooks/useForm.js` for the validation helper.
 */
export function Field({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ error, className, ...props }) {
  return (
    <input
      className={cn('field-input', error && 'field-input-error', className)}
      aria-invalid={Boolean(error)}
      {...props}
    />
  )
}

export function Textarea({ error, className, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn('field-input resize-y', error && 'field-input-error', className)}
      aria-invalid={Boolean(error)}
      {...props}
    />
  )
}

export function Select({ error, className, options = [], placeholder, children, ...props }) {
  return (
    <select
      className={cn('field-input h-[38px] pr-8', error && 'field-input-error', className)}
      aria-invalid={Boolean(error)}
      {...props}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {children ??
        options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const label = typeof option === 'string' ? option : option.label
          return (
            <option key={value} value={value}>
              {label}
            </option>
          )
        })}
    </select>
  )
}
