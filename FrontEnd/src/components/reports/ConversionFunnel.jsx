import Card, { CardHeader } from '../ui/Card'
import { cn } from '../../utils/format'

/**
 * The funnel as this CRM defines it:
 *   every lead ever → converted into a customer → opened as a deal → won.
 *
 * "Total leads" counts leads still in the leads list plus everyone who has
 * already been converted, because converting removes a lead from that list.
 */
export default function ConversionFunnel({
  totalLeads,
  movedToContacts,
  dealsOpened,
  wonDeals,
}) {
  const rate = totalLeads ? Math.round((movedToContacts / totalLeads) * 100) : 0

  const steps = [
    { label: 'Total Leads', value: totalLeads, tone: 'bg-slate-400' },
    { label: 'Moved to Contacts', value: movedToContacts, tone: 'bg-brand-500' },
    { label: 'Moved to Deals', value: dealsOpened, tone: 'bg-violet-500' },
    { label: 'Won', value: wonDeals, tone: 'bg-emerald-500' },
  ]

  return (
    <Card>
      <CardHeader title="Lead Conversion" subtitle="Lead → contact → deal → won" />
      <div className="p-5">
        <div className="space-y-3">
          {steps.map((step) => {
            const percent = totalLeads ? Math.round((step.value / totalLeads) * 100) : 0
            return (
              <div key={step.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">{step.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{step.value}</span>
                </div>
                <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                  <div
                    className={cn('flex h-full items-center rounded-lg px-2.5', step.tone)}
                    style={{ width: `${Math.max(percent, 8)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{percent}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Lead → contact conversion</span>
          <span className="text-xl font-semibold text-slate-900">{rate}%</span>
        </div>
      </div>
    </Card>
  )
}
