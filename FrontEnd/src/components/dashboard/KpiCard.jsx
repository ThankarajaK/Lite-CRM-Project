import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import Card from '../ui/Card'
import { cn } from '../../utils/format'

const ACCENTS = {
  blue: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
}

/**
 * Responsive KPI card.
 *
 * Displays:
 * - Label
 * - Icon
 * - Main value
 * - Percentage change OR caption
 *
 * Existing data and functionality are preserved.
 */
export default function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  change,
  caption,
}) {
  const positive = (change ?? 0) >= 0
  const TrendIcon = positive
    ? ArrowUpRight
    : ArrowDownRight

  return (
    <Card
      className="
        w-full
        min-w-0
        max-w-full
        p-4
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-pop
        sm:p-5
      "
    >
      {/* =====================================================
          TOP ROW
          ===================================================== */}
      <div className="flex min-w-0 items-start justify-between gap-3">
        {/* Label */}
        <p
          className="
            min-w-0
            flex-1
            truncate
            text-sm
            font-medium
            text-slate-500
          "
          title={label}
        >
          {label}
        </p>

        {/* Icon */}
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center',
            'rounded-lg',
            'sm:h-10 sm:w-10',
            ACCENTS[accent] ?? ACCENTS.blue
          )}
        >
          {Icon ? (
            <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
          ) : null}
        </span>
      </div>

      {/* =====================================================
          MAIN VALUE
          ===================================================== */}
      <p
        className="
          mt-3
          min-w-0
          truncate
          text-2xl
          font-semibold
          tracking-tight
          text-slate-900
          sm:mt-4
          sm:text-3xl
        "
        title={String(value)}
      >
        {value}
      </p>

      {/* =====================================================
          COMPARISON / CAPTION
          ===================================================== */}
      <div
        className="
          mt-2
          min-w-0
          text-sm
        "
      >
        {typeof change === 'number' ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5',
                'font-medium',
                positive
                  ? 'text-emerald-600'
                  : 'text-red-600'
              )}
            >
              <TrendIcon className="h-3.5 w-3.5 shrink-0" />

              <span>
                {positive ? '+' : ''}
                {change}%
              </span>
            </span>

            <span className="min-w-0 text-slate-500">
              from last month
            </span>
          </div>
        ) : (
          <p
            className="
              min-w-0
              truncate
              text-slate-500
            "
            title={caption || ''}
          >
            {caption}
          </p>
        )}
      </div>
    </Card>
  )
}