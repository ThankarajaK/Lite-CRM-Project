import { cn } from '../../utils/format'

export const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
]

/** Segmented Today / This Week / This Month control on the dashboard. */
export default function DateFilter({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5"
    >
      {DATE_RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          onClick={() => onChange(range.id)}
          aria-pressed={value === range.id}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === range.id
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
