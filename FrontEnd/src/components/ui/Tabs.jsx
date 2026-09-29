import { cn } from '../../utils/format'

/**
 * Responsive underlined tab strip.
 *
 * `tabs` is [{ id, label, count }] — count renders as a small pill.
 *
 * Responsive behavior:
 * - Horizontal scrolling on narrow screens
 * - Tabs keep their natural width
 * - Larger touch-friendly vertical spacing
 * - Prevents labels/counts from wrapping
 * - Preserves the existing controlled API
 */
export default function Tabs({
  tabs = [],
  value,
  onChange,
  className,
}) {
  return (
    <div
      className={cn(
        'w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden',
        'border-b border-slate-200 scrollbar-slim',
        className
      )}
    >
      <nav
        className="flex min-w-max items-center gap-0.5"
        role="tablist"
        aria-orientation="horizontal"
      >
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
                'relative flex min-h-10 shrink-0 items-center justify-center',
                'gap-2 whitespace-nowrap border-b-2 px-3 py-2.5',
                'text-sm font-medium leading-5',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                'sm:px-3.5',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              <span>{tab.label}</span>

              {typeof tab.count === 'number' ? (
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center',
                    'rounded-full px-1.5 py-0.5',
                    'text-[11px] font-semibold leading-4',
                    active
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-slate-100 text-slate-600'
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