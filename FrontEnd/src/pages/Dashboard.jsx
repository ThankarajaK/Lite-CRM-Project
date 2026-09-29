import { useMemo, useState } from 'react'
import { Briefcase, TrendingUp, UserPlus, Users } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import KpiCard from '../components/dashboard/KpiCard'
import DateFilter from '../components/dashboard/DateFilter'
import LeadsByStatusChart from '../components/dashboard/LeadsByStatusChart'
import ConversionFlow from '../components/dashboard/ConversionFlow'
import PipelineSummary from '../components/dashboard/PipelineSummary'
import RecentActivities from '../components/dashboard/RecentActivities'
import UpcomingTasks from '../components/dashboard/UpcomingTasks'
import Skeleton, { CardSkeleton } from '../components/ui/Skeleton'
import { useData } from '../context/DataContext'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { daysFromToday, formatCurrency } from '../utils/format'

/** How many days back each date-filter option covers. */
const RANGE_DAYS = {
  today: 0,
  week: 7,
  month: 30,
}

export default function Dashboard() {
  const { leads, deals, tasks, activities, stats } = useData()
  const [range, setRange] = useState('week')
  const loading = useSimulatedLoading()

  /**
   * Records created inside the selected range.
   * Drives the "new this period" summary strip.
   */
  const periodStats = useMemo(() => {
    const days = RANGE_DAYS[range]

    const inRange = (date) => {
      const diff = -daysFromToday(date)
      return diff >= 0 && diff <= days
    }

    return {
      newLeads: leads.filter((lead) => inRange(lead.createdAt)).length,
      newDeals: deals.filter((deal) => inRange(deal.createdAt)).length,
      activities: activities.filter((activity) => inRange(activity.timestamp)),
    }
  }, [leads, deals, activities, range])

  const rangeLabel =
    range === 'today'
      ? 'today'
      : range === 'week'
        ? 'in the last 7 days'
        : 'in the last 30 days'

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden sm:space-y-6">

      {/* =========================================================
          PAGE HEADER
          ========================================================= */}
      <div className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden pb-0.5">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your sales activity"
          actions={
            <div className="shrink-0">
              <DateFilter
                value={range}
                onChange={setRange}
              />
            </div>
          }
        />
      </div>

      {/* =========================================================
          KPI CARDS
          Desktop  : 4 columns
          Tablet   : 2 columns
          Mobile   : 1 column
          ========================================================= */}
      <section className="w-full min-w-0">
        {loading ? (
          <div className="w-full min-w-0">
            <CardSkeleton />
          </div>
        ) : (
          <div
            className="
              grid
              w-full
              min-w-0
              grid-cols-1
              gap-3
              sm:grid-cols-2
              sm:gap-4
              xl:grid-cols-4
            "
          >
            <div className="min-w-0">
              <KpiCard
                label="Open Leads"
                value={stats.totalLeads}
                icon={UserPlus}
                accent="blue"
                caption={`${stats.qualifiedLeads} qualified, ready to move`}
              />
            </div>

            <div className="min-w-0">
              <KpiCard
                label="Contacts"
                value={stats.totalContacts}
                icon={Users}
                accent="green"
                caption={
                  stats.contactsWithoutDeal > 0
                    ? `${stats.contactsWithoutDeal} with no deal yet`
                    : 'all in the pipeline'
                }
              />
            </div>

            <div className="min-w-0">
              <KpiCard
                label="Open Deals"
                value={stats.openDeals}
                icon={Briefcase}
                accent="amber"
                caption={`${formatCurrency(stats.pipelineValue)} pipeline`}
              />
            </div>

            <div className="min-w-0">
              <KpiCard
                label="Won Deals"
                value={stats.wonDeals}
                icon={TrendingUp}
                accent="violet"
                caption={`${formatCurrency(stats.wonValue)} revenue`}
              />
            </div>
          </div>
        )}
      </section>

      {/* =========================================================
          PERIOD SUMMARY
          ========================================================= */}
      <section className="w-full min-w-0">
        <div
          className="
            flex
            w-full
            min-w-0
            flex-wrap
            items-center
            gap-x-5
            gap-y-2
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-3
            shadow-card
            sm:gap-x-6
            sm:px-5
          "
        >
          <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
            {periodStats.newLeads} new{' '}
            {periodStats.newLeads === 1 ? 'lead' : 'leads'}
          </span>

          <span className="whitespace-nowrap text-sm text-slate-500">
            {periodStats.newDeals} new{' '}
            {periodStats.newDeals === 1 ? 'deal' : 'deals'}
          </span>

          <span className="whitespace-nowrap text-sm text-slate-500">
            {periodStats.activities.length}{' '}
            {periodStats.activities.length === 1
              ? 'activity'
              : 'activities'}
          </span>

          <span className="whitespace-nowrap text-sm text-slate-500">
            {stats.openTasks} open{' '}
            {stats.openTasks === 1 ? 'task' : 'tasks'}
          </span>

          <span
            className="
              w-full
              text-left
              text-xs
              text-slate-400
              sm:ml-auto
              sm:w-auto
              sm:text-right
              sm:text-sm
            "
          >
            {rangeLabel}
          </span>
        </div>
      </section>

      {/* =========================================================
          CONVERSION FLOW
          ========================================================= */}
      {loading ? (
        <section className="w-full min-w-0">
          <Skeleton className="h-44 w-full rounded-xl" />
        </section>
      ) : (
        <section className="w-full min-w-0">
          <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl">
            <div className="min-w-0">
              <ConversionFlow stats={stats} />
            </div>
          </div>
        </section>
      )}

      {/* =========================================================
          PIPELINE SUMMARY
          ========================================================= */}
      {loading ? (
        <section className="w-full min-w-0">
          <Skeleton className="h-44 w-full rounded-xl" />
        </section>
      ) : (
        <section className="w-full min-w-0">
          <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl">
            <div className="min-w-0">
              <PipelineSummary deals={deals} />
            </div>
          </div>
        </section>
      )}

      {/* =========================================================
          LEAD STATUS + UPCOMING TASKS
          Desktop : 2 columns
          Mobile  : 1 column
          ========================================================= */}
      <section className="w-full min-w-0">
        {loading ? (
          <div
            className="
              grid
              w-full
              min-w-0
              grid-cols-1
              gap-4
              lg:grid-cols-2
            "
          >
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        ) : (
          <div
            className="
              grid
              w-full
              min-w-0
              grid-cols-1
              gap-4
              lg:grid-cols-2
            "
          >
            <div className="min-w-0 max-w-full overflow-hidden">
              <LeadsByStatusChart leads={leads} />
            </div>

            <div className="min-w-0 max-w-full overflow-hidden">
              <UpcomingTasks tasks={tasks} />
            </div>
          </div>
        )}
      </section>

      {/* =========================================================
          RECENT ACTIVITIES
          ========================================================= */}
      <section className="w-full min-w-0">
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : (
          <div className="w-full min-w-0 max-w-full overflow-hidden">
            <RecentActivities
              activities={
                periodStats.activities.length > 0
                  ? periodStats.activities
                  : activities
              }
            />
          </div>
        )}
      </section>
    </div>
  )
}