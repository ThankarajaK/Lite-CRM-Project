import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import { formatCurrency } from '../../utils/format'

/** Stages shown in the dashboard pipeline strip, in order. */
const PIPELINE_STAGES = ['Proposal', 'Negotiation', 'Won', 'Lost']

const STAGE_ACCENT = {
  Proposal: 'border-t-brand-500',
  Negotiation: 'border-t-amber-400',
  Won: 'border-t-emerald-500',
  Lost: 'border-t-red-400',
}

/**
 * Horizontal "New → Contacted → Proposal → Negotiation → Won" summary
 * showing the deal count and total value at each stage.
 * Scrolls horizontally on narrow screens.
 */
export default function PipelineSummary({ deals }) {
  const stages = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stage === stage)
        return {
          stage,
          count: stageDeals.length,
          value: stageDeals.reduce((total, deal) => total + (Number(deal.value) || 0), 0),
        }
      }),
    [deals]
  )

  const pipelineTotal = stages.reduce((total, stage) => total + stage.value, 0)

  return (
    <Card>
      <CardHeader
        title="Sales Pipeline"
        subtitle={`${formatCurrency(pipelineTotal)} across ${stages.reduce((sum, s) => sum + s.count, 0)} deals`}
      />
      <div className="scrollbar-slim overflow-x-auto p-5">
        <div className="flex min-w-max items-stretch gap-2 lg:min-w-0">
          {stages.map((stage, index) => (
            <div key={stage.stage} className="flex flex-1 items-center gap-2">
              <div
                className={`w-40 flex-1 rounded-lg border border-slate-200 border-t-[3px] bg-slate-50/70 px-4 py-3 ${
                  STAGE_ACCENT[stage.stage] ?? 'border-t-slate-300'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stage.stage}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{stage.count}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {stage.count === 1 ? 'deal' : 'deals'} · {formatCurrency(stage.value, { compact: true })}
                </p>
              </div>
              {index < stages.length - 1 ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
