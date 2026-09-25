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
 * One headline number with an icon and a comparison line.
 *
 * `change` is a percentage (positive or negative); `caption` replaces it
 * when a card shows a monetary sub-figure instead of a trend.
 */
export default function KpiCard({ label, value, icon: Icon, accent = 'blue', change, caption }) {
  const positive = (change ?? 0) >= 0
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <Card className="p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            ACCENTS[accent] ?? ACCENTS.blue
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>

      <div className="mt-2 flex items-center gap-1.5 text-sm">
        {typeof change === 'number' ? (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                positive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {positive ? '+' : ''}
              {change}%
            </span>
            <span className="text-slate-500">from last month</span>
          </>
        ) : (
          <span className="text-slate-500">{caption}</span>
        )}
      </div>
    </Card>
  )
}
