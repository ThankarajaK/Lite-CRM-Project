import { useEffect, useMemo, useState } from 'react'
import { Download, ArrowUpDown, RefreshCw } from 'lucide-react'
import Card from '../ui/Card'
import { crmApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'

const money = (minor) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format((Number(minor) || 0) / 100)
const number = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const percent = (value) => `${Number(value || 0).toFixed(1)}%`
const columns = [
  { key: 'name', label: 'Salesperson', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'leads_owned', label: 'Leads owned', type: 'number' },
  { key: 'contacts', label: 'Contacts', type: 'number' },
  { key: 'open_deals', label: 'Open deals', type: 'number' },
  { key: 'open_value_minor', label: 'Open value', type: 'money' },
  { key: 'won_count', label: 'Won count', type: 'number' },
  { key: 'won_value_minor', label: 'Won value', type: 'money' },
  { key: 'win_rate', label: 'Win rate', type: 'percent' },
  { key: 'activity_volume', label: 'Activities', type: 'number' },
]
const comparisonColumns = [
  { key: 'leads_owned', label: 'Leads', type: 'number' },
  { key: 'contacts', label: 'Contacts', type: 'number' },
  { key: 'open_deals', label: 'Open deals', type: 'number' },
  { key: 'open_value_minor', label: 'Open value', type: 'money' },
  { key: 'won_count', label: 'Won count', type: 'number' },
  { key: 'won_value_minor', label: 'Won value', type: 'money' },
  { key: 'win_rate', label: 'Win rate', type: 'percent' },
  { key: 'activity_volume', label: 'Activities', type: 'number' },
]
const formatValue = (value, type) => type === 'money' ? money(value) : type === 'percent' ? percent(value) : type === 'number' ? number(value) : (value ?? '—')

export default function SalespersonPerformance({ startDate, endDate, owner = '' }) {
  const toast = useToast()
  const { hasPermission } = useData()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState({ key: 'won_value_minor', direction: 'desc' })

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    crmApi.salespersonPerformanceReports({ start_date: startDate, end_date: endDate, owner })
      .then((result) => { if (active) setData(result) })
      .catch((err) => { if (active) { setError(err.message || 'Could not load salesperson performance.'); setData(null) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [startDate, endDate, owner])

  const rows = useMemo(() => {
    const items = [...(data?.rows || [])]
    const column = columns.find((item) => item.key === sort.key)
    items.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const result = column?.type === 'text'
        ? String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base' })
        : (Number(av) || 0) - (Number(bv) || 0)
      return sort.direction === 'asc' ? result : -result
    })
    return items
  }, [data, sort])

  const toggleSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))

  const exportPerformance = async (format = 'csv') => {
    try {
      const result = await crmApi.createExport('salesperson-performance', format, { start_date: startDate, end_date: endDate, owner })
      if (result?.job_id) toast.info('Export queued', `Exporting ${result.row_count} rows. You will be notified when it is ready.`)
      else toast.success('Report exported', `Salesperson performance downloaded as ${format.toUpperCase()}.`)
    } catch (err) { toast.error('Export failed', err.message || 'Could not export performance report.') }
  }

  return <Card className="min-w-0 space-y-4 p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Salesperson performance</h2>
        <p className="mt-1 text-sm text-slate-500">Results and activity by person, compared with the immediately preceding period.</p>
        {data && <p className="mt-1 text-xs text-slate-500">Period: <strong className="font-medium text-slate-700">{data.period.start_date} to {data.period.end_date}</strong> · Previous: <strong className="font-medium text-slate-700">{data.previous_period.start_date} to {data.previous_period.end_date}</strong> · Scope: <strong className="font-medium text-slate-700">{data.scope.scope_label} · {data.scope.viewer}</strong></p>}
      </div>
      {hasPermission('export_records') && <div className="flex flex-wrap gap-2 print:hidden">{['csv', 'xlsx', 'pdf'].map((format) => <button key={format} type="button" onClick={() => exportPerformance(format)} disabled={!data || loading || !rows.length} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" />{format.toUpperCase()}</button>)}</div>}
    </div>
    {loading && <p className="inline-flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading performance data…</p>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading && data && <>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[1150px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-600"><button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1.5 hover:text-slate-900" aria-label={`Sort by ${column.label}`}>{column.label}<ArrowUpDown className={`h-3.5 w-3.5 ${sort.key === column.key ? 'text-blue-600' : 'text-slate-400'}`} />{sort.key === column.key ? <span className="text-xs">{sort.direction === 'asc' ? '↑' : '↓'}</span> : null}</button></th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 bg-white">{rows.length ? rows.map((row) => <tr key={row.user_id}>
            {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-3 text-slate-700">{formatValue(row[column.key], column.type)}</td>)}
          </tr>) : <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">No active users are available in this reporting scope.</td></tr>}</tbody>
        </table>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Comparison with previous period</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[1050px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50"><tr><th className="px-3 py-3 text-left font-semibold text-slate-600">Salesperson</th>{comparisonColumns.map((column) => <th key={column.key} className="px-3 py-3 text-left font-semibold text-slate-600">{column.label} change</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">{rows.map((row) => <tr key={row.user_id}>{<td className="px-3 py-3 font-medium text-slate-800">{row.name}</td>}{comparisonColumns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-3 text-slate-700">{formatValue(row.comparison[column.key], column.type)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </>}
  </Card>
}
