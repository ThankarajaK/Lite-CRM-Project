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
import { monthlyRevenue, TEAM } from '../data/mockData'
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
  const { leads, contacts, deals, stats } = useData()
  const toast = useToast()
  const loading = useSimulatedLoading()

  /**
   * Per-rep roll-up, computed from the live leads and deals.
   */
  const salespeople = useMemo(
    () =>
      TEAM.map((member) => {
        const memberDeals = deals.filter(
          (deal) => deal.owner === member.name
        )

        const won = memberDeals.filter(
          (deal) => deal.stage === 'Won'
        )

        return {
          name: member.name,
          role: member.role,
          leads: leads.filter(
            (lead) => lead.owner === member.name
          ).length,
          deals: memberDeals.length,
          won: won.length,
          revenue: won.reduce(
            (sum, deal) => sum + (Number(deal.value) || 0),
            0
          ),
        }
      }).sort((a, b) => b.revenue - a.revenue),
    [leads, deals]
  )

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
            onClick={() =>
              toast.info(
                'Report export started',
                'A PDF summary would be generated.'
              )
            }
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
        <RevenueTrend data={monthlyRevenue} />
      </section>

      {/* Salesperson performance */}
      <section className="min-w-0">
        <SalespersonTable rows={salespeople} />
      </section>
    </div>
  )
}