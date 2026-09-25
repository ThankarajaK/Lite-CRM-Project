import { useMemo } from 'react'
import Card, { CardHeader } from '../ui/Card'
import { LEAD_SOURCES } from '../../data/mockData'

/** Bar colour per lead source. */
const SOURCE_COLORS = {
  Website: 'bg-brand-500',
  LinkedIn: 'bg-cyan-500',
  Referral: 'bg-emerald-500',
  Facebook: 'bg-violet-500',
  Other: 'bg-slate-400',
}

/**
 * Horizontal bars showing where leads come from.
 *
 * `records` is leads plus contacts: converting a lead removes it from the
 * leads list, and the contact record keeps its original source, so counting
 * both gives the true picture.
 */
export default function SourceBreakdown({ records }) {
  const rows = useMemo(() => {
    const total = records.length || 1
    return LEAD_SOURCES.map((source) => {
      const count = records.filter((record) => record.source === source).length
      return { source, count, percent: Math.round((count / total) * 100) }
    }).sort((a, b) => b.count - a.count)
  }, [records])

  const max = Math.max(...rows.map((row) => row.count), 1)

  return (
    <Card>
      <CardHeader
        title="Lead Sources"
        subtitle={`Where all ${records.length} leads came from, converted or not`}
      />
      <div className="space-y-4 p-5">
        {rows.map((row) => (
          <div key={row.source}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">{row.source}</span>
              <span className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{row.count}</span> · {row.percent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${SOURCE_COLORS[row.source] ?? 'bg-slate-400'}`}
                style={{ width: `${Math.max((row.count / max) * 100, 2)}%` }}
                role="img"
                aria-label={`${row.source}: ${row.count} leads, ${row.percent} percent`}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
