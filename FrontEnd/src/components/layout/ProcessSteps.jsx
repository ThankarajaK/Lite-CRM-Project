import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../utils/format'

/**
 * The three steps of the sales process, shown as a strip at the top of the
 * Leads, Contacts and Deals screens so it is always obvious where you are
 * and what the next step is.
 *
 *   Leads  →  Contacts  →  Deals
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
      className="scrollbar-slim overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-card"
    >
      <ol className="flex min-w-max items-center gap-1">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex
          const isDone = index < currentIndex
          return (
            <li key={step.id} className="flex items-center gap-1">
              <Link
                to={step.to}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                  isCurrent
                    ? 'bg-brand-50 ring-1 ring-inset ring-brand-200'
                    : 'hover:bg-slate-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isCurrent
                      ? 'bg-brand-600 text-white'
                      : isDone
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block whitespace-nowrap text-sm font-medium leading-tight',
                      isCurrent ? 'text-brand-800' : 'text-slate-700'
                    )}
                  >
                    {step.label}
                    {typeof counts[step.id] === 'number' ? (
                      <span className={isCurrent ? 'text-brand-600' : 'text-slate-400'}>
                        {' '}
                        · {counts[step.id]}
                      </span>
                    ) : null}
                  </span>
                  <span className="block whitespace-nowrap text-xs leading-tight text-slate-500">
                    {step.caption}
                  </span>
                </span>
              </Link>
              {index < STEPS.length - 1 ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
