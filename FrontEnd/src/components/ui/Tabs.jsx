import { cn } from '../../utils/format'

/**
 * Underlined tab strip.
 * `tabs` is [{ id, label, count }] — count renders as a small pill.
 */
export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('scrollbar-slim overflow-x-auto border-b border-slate-200', className)}>
      <nav className="flex min-w-max gap-1" role="tablist">
        {tabs.map((tab) => {
          const active = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
