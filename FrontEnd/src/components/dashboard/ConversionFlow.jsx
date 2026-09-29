import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card, { CardHeader } from '../ui/Card'
import { cn, formatCurrency } from '../../utils/format'

/**
 * The whole process as four numbers:
 *
 *   Leads → Contacts → Open deals → Won
 *
 * Responsive behavior:
 * - Desktop: four steps in one horizontal row.
 * - Tablet: steps remain readable with horizontal scrolling if needed.
 * - Mobile: compact horizontal workflow that can scroll without
 *   creating page-level horizontal overflow.
 *
 * Existing navigation, statistics and workflow are preserved.
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
      caption: formatCurrency(stats.pipelineValue, {
        compact: true,
      }),
      to: '/deals',
      accent: 'border-t-amber-400',
    },
    {
      label: 'Won',
      value: stats.wonDeals,
      caption: formatCurrency(stats.wonValue, {
        compact: true,
      }),
      to: '/deals',
      accent: 'border-t-emerald-500',
    },
  ]

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <CardHeader
        title="Sales Process"
        subtitle="Capture a lead, move it to Contacts, then open a deal"
      />

      {/* =====================================================
          WORKFLOW
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
          {steps.map((step, index) => (
            <div
              key={step.label}
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
                  STEP CARD
                  ================================================= */}
              <Link
                to={step.to}
                className={cn(
                  // Layout
                  'block w-[145px] shrink-0 lg:w-full',

                  // Shape
                  'rounded-lg border border-slate-200',
                  'border-t-[3px]',

                  // Background
                  'bg-slate-50/70',

                  // Spacing
                  'px-3 py-3 sm:px-4',

                  // Interaction
                  'transition-all duration-150',
                  'hover:border-slate-300 hover:bg-white',
                  'hover:shadow-sm',
                  'focus-visible:outline-none',

                  // Prevent text overflow
                  'min-w-0',

                  step.accent
                )}
              >
                {/* Label */}
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
                  title={step.label}
                >
                  {step.label}
                </p>

                {/* Number */}
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
                  title={String(step.value)}
                >
                  {step.value}
                </p>

                {/* Caption */}
                <p
                  className="
                    mt-0.5
                    truncate
                    text-xs
                    leading-5
                    text-slate-500
                  "
                  title={step.caption}
                >
                  {step.caption}
                </p>
              </Link>

              {/* =================================================
                  ARROW
                  ================================================= */}
              {index < steps.length - 1 ? (
                <ArrowRight
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