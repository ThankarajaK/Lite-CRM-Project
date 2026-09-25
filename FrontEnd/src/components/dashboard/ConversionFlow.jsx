import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card, { CardHeader } from '../ui/Card'
import { cn, formatCurrency } from '../../utils/format'

/**
 * The whole process as four numbers:
 *
 *   Leads → Contacts → Open deals → Won
 *
 * Each box links to the screen where that step happens, so the dashboard
 * doubles as a map of the workflow.
 */
export default function ConversionFlow({ stats }) {
  const steps = [
    {
      label: 'Leads',
      value: stats.totalLeads,
      caption: `${stats.qualifiedLeads} qualified`,
      to: '/leads',
      accent: 'border-t-slate-300',
    },
    {
      label: 'Contacts',
      value: stats.totalContacts,
      caption: `${stats.contactsWithoutDeal} with no deal yet`,
      to: '/contacts',
      accent: 'border-t-brand-500',
    },
    {
      label: 'Open deals',
      value: stats.openDeals,
      caption: formatCurrency(stats.pipelineValue, { compact: true }),
      to: '/deals',
      accent: 'border-t-amber-400',
    },
    {
      label: 'Won',
      value: stats.wonDeals,
      caption: formatCurrency(stats.wonValue, { compact: true }),
      to: '/deals',
      accent: 'border-t-emerald-500',
    },
  ]

  return (
    <Card>
      <CardHeader
        title="Sales Process"
        subtitle="Capture a lead, move it to Contacts, then open a deal"
      />
      <div className="scrollbar-slim overflow-x-auto p-5">
        <div className="flex min-w-max items-stretch gap-2 lg:min-w-0">
          {steps.map((step, index) => (
            <div key={step.label} className="flex flex-1 items-center gap-2">
              <Link
                to={step.to}
                className={cn(
                  'w-40 flex-1 rounded-lg border border-slate-200 border-t-[3px] bg-slate-50/70 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-white',
                  step.accent
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {step.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{step.value}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{step.caption}</p>
              </Link>
              {index < steps.length - 1 ? (
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
