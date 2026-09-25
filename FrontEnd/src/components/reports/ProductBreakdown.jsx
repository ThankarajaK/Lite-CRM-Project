import { useMemo } from 'react'
import Card, { CardHeader } from '../ui/Card'
import Table, { TBody, TD, TH, THead, TR } from '../ui/Table'
import { PRODUCTS } from '../../data/mockData'
import { formatCurrency } from '../../utils/format'

/**
 * How each product is performing.
 *
 * Product is captured when a contact is moved to Contacted, so every deal
 * has one — which makes this a straight roll-up of the deals list.
 */
export default function ProductBreakdown({ deals }) {
  const rows = useMemo(() => {
    return PRODUCTS.map((product) => {
      const productDeals = deals.filter((deal) => deal.product === product)
      const won = productDeals.filter((deal) => deal.stage === 'Won')
      const open = productDeals.filter((deal) => !['Won', 'Lost'].includes(deal.stage))
      return {
        product,
        deals: productDeals.length,
        open: open.length,
        won: won.length,
        revenue: won.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
        pipeline: open.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
      }
    })
      .filter((row) => row.deals > 0)
      .sort((a, b) => b.pipeline + b.revenue - (a.pipeline + a.revenue))
  }, [deals])

  const topTotal = Math.max(...rows.map((row) => row.pipeline + row.revenue), 1)

  return (
    <Card>
      <CardHeader title="Product Performance" subtitle="What contacts are actually buying" />
      <Table className="min-w-[680px]">
        <THead>
          <TR>
            <TH>Product</TH>
            <TH className="text-right">Deals</TH>
            <TH className="text-right">Open</TH>
            <TH className="text-right">Won</TH>
            <TH className="text-right">Pipeline</TH>
            <TH className="text-right">Revenue</TH>
            <TH className="w-32">Share</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.product}>
              <TD className="whitespace-nowrap font-medium text-slate-900">{row.product}</TD>
              <TD className="text-right">{row.deals}</TD>
              <TD className="text-right">{row.open}</TD>
              <TD className="text-right font-medium text-emerald-600">{row.won}</TD>
              <TD className="whitespace-nowrap text-right">{formatCurrency(row.pipeline)}</TD>
              <TD className="whitespace-nowrap text-right font-semibold text-slate-900">
                {formatCurrency(row.revenue)}
              </TD>
              <TD>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${Math.max(((row.pipeline + row.revenue) / topTotal) * 100, 2)}%`,
                    }}
                  />
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  )
}
