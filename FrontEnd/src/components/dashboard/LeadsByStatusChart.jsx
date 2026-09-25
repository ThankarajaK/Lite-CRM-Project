import { useMemo } from 'react'
import { UserCheck } from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import { LEAD_STATUSES } from '../../data/mockData'
import { cn } from '../../utils/format'

/** One colour per lead status, matching the badges used elsewhere. */
const STATUS_STYLES = {
  Qualified: { bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  'Not Qualified': { bar: 'bg-slate-300', dot: 'bg-slate-300', text: 'text-slate-600' },
}

/**
 * Leads split by qualification — the only two states a lead can be in.
 * Drawn as one split bar, which reads better for two categories than
 * two separate columns would.
 */
export default function LeadsByStatusChart({ leads }) {
  const data = useMemo(() => {
    const total = leads.length
    const counts = LEAD_STATUSES.map((status) => {
      const count = leads.filter((lead) => lead.status === status).length
      return {
        status,
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
      }
    })
    return { counts, total }
  }, [leads])

  const qualified = data.counts.find((item) => item.status === 'Qualified')

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Lead Qualification"
        subtitle={`${data.total} ${data.total === 1 ? 'lead' : 'leads'} not yet converted`}
      />
      <div className="flex flex-1 flex-col p-5">
        {/* Split bar */}
        <div
          className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label={data.counts
            .map((item) => `${item.status}: ${item.count} leads, ${item.percent} percent`)
            .join('. ')}
        >
          {data.counts.map((item) =>
            item.count > 0 ? (
              <div
                key={item.status}
                className={cn('h-full first:rounded-l-full last:rounded-r-full', STATUS_STYLES[item.status].bar)}
                style={{ width: `${item.percent}%` }}
              />
            ) : null
          )}
        </div>

        {/* Legend with counts */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          {data.counts.map((item) => (
            <div key={item.status} className="rounded-lg border border-slate-200 p-3.5">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', STATUS_STYLES[item.status].dot)} />
                <p className="text-sm font-medium text-slate-700">{item.status}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {item.count}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{item.percent}% of open leads</p>
            </div>
          ))}
        </div>

        {/* What to do next */}
        <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-sm lg:mt-auto">
          <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-slate-600">
            <span className="font-semibold text-slate-900">{qualified?.count ?? 0}</span>{' '}
            {qualified?.count === 1 ? 'lead is' : 'leads are'} ready to move to Contacts.
          </span>
        </div>
      </div>
    </Card>
  )
}
