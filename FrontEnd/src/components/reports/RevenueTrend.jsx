import Card, { CardHeader } from '../ui/Card'
import { formatCurrency } from '../../utils/format'

/** Monthly closed-won revenue, drawn as a simple column chart. */
export default function RevenueTrend({ data }) {
  const max = Math.max(...data.map((point) => point.revenue), 1)
  const total = data.reduce((sum, point) => sum + point.revenue, 0)

  return (
    <Card>
      <CardHeader
        title="Revenue Trend"
        subtitle={`${formatCurrency(total)} closed over the last ${data.length} months`}
      />
      <div className="p-5">
        <div className="flex h-48 items-end gap-2 sm:gap-4">
          {data.map((point) => (
            <div key={point.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-medium text-slate-600">
                {formatCurrency(point.revenue, { compact: true })}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full origin-bottom rounded-t-md bg-brand-500 animate-grow-bar"
                  style={{ height: `${(point.revenue / max) * 100}%` }}
                  role="img"
                  aria-label={`${point.month}: ${formatCurrency(point.revenue)} from ${point.deals} deals`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2 border-t border-slate-200 pt-2.5 sm:gap-4">
          {data.map((point) => (
            <div key={point.month} className="flex-1 text-center">
              <p className="text-xs font-medium text-slate-600">{point.month}</p>
              <p className="text-xs text-slate-400">{point.deals} deals</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
