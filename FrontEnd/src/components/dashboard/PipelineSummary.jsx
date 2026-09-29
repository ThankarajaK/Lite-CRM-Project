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
 * Responsive sales pipeline summary.
 *
 * Desktop:
 * - Four stages displayed in one row.
 *
 * Tablet / Mobile:
 * - Pipeline remains horizontally scrollable inside the card.
 * - The page itself does not receive horizontal overflow.
 *
 * Existing calculations and pipeline behavior are preserved.
 */
export default function PipelineSummary({ deals }) {
  const stages = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => {
        const stageDeals = deals.filter(
          (deal) => deal.stage === stage
        )

        return {
          stage,
          count: stageDeals.length,
          value: stageDeals.reduce(
            (total, deal) =>
              total + (Number(deal.value) || 0),
            0
          ),
        }
      }),
    [deals]
  )

  const pipelineTotal = stages.reduce(
    (total, stage) => total + stage.value,
    0
  )

  const totalDeals = stages.reduce(
    (sum, stage) => sum + stage.count,
    0
  )

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <CardHeader
        title="Sales Pipeline"
        subtitle={`${formatCurrency(
          pipelineTotal
        )} across ${totalDeals} ${
          totalDeals === 1 ? 'deal' : 'deals'
        }`}
      />

      {/* =====================================================
          PIPELINE
          ===================================================== */}
      <div
        className="
          w-full
          min-w-0
          overflow-x-auto
          overflow-y-hidden
          scrollbar-slim
          overscroll-x-contain
        "
      >
        <div
          className="
            flex
            min-w-max
            items-stretch
            gap-2
            p-4
            sm:p-5
            lg:min-w-0
            lg:w-full
          "
        >
          {stages.map((stage, index) => (
            <div
              key={stage.stage}
              className="
                flex
                shrink-0
                items-center
                gap-2
                lg:min-w-0
                lg:flex-1
              "
            >
              {/* =================================================
                  STAGE CARD
                  ================================================= */}
              <div
                className={`
                  w-[145px]
                  shrink-0
                  min-w-0
                  rounded-lg
                  border
                  border-slate-200
                  border-t-[3px]
                  bg-slate-50/70
                  px-3
                  py-3
                  transition-colors
                  hover:border-slate-300
                  hover:bg-white
                  sm:w-[160px]
                  sm:px-4
                  lg:w-full
                  ${
                    STAGE_ACCENT[stage.stage] ??
                    'border-t-slate-300'
                  }
                `}
              >
                {/* Stage */}
                <p
                  className="
                    truncate
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-500
                    sm:text-xs
                  "
                  title={stage.stage}
                >
                  {stage.stage}
                </p>

                {/* Count */}
                <p
                  className="
                    mt-1.5
                    truncate
                    text-xl
                    font-semibold
                    tracking-tight
                    text-slate-900
                    sm:mt-2
                  "
                  title={String(stage.count)}
                >
                  {stage.count}
                </p>

                {/* Value */}
                <p
                  className="
                    mt-0.5
                    truncate
                    text-xs
                    leading-5
                    text-slate-500
                  "
                  title={`${stage.count === 1 ? 'deal' : 'deals'} · ${formatCurrency(
                    stage.value,
                    { compact: true }
                  )}`}
                >
                  {stage.count === 1
                    ? 'deal'
                    : 'deals'}{' '}
                  ·{' '}
                  {formatCurrency(stage.value, {
                    compact: true,
                  })}
                </p>
              </div>

              {/* =================================================
                  STAGE ARROW
                  ================================================= */}
              {index < stages.length - 1 ? (
                <ChevronRight
                  className="
                    h-4 w-4
                    shrink-0
                    text-slate-300
                  "
                  aria-hidden="true"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}