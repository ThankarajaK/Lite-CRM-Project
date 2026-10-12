import { useMemo } from 'react'
import {
  Briefcase,
  CircleDollarSign,
  Download,
  Trophy,
  XCircle,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import SourceBreakdown from '../components/reports/SourceBreakdown'
import ConversionFunnel from '../components/reports/ConversionFunnel'
import RevenueTrend from '../components/reports/RevenueTrend'
import SalespersonTable from '../components/reports/SalespersonTable'
import ProductBreakdown from '../components/reports/ProductBreakdown'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'

import { formatCurrency } from '../utils/format'

/**
 * Small stat tile used in the Deal Performance row.
 *
 * Responsive by design:
 * - Compact padding on small screens
 * - Larger spacing on larger screens
 * - Value scales naturally without overflowing
 */
function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'text-slate-900',
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate">{label}</span>
      </div>

      <p
        className={`mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl ${tone}`}
        title={String(value)}
      >
        {value}
      </p>
    </Card>
  )
}

export default function Reports() {
  const { leads, contacts, deals, stats, users = [] } = useData()
  const toast = useToast()
  const loading = useSimulatedLoading()

  /** Build salesperson rows from actual CRM users and record ownership. */
  const salespeople = useMemo(() => {
    const roleByName = new Map(
      users.map((user) => [
        user.display_name || user.username || user.email,
        user.role_name || user.role_key || 'Team member',
      ]),
    )
    const ownerNames = new Set([
      ...users
        .filter((user) => user.is_active !== false && /salesperson|sales manager|sales_manager/i.test(`${user.role_name || ''} ${user.role_key || ''}`))
        .map((user) => user.display_name || user.username || user.email),
      ...leads.map((lead) => lead.owner),
      ...deals.map((deal) => deal.owner),
    ].filter(Boolean))

    return [...ownerNames].map((name) => {
      const memberDeals = deals.filter((deal) => deal.owner === name)
      const won = memberDeals.filter((deal) => deal.stage === 'Won')
      return {
        name,
        role: roleByName.get(name) || 'Team member',
        leads: leads.filter((lead) => lead.owner === name).length,
        deals: memberDeals.length,
        won: won.length,
        revenue: won.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
      }
    }).sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name))
  }, [leads, deals, users])

  /** Last six calendar months of actual won-deal revenue, grouped by close date. */
  const revenueTrend = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        month: date.toLocaleDateString(undefined, { month: 'short' }),
        revenue: 0,
        deals: 0,
      }
    })
    const byMonth = new Map(months.map((month) => [month.key, month]))
    deals.filter((deal) => deal.stage === 'Won').forEach((deal) => {
      const dateValue = deal.closedAt
      if (!dateValue) return
      const date = new Date(dateValue)
      if (Number.isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const month = byMonth.get(key)
      if (!month) return
      month.revenue += Number(deal.value) || 0
      month.deals += 1
    })
    return months
  }, [deals])

  const exportReport = () => {
    const rows = [
      ['Report', 'Metric', 'Value'],
      ['Deal Performance', 'Open Deals', stats.openDeals],
      ['Deal Performance', 'Won Deals', stats.wonDeals],
      ['Deal Performance', 'Lost Deals', stats.lostDeals],
      ['Deal Performance', 'Pipeline Value', stats.pipelineValue],
      ['Lead Sources', 'Source', 'Count'],
      ...[...leads, ...contacts].reduce((acc, record) => {
        const source = record.source || 'Unspecified'
        const found = acc.find((row) => row[1] === source)
        if (found) found[2] += 1
        else acc.push(['Lead Sources', source, 1])
        return acc
      }, []),
      ['Product Performance', 'Product', 'Deals', 'Open', 'Won', 'Pipeline', 'Revenue'],
      ...[...new Set(deals.map((deal) => deal.product).filter(Boolean))].map((product) => {
        const productDeals = deals.filter((deal) => deal.product === product)
        const open = productDeals.filter((deal) => !['Won', 'Lost'].includes(deal.stage))
        const won = productDeals.filter((deal) => deal.stage === 'Won')
        return [product, productDeals.length, open.length, won.length,
          open.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
          won.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)]
      }),
      ['Salesperson Performance', 'Salesperson', 'Leads', 'Deals', 'Won', 'Revenue'],
      ...salespeople.map((person) => [person.name, person.leads, person.deals, person.won, person.revenue]),
      ['Revenue Trend', 'Month', 'Won Revenue', 'Won Deals'],
      ...revenueTrend.map((month) => [month.month, month.revenue, month.deals]),
    ]
    const csv = rows.map((row) => row.map((value) => {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `litecrm-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('Report exported', 'Your live report data was downloaded as CSV.')
  }

  /**
   * Moving a lead removes it from the leads list, so
   * "every lead we ever had" is the open leads plus
   * the contacts they became.
   */
  const funnel = useMemo(
    () => ({
      totalLeads: stats.totalLeads + stats.totalContacts,
      movedToContacts: stats.totalContacts,
      dealsOpened: stats.contactsWithDeals,
      wonDeals: stats.wonDeals,
    }),
    [stats]
  )

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Reports"
          subtitle="Understand your sales performance"
        />

        {/* Deal performance skeletons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-24 rounded-xl"
            />
          ))}
        </div>

        {/* Source + conversion skeletons */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>

        {/* Product skeleton */}
        <Skeleton className="h-72 rounded-xl" />

        {/* Revenue skeleton */}
        <Skeleton className="h-80 rounded-xl" />

        {/* Salesperson skeleton */}
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <PageHeader
        title="Reports"
        subtitle="Understand your sales performance"
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={exportReport}
            className="w-full sm:w-auto"
          >
            Export report
          </Button>
        }
      />

      {/* Deal performance */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Deal Performance
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatTile
            label="Open Deals"
            value={stats.openDeals}
            icon={Briefcase}
          />

          <StatTile
            label="Won Deals"
            value={stats.wonDeals}
            icon={Trophy}
            tone="text-emerald-600"
          />

          <StatTile
            label="Lost Deals"
            value={stats.lostDeals}
            icon={XCircle}
            tone="text-red-600"
          />

          <StatTile
            label="Total Pipeline Value"
            value={formatCurrency(stats.pipelineValue)}
            icon={CircleDollarSign}
          />
        </div>
      </section>

      {/* Sources + conversion */}
      <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <SourceBreakdown records={[...leads, ...contacts]} />
        </div>

        <div className="min-w-0">
          <ConversionFunnel {...funnel} />
        </div>
      </section>

      {/* Product performance */}
      <section className="min-w-0">
        <ProductBreakdown deals={deals} />
      </section>

      {/* Revenue trend */}
      <section className="min-w-0">
        <RevenueTrend data={revenueTrend} />
      </section>

      {/* Salesperson performance */}
      <section className="min-w-0">
        <SalespersonTable rows={salespeople} />
      </section>
    </div>
  )
}