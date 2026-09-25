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
const RANGE_DAYS = { today: 0, week: 7, month: 30 }

export default function Dashboard() {
  const { leads, deals, tasks, activities, stats } = useData()
  const [range, setRange] = useState('week')
  const loading = useSimulatedLoading()

  /** Records created inside the selected range — drives the "new this period" strip. */
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
    range === 'today' ? 'today' : range === 'week' ? 'in the last 7 days' : 'in the last 30 days'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your sales activity"
        actions={<DateFilter value={range} onChange={setRange} />}
      />

      {/* KPI row */}
      {loading ? (
        <CardSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Open Leads"
            value={stats.totalLeads}
            icon={UserPlus}
            accent="blue"
            caption={`${stats.qualifiedLeads} qualified, ready to move`}
          />
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
          <KpiCard
            label="Open Deals"
            value={stats.openDeals}
            icon={Briefcase}
            accent="amber"
            caption={`${formatCurrency(stats.pipelineValue)} pipeline`}
          />
          <KpiCard
            label="Won Deals"
            value={stats.wonDeals}
            icon={TrendingUp}
            accent="violet"
            caption={`${formatCurrency(stats.wonValue)} revenue`}
          />
        </div>
      )}

      {/* Period summary strip — reacts to the date filter */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-card">
        <span className="font-medium text-slate-900">
          {periodStats.newLeads} new {periodStats.newLeads === 1 ? 'lead' : 'leads'}
        </span>
        <span className="text-slate-500">
          {periodStats.newDeals} new {periodStats.newDeals === 1 ? 'deal' : 'deals'}
        </span>
        <span className="text-slate-500">
          {periodStats.activities.length}{' '}
          {periodStats.activities.length === 1 ? 'activity' : 'activities'}
        </span>
        <span className="text-slate-500">
          {stats.openTasks} open {stats.openTasks === 1 ? 'task' : 'tasks'}
        </span>
        <span className="ml-auto text-slate-400">{rangeLabel}</span>
      </div>

      {/* The process end to end, then the deal stages within it */}
      {loading ? (
        <>
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </>
      ) : (
        <>
          <ConversionFlow stats={stats} />
          <PipelineSummary deals={deals} />
        </>
      )}

      {/* Qualification split + tasks */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeadsByStatusChart leads={leads} />
          <UpcomingTasks tasks={tasks} />
        </div>
      )}

      {/* Activity feed */}
      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <RecentActivities
          activities={periodStats.activities.length > 0 ? periodStats.activities : activities}
        />
      )}
    </div>
  )
}
