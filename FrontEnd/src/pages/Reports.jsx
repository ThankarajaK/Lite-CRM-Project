import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { crmApi } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import SalespersonPerformance from '../components/reports/SalespersonPerformance'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const monthStartISO = () => `${todayISO().slice(0, 7)}-01`
const money = (minor) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format((Number(minor) || 0) / 100)
const number = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const percent = (value) => `${Number(value || 0).toFixed(1)}%`
const dateTime = (value) => value ? new Date(value).toLocaleString() : '—'

function ReportTable({ columns, rows, empty = 'No records match these filters.' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length ? rows.map((row, index) => <tr key={row.id ?? row.stage ?? row.product_id ?? row.source ?? row.reason ?? index}>
            {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">{column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—')}</td>)}
          </tr>) : <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, description, children }) {
  return <Card className="min-w-0 space-y-4 p-4 sm:p-5"><div><h2 className="text-base font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{children}</Card>
}

export default function Reports() {
  const toast = useToast()
  const { hasPermission } = useData()
  const [startDate, setStartDate] = useState(monthStartISO)
  const [endDate, setEndDate] = useState(todayISO)
  const [owner, setOwner] = useState('')
  const [product, setProduct] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReports = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError('Start date must be on or before end date.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await crmApi.pipelineConversionReports({ start_date: startDate, end_date: endDate, owner, product })
      setReport(result)
    } catch (err) {
      setError(err.message || 'Could not load reports.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, owner, product])

  useEffect(() => { loadReports() }, [loadReports])

  const csvRows = useMemo(() => {
    if (!report) return []
    const rows = [['Report', 'Metric', 'Value']]
    rows.push(['Reporting period', 'Start', report.period.start_date], ['Reporting period', 'End', report.period.end_date], ['Reporting metadata', 'Generated at', report.period.generated_at], ['Reporting scope', 'Scope', report.scope.scope_label], ['Reporting scope', 'Viewer', report.scope.viewer])
    Object.entries(report.conversion.counts).forEach(([key, value]) => rows.push(['Conversion funnel', key, value]))
    Object.entries(report.conversion.rates).forEach(([key, value]) => rows.push(['Conversion rates', key, `${value}%`]))
    report.pipeline.stages.forEach((row) => rows.push(['Pipeline', row.label, `count=${row.count}; value_minor=${row.value_minor}; average_age_days=${row.average_age_days}; inactive_14_days=${row.inactive_14_days}`]))
    report.losses.forEach((row) => rows.push(['Lost deals', row.reason, `count=${row.count}; value_minor=${row.value_minor}`]))
    report.sources.forEach((row) => rows.push(['Lead source', row.source, `lead_volume=${row.lead_volume}; won_deals=${row.won_deals}; won_value_minor=${row.won_value_minor}`]))
    report.products.forEach((row) => rows.push(['Product', row.product, `deal_count=${row.deal_count}; open_pipeline_minor=${row.open_pipeline_minor}; won_revenue_minor=${row.won_revenue_minor}`]))
    return rows
  }, [report])

  const exportReport = async (format) => {
    try {
      const result = await crmApi.createExport('pipeline-conversion', format, { start_date: startDate, end_date: endDate, owner, product })
      if (result?.job_id) toast.info('Export queued', `Exporting ${result.row_count} rows. A notification will appear when it is ready.`)
      else toast.success('Report exported', `Pipeline conversion downloaded as ${format.toUpperCase()}.`)
    } catch (err) { toast.error('Export failed', err.message || 'Could not export this report.') }
  }

  return <div className="space-y-5">
    <PageHeader title="Reports" subtitle="Pipeline health, conversion performance, loss reasons and product outcomes" actions={<div className="flex flex-wrap gap-2 print:hidden"><button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Print</button>{hasPermission('export_records') && ['csv', 'xlsx', 'pdf'].map((format) => <button key={format} type="button" onClick={() => exportReport(format)} disabled={!report || loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />{format.toUpperCase()}</button>)}</div>} />

    <Card className="p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label className="block text-sm font-medium text-slate-700">Start date<input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium text-slate-700">End date<input type="date" value={endDate} min={startDate || undefined} max={todayISO()} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium text-slate-700">Owner<select value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">All permitted owners</option>{(report?.filters?.owners || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Product<select value={product} onChange={(e) => setProduct(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">All products</option>{(report?.filters?.products || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button type="button" onClick={loadReports} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Apply filters</button>
      </div>
      {report && <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:justify-between"><span>Period: <strong className="font-medium text-slate-700">{report.period.start_date} to {report.period.end_date}</strong></span><span>Scope: <strong className="font-medium text-slate-700">{report.scope.scope_label} · {report.scope.viewer}</strong></span><span>Generated: <strong className="font-medium text-slate-700">{dateTime(report.period.generated_at)}</strong></span></div>}
    </Card>

    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading && <p className="text-sm text-slate-500" aria-live="polite">Loading live report data…</p>}
    {!loading && report && <>
      <Section title="Conversion funnel" description="Unique records reaching each stage during the selected period. Rates are measured against the preceding stage.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[['Leads captured', report.conversion.counts.captured, null], ['Qualified', report.conversion.counts.qualified, report.conversion.rates.qualified_from_captured], ['Moved to Contacts', report.conversion.counts.contacts, report.conversion.rates.contacts_from_qualified], ['Deals opened', report.conversion.counts.deals, report.conversion.rates.deals_from_contacts], ['Deals won', report.conversion.counts.won, report.conversion.rates.won_from_deals]].map(([label, value, rate]) => <div key={label} className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{number(value)}</p><p className="mt-1 text-xs text-slate-500">{rate === null ? 'Starting stage' : `${percent(rate)} of previous stage`}</p></div>)}
        </div>
      </Section>

      <Section title="Pipeline by stage" description="Deals opened within the selected period, grouped by their current stage. Average stage age uses stage-change history where available; the 14-day inactivity count applies to open stages.">
        <ReportTable columns={[{key:'label',label:'Stage'},{key:'count',label:'Deal count',render:number},{key:'value_minor',label:'Deal value',render:money},{key:'average_age_days',label:'Average age in stage',render:(v)=>`${v} days`},{key:'inactive_14_days',label:'No activity ≥14 days',render:number}]} rows={report.pipeline.stages} />
      </Section>

      <Section title="Closed-lost analysis" description="Deals closed as lost within the selected period, grouped by loss reason and total lost value.">
        <ReportTable columns={[{key:'reason',label:'Loss reason'},{key:'count',label:'Deals lost',render:number},{key:'value_minor',label:'Lost value',render:money}]} rows={report.losses} />
      </Section>

      <Section title="Lead source outcomes" description="Lead volume is based on leads captured during the selected period; won value shows the eventual revenue from that captured cohort, attributed to the source on the related lifecycle record.">
        <ReportTable columns={[{key:'source',label:'Source'},{key:'lead_volume',label:'Leads captured',render:number},{key:'won_deals',label:'Won deals',render:number},{key:'won_value_minor',label:'Won value',render:money}]} rows={report.sources} />
      </Section>

      <Section title="Product performance" description="Deal count reflects deals opened in the period; open pipeline and won revenue use the selected period.">
        <ReportTable columns={[{key:'product',label:'Product'},{key:'deal_count',label:'Deals opened',render:number},{key:'open_pipeline_minor',label:'Open pipeline',render:money},{key:'won_revenue_minor',label:'Won revenue',render:money}]} rows={report.products} />
      </Section>

      <SalespersonPerformance startDate={startDate} endDate={endDate} owner={owner} />
    </>}
  </div>
}
