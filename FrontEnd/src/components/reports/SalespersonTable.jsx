import Card, { CardHeader } from '../ui/Card'
import Table, { TBody, TD, TH, THead, TR } from '../ui/Table'
import Avatar from '../ui/Avatar'
import { formatCurrency } from '../../utils/format'

/** Per-rep performance: leads owned, deals, deals won, revenue closed. */
export default function SalespersonTable({ rows }) {
  const topRevenue = Math.max(...rows.map((row) => row.revenue), 1)

  return (
    <Card>
      <CardHeader title="Salesperson Performance" subtitle="This quarter" />
      <Table className="min-w-[620px]">
        <THead>
          <TR>
            <TH>Salesperson</TH>
            <TH className="text-right">Leads</TH>
            <TH className="text-right">Deals</TH>
            <TH className="text-right">Won</TH>
            <TH className="text-right">Revenue</TH>
            <TH className="w-40">Share</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.name}>
              <TD>
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.name} size="sm" />
                  <div className="min-w-0">
                    <p className="whitespace-nowrap font-medium text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.role}</p>
                  </div>
                </div>
              </TD>
              <TD className="text-right">{row.leads}</TD>
              <TD className="text-right">{row.deals}</TD>
              <TD className="text-right font-medium text-emerald-600">{row.won}</TD>
              <TD className="whitespace-nowrap text-right font-semibold text-slate-900">
                {formatCurrency(row.revenue)}
              </TD>
              <TD>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max((row.revenue / topRevenue) * 100, 2)}%` }}
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
