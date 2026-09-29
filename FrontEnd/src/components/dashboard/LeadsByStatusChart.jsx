import { useMemo } from 'react'
import { UserCheck } from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import { LEAD_STATUSES } from '../../data/mockData'
import { cn } from '../../utils/format'

/** One colour per lead status, matching the badges used elsewhere. */
const STATUS_STYLES = {
  Qualified: {
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  'Not Qualified': {
    bar: 'bg-slate-300',
    dot: 'bg-slate-300',
    text: 'text-slate-600',
  },
}

/**
 * Leads split by qualification.
 *
 * Responsive behavior:
 * - The qualification bar always fills the available width.
 * - Legend cards adapt from a two-column layout to a single column
 *   on very narrow screens.
 * - The action message wraps naturally on mobile.
 *
 * Existing lead calculations and status behavior are preserved.
 */
export default function LeadsByStatusChart({ leads }) {
  const data = useMemo(() => {
    const total = leads.length

    const counts = LEAD_STATUSES.map((status) => {
      const count = leads.filter(
        (lead) => lead.status === status
      ).length

      return {
        status,
        count,
        percent: total
          ? Math.round((count / total) * 100)
          : 0,
      }
    })

    return {
      counts,
      total,
    }
  }, [leads])

  const qualified = data.counts.find(
    (item) => item.status === 'Qualified'
  )

  return (
    <Card className="flex min-w-0 flex-col">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <CardHeader
        title="Lead Qualification"
        subtitle={`${data.total} ${
          data.total === 1 ? 'lead' : 'leads'
        } not yet converted`}
      />

      {/* =====================================================
          CONTENT
          ===================================================== */}
      <div
        className="
          flex
          min-w-0
          flex-1
          flex-col
          p-4
          sm:p-5
        "
      >
        {/* ===================================================
            SPLIT BAR
            =================================================== */}
        <div
          className="
            flex
            h-3
            w-full
            min-w-0
            overflow-hidden
            rounded-full
            bg-slate-100
            sm:h-4
          "
          role="img"
          aria-label={data.counts
            .map(
              (item) =>
                `${item.status}: ${item.count} leads, ${item.percent} percent`
            )
            .join('. ')}
        >
          {data.counts.map((item) =>
            item.count > 0 ? (
              <div
                key={item.status}
                className={cn(
                  'h-full',
                  'first:rounded-l-full',
                  'last:rounded-r-full',
                  STATUS_STYLES[item.status].bar
                )}
                style={{
                  width: `${item.percent}%`,
                }}
              />
            ) : null
          )}
        </div>

        {/* ===================================================
            LEGEND / COUNTS
            =================================================== */}
        <div
          className="
            mt-4
            grid
            grid-cols-1
            gap-3
            min-[400px]:grid-cols-2
            sm:mt-5
            sm:gap-4
          "
        >
          {data.counts.map((item) => (
            <div
              key={item.status}
              className="
                min-w-0
                rounded-lg
                border
                border-slate-200
                p-3
                transition-colors
                hover:border-slate-300
                sm:p-3.5
              "
            >
              {/* Status */}
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    STATUS_STYLES[item.status].dot
                  )}
                />

                <p
                  className="
                    min-w-0
                    truncate
                    text-sm
                    font-medium
                    text-slate-700
                  "
                  title={item.status}
                >
                  {item.status}
                </p>
              </div>

              {/* Count */}
              <p
                className="
                  mt-1.5
                  text-xl
                  font-semibold
                  tracking-tight
                  text-slate-900
                  sm:mt-2
                  sm:text-2xl
                "
              >
                {item.count}
              </p>

              {/* Percentage */}
              <p className="mt-0.5 text-xs text-slate-500">
                {item.percent}% of open leads
              </p>
            </div>
          ))}
        </div>

        {/* ===================================================
            NEXT ACTION
            =================================================== */}
        <div
          className="
            mt-3
            flex
            min-w-0
            items-start
            gap-2.5
            rounded-lg
            bg-slate-50
            px-3
            py-3
            text-sm
            sm:mt-4
            sm:px-3.5
          "
        >
          <UserCheck
            className="
              mt-0.5
              h-4
              w-4
              shrink-0
              text-emerald-600
            "
            aria-hidden="true"
          />

          <span className="min-w-0 leading-5 text-slate-600">
            <span className="font-semibold text-slate-900">
              {qualified?.count ?? 0}
            </span>{' '}
            {qualified?.count === 1
              ? 'lead is'
              : 'leads are'}{' '}
            ready to move to Contacts.
          </span>
        </div>
      </div>
    </Card>
  )
}