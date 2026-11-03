import { useEffect, useState } from 'react'
import { Download, Search, RefreshCw, ShieldAlert } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { crmApi } from '../lib/api'
import { useToast } from '../context/ToastContext'

const initialFilters = { actor: '', action: '', target_type: '', search: '', date_from: '', date_to: '' }

export default function WorkspaceAudit() {
  const toast = useToast()
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState({ results: [], actors: [], actions: [], target_types: [], count: 0, page: 1, total_pages: 1, can_export: false, retention_years: 7 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  async function load(page = 1) {
    setLoading(true)
    try { setData(await crmApi.workspaceAudit({ ...filters, page, page_size: 25 })) }
    catch (error) { toast.error?.(error.message || 'Could not load workspace audit trail.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load(1) }, [])

  function change(key, value) { setFilters((current) => ({ ...current, [key]: value })) }
  async function exportCsv() {
    setExporting(true)
    try {
      const blob = await crmApi.exportWorkspaceAudit(filters)
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      const dateLabel = filters.date_from || filters.date_to
        ? `${filters.date_from || 'beginning'}-to-${filters.date_to || 'latest'}`
        : 'all-records'
      link.href = url; link.download = `litecrm-audit-${dateLabel}.csv`
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
      toast.success?.('Audit export downloaded.')
    } catch (error) { toast.error?.(error.message || 'Audit export failed.') }
    finally { setExporting(false) }
  }

  return <div className="space-y-6">
    <PageHeader title="Workspace Audit Trail" subtitle="Search who changed what across the workspace." actions={<div className="flex gap-2"><Button variant="secondary" onClick={() => load(data.page)}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>{data.can_export && <Button onClick={exportCsv} disabled={exporting}><Download className="mr-2 h-4 w-4"/>{exporting ? 'Exporting…' : 'Export CSV'}</Button>}</div>} />
    <Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <select aria-label="Actor" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.actor} onChange={e => change('actor', e.target.value)}><option value="">All users</option>{data.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select aria-label="Action type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.action} onChange={e => change('action', e.target.value)}><option value="">All actions</option>{data.actions.map(a => <option key={a} value={a}>{a}</option>)}</select>
        <select aria-label="Target type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.target_type} onChange={e => change('target_type', e.target.value)}><option value="">All target types</option>{data.target_types.map(a => <option key={a} value={a}>{a}</option>)}</select>
        <input aria-label="From date" type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.date_from} onChange={e => change('date_from', e.target.value)}/>
        <input aria-label="To date" type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.date_to} onChange={e => change('date_to', e.target.value)}/>
        <div className="flex gap-2"><input aria-label="Search target" placeholder="Search target…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.search} onChange={e => change('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)}/><Button onClick={() => load(1)}><Search className="h-4 w-4"/></Button></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Audit entries are retained for {data.retention_years} years by default. Permission changes are highlighted separately.</p>
    </Card>
    <Card>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Audit events</h2><span className="text-sm text-slate-500">{data.count} total</span></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading audit events…</p> : data.results.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No audit events match these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Timestamp','Actor','Action','Target','Before / After','IP / Browser','Correlation ID'].map(x => <th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.results.map(e => <tr key={e.id} className="align-top"><td className="whitespace-nowrap px-3 py-3 text-slate-600">{new Date(e.timestamp).toLocaleString()}</td><td className="px-3 py-3">{e.actor}</td><td className="px-3 py-3">{e.is_permission_change ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"><ShieldAlert className="h-3 w-3"/> {e.action}</span> : <span className="font-medium text-slate-700">{e.action}</span>}</td><td className="px-3 py-3">{e.target_type} <span className="text-slate-500">#{e.target_id || '—'}</span></td><td className="max-w-sm px-3 py-3"><details><summary className="cursor-pointer text-brand-700">View values</summary><pre className="mt-2 max-w-sm whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">Before: {JSON.stringify(e.before, null, 2)}{'\n'}After: {JSON.stringify(e.after, null, 2)}</pre></details></td><td className="max-w-xs px-3 py-3 text-xs text-slate-500">{e.ip_address || '—'}<div className="mt-1 break-words">{e.browser || '—'}</div></td><td className="px-3 py-3 font-mono text-xs text-slate-500">{e.correlation_id}</td></tr>)}</tbody></table></div>}
      <div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">Page {data.page} of {data.total_pages}</span><div className="flex gap-2"><Button variant="secondary" disabled={data.page <= 1 || loading} onClick={() => load(data.page - 1)}>Previous</Button><Button variant="secondary" disabled={data.page >= data.total_pages || loading} onClick={() => load(data.page + 1)}>Next</Button></div></div>
    </Card>
  </div>
}
