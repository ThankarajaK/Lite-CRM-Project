import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../utils/format'

/**
 * The three steps of the sales process, shown at the top of the
 * Leads, Contacts and Deals screens.
 *
 * Leads → Contacts → Deals
 *
 * Responsive behavior:
 * - Desktop: full process strip with captions.
 * - Mobile: horizontally scrollable without page overflow.
 * - Current step remains visually prominent.
 */
const STEPS = [
  {
    id: 'leads',
    to: '/leads',
    label: 'Leads',
    caption: 'Capture and qualify',
  },
  {
    id: 'contacts',
    to: '/contacts',
    label: 'Contacts',
    caption: 'Log calls, emails, meetings',
  },
  {
    id: 'deals',
    to: '/deals',
    label: 'Deals',
    caption: 'Proposal → Won or Lost',
  },
]

export default function ProcessSteps({ current, counts = {} }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current)

  return (
    <nav
      aria-label="Sales process"
      className="
        w-full
        min-w-0
        max-w-full
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        p-1.5
        shadow-card
        sm:p-2
      "
    >
      <div className="scrollbar-slim max-w-full overflow-x-auto overflow-y-hidden">
        <ol className="flex min-w-max items-center gap-0.5 sm:gap-1">
          {STEPS.map((step, index) => {
            const isCurrent = index === currentIndex
            const isDone = index < currentIndex

            return (
              <li
                key={step.id}
                className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1"
              >
                <Link
                  to={step.to}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    `
                      flex
                      min-h-12
                      items-center
                      gap-2
                      rounded-lg
                      px-2.5
                      py-2
                      transition-colors
                      max-[430px]:gap-1.5
                      max-[430px]:px-2
                      max-[430px]:py-1.5
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-brand-500
                      focus-visible:ring-offset-1
                      sm:gap-2.5
                      sm:px-3
                    `,
                    isCurrent
                      ? 'bg-brand-50 ring-1 ring-inset ring-brand-200'
                      : 'hover:bg-slate-50'
                  )}
                >
                  {/* Step number */}
                  <span
                    className={cn(
                      `
                        flex
                        h-6
                        w-6
                        shrink-0
                        max-[430px]:h-5
                        max-[430px]:w-5
                        items-center
                        justify-center
                        rounded-full
                        text-xs
                        font-semibold
                        max-[430px]:text-[11px]
                      `,
                      isCurrent
                        ? 'bg-brand-600 text-white'
                        : isDone
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {index + 1}
                  </span>

                  {/* Step information */}
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block whitespace-nowrap text-sm font-medium leading-tight max-[430px]:text-xs',
                        isCurrent
                          ? 'text-brand-800'
                          : 'text-slate-700'
                      )}
                    >
                      {step.label}

                      {typeof counts[step.id] === 'number' ? (
                        <span
                          className={
                            isCurrent
                              ? 'text-brand-600'
                              : 'text-slate-400'
                          }
                        >
                          {' '}
                          · {counts[step.id]}
                        </span>
                      ) : null}
                    </span>

                    <span className="block whitespace-nowrap text-xs leading-tight text-slate-500 max-[430px]:hidden">
                      {step.caption}
                    </span>
                    <span className="sr-only">{step.caption}</span>
                  </span>
                </Link>

                {/* Connector */}
                {index < STEPS.length - 1 ? (
                  <ChevronRight
                    className="
                      h-4
                      w-4
                      shrink-0
                      text-slate-300
                    "
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}