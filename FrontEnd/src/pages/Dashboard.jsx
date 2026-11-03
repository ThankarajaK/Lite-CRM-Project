import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, TrendingUp, UserPlus, Users, Clock3 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import KpiCard from '../components/dashboard/KpiCard'
import DateFilter from '../components/dashboard/DateFilter'
import LeadsByStatusChart from '../components/dashboard/LeadsByStatusChart'
import ConversionFlow from '../components/dashboard/ConversionFlow'
import PipelineSummary from '../components/dashboard/PipelineSummary'
import RecentActivities from '../components/dashboard/RecentActivities'
import UpcomingTasks from '../components/dashboard/UpcomingTasks'
import Skeleton, { CardSkeleton } from '../components/ui/Skeleton'
import Card, { CardHeader } from '../components/ui/Card'
import { useData } from '../context/DataContext'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { formatCurrency, isOverdue } from '../utils/format'

const RANGE_LABELS = { today: 'Today', week: 'This Week', month: 'This Month' }

function startOfRange(range, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'week') {
    const day = start.getDay() // Calendar week starts Sunday, matching local calendar.
    start.setDate(start.getDate() - day)
  } else if (range === 'month') {
    start.setDate(1)
  }
  start.setHours(0, 0, 0, 0)
  return start
}

function withinRange(value, start, end) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

function userRole(user) {
  return String(user?.role ?? user?.role_name ?? user?.role_key ?? '').toLowerCase()
}

function KpiLink({ to, children, label }) {
  return (
    <Link to={to} aria-label={`View ${label}`} className="block min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
      {children}
    </Link>
  )
}

export default function Dashboard() {
  const { leads, contacts, deals, tasks, activities, stats, users = [], user } = useData()
  const [range, setRange] = useState('week')
  const loading = useSimulatedLoading()
  const role = userRole(user)
  const isAdmin = role.includes('admin')
  const isManager = role.includes('manager')
  const viewerLabel = isAdmin ? 'Organization' : isManager ? 'Your team' : 'Your records'

  const { periodStats, periodActivities, start, end } = useMemo(() => {
    const now = new Date()
    const startDate = startOfRange(range, now)
    const endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)
    const matches = (date) => withinRange(date, startDate, endDate)
    return {
      start: startDate,
      end: endDate,
      periodStats: {
        newLeads: leads.filter((lead) => matches(lead.createdAt)).length,
        newDeals: deals.filter((deal) => matches(deal.createdAt)).length,
        newContacts: contacts.filter((contact) => matches(contact.createdAt)).length,
      },
      periodActivities: activities
        .filter((activity) => matches(activity.timestamp ?? activity.happenedAt ?? activity.createdAt))
        .sort((a, b) => new Date(b.timestamp ?? b.happenedAt ?? b.createdAt) - new Date(a.timestamp ?? a.happenedAt ?? a.createdAt)),
    }
  }, [range, leads, deals, contacts, activities])

  const overdueTasks = useMemo(
    () => tasks.filter((task) => !task.completed && isOverdue(task.dueDate)),
    [tasks],
  )

  const teamCoverage = useMemo(() => {
    const people = new Map()
    const ensure = (name) => {
      if (!name) return null
      if (!people.has(name)) people.set(name, { name, ownerId: users.find((member) => (member.display_name ?? member.name ?? member.username ?? member.email) === name)?.id ?? null, leads: 0, openDeals: 0, pipeline: 0, wonDeals: 0 })
      return people.get(name)
    }
    users.filter((member) => member.is_active !== false && /salesperson|sales manager|sales_manager/i.test(`${member.role_name ?? ''} ${member.role_key ?? ''} ${member.role ?? ''}`)).forEach((member) => ensure(member.display_name ?? member.name ?? member.username ?? member.email))
    leads.forEach((lead) => { const row = ensure(lead.owner); if (row) row.leads += 1 })
    deals.forEach((deal) => {
      const row = ensure(deal.owner)
      if (!row) return
      if (['Won'].includes(deal.stage)) row.wonDeals += 1
      else if (!['Lost'].includes(deal.stage)) { row.openDeals += 1; row.pipeline += Number(deal.value) || 0 }
    })
    return [...people.values()].sort((a, b) => b.pipeline - a.pipeline || a.name.localeCompare(b.name))
  }, [users, leads, deals])

  const rangeDescription = `${RANGE_LABELS[range]} · ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden pb-0.5">
        <PageHeader
          title="Dashboard"
          subtitle={`${viewerLabel} · ${isAdmin ? 'Organization overview' : isManager ? 'Team sales overview' : 'Personal sales overview'}`}
          actions={<div className="shrink-0"><DateFilter value={range} onChange={setRange} /></div>}
        />
      </div>

      <p className="text-xs text-slate-500" aria-live="polite">Period in force: <strong className="font-semibold text-slate-700">{rangeDescription}</strong>. Date range applies to new-record counts and recent activity.</p>

      <section className="w-full min-w-0">
        {loading ? <CardSkeleton /> : (
          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <KpiLink to="/leads" label="leads">
              <KpiCard label="Leads" value={stats.totalLeads} icon={UserPlus} accent="blue" caption={`${stats.qualifiedLeads} qualified`} />
            </KpiLink>
            <KpiLink to="/contacts" label="contacts">
              <KpiCard label="Contacts" value={stats.totalContacts} icon={Users} accent="green" caption={stats.contactsWithoutDeal > 0 ? `${stats.contactsWithoutDeal} without a deal` : 'All have a deal'} />
            </KpiLink>
            <KpiLink to="/deals" label="open deals">
              <KpiCard label="Open Deals" value={stats.openDeals} icon={Briefcase} accent="amber" caption={`${formatCurrency(stats.pipelineValue)} pipeline`} />
            </KpiLink>
            <KpiLink to="/deals" label="won deals">
              <KpiCard label="Won Deals" value={stats.wonDeals} icon={TrendingUp} accent="violet" caption={`${formatCurrency(stats.wonValue)} won value`} />
            </KpiLink>
          </div>
        )}
      </section>

      <section className="flex w-full min-w-0 flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card sm:gap-x-6 sm:px-5">
        <Link to={`/leads?created=${range}`} className="text-sm font-semibold text-brand-700 hover:underline">{periodStats.newLeads} new {periodStats.newLeads === 1 ? 'lead' : 'leads'}</Link>
        <Link to={`/contacts?created=${range}`} className="text-sm text-brand-700 hover:underline">{periodStats.newContacts} new {periodStats.newContacts === 1 ? 'contact' : 'contacts'}</Link>
        <Link to={`/deals?created=${range}`} className="text-sm text-brand-700 hover:underline">{periodStats.newDeals} new {periodStats.newDeals === 1 ? 'deal' : 'deals'}</Link>
        <Link to="/tasks?status=open" className="text-sm text-brand-700 hover:underline">{stats.openTasks} open {stats.openTasks === 1 ? 'task' : 'tasks'}</Link>
        <Link to="/tasks?status=overdue" className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 hover:underline"><Clock3 className="h-3.5 w-3.5" />{overdueTasks.length} overdue</Link>
        <span className="w-full text-left text-xs text-slate-400 sm:ml-auto sm:w-auto sm:text-right">{rangeDescription}</span>
      </section>

      {isManager && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Team Pipeline Coverage" subtitle="Open pipeline and lead coverage by owner" />
          {teamCoverage.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-500">No team-owned records are available in your scope.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Leads</th><th className="px-5 py-3">Open deals</th><th className="px-5 py-3">Won deals</th><th className="px-5 py-3 text-right">Pipeline</th></tr></thead><tbody className="divide-y divide-slate-100">{teamCoverage.map((person) => <tr key={person.name}><td className="px-5 py-3 font-medium text-slate-800">{person.name}</td><td className="px-5 py-3"><Link className="text-brand-700 hover:underline" to={`/leads?owner=${encodeURIComponent(person.ownerId ?? "")}`}>{person.leads}</Link></td><td className="px-5 py-3"><Link className="text-brand-700 hover:underline" to={`/deals?owner=${encodeURIComponent(person.name)}`}>{person.openDeals}</Link></td><td className="px-5 py-3">{person.wonDeals}</td><td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrency(person.pipeline)}</td></tr>)}</tbody></table></div>
          )}
        </Card>
      )}

      {loading ? <Skeleton className="h-44 w-full rounded-xl" /> : <section className="w-full min-w-0"><ConversionFlow stats={stats} /></section>}
      {loading ? <Skeleton className="h-44 w-full rounded-xl" /> : <section className="w-full min-w-0"><PipelineSummary deals={deals} /></section>}

      <section className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? <><Skeleton className="h-80 w-full rounded-xl" /><Skeleton className="h-80 w-full rounded-xl" /></> : <>
          <div className="min-w-0 max-w-full overflow-hidden"><LeadsByStatusChart leads={leads} /></div>
          <div className="min-w-0 max-w-full overflow-hidden"><UpcomingTasks tasks={tasks} /></div>
        </>}
      </section>

      <section className="w-full min-w-0">
        {loading ? <Skeleton className="h-72 w-full rounded-xl" /> : <div className="w-full min-w-0 max-w-full overflow-hidden"><RecentActivities activities={periodActivities} /></div>}
      </section>

      {isAdmin && (
        <Card className="min-w-0">
          <CardHeader title="Administration & Integration Health" subtitle="Administrative audit and integration status" />
          <div className="px-5 pb-5 text-sm text-slate-600">
            <p>CRM data is loaded from the connected backend. Permission-change audit events and per-integration health checks are not currently exposed by the dashboard API, so no status is fabricated here.</p>
            <div className="mt-3 flex flex-wrap gap-3"><Link to="/user-management" className="font-medium text-brand-700 hover:underline">Manage users and permissions</Link><Link to="/settings" className="font-medium text-brand-700 hover:underline">Open settings</Link></div>
          </div>
        </Card>
      )}
    </div>
  )
}
