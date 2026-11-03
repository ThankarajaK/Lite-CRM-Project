import { useEffect, useMemo, useState } from 'react'
import { Save, Plus, Trash2, RefreshCw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import { crmApi } from '../lib/api'

const LISTS = [
  ['disqualification_reason', 'Disqualification reasons'],
  ['loss_reason', 'Loss reasons'],
  ['task_type', 'Task types'],
]
const DEFAULT_RULES = { value_editable_stages: ['proposal', 'negotiation'], activity_correction_window_hours: 24, overdue_task_threshold_hours: 0, no_activity_threshold_days: 7 }
const DEFAULT_STAGES = { proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' }

export default function BusinessConfiguration() {
  const toast = useToast()
  const { hasPermission } = useData()
  const [data, setData] = useState({ workspace: { name: 'LiteCRM', currency: 'INR', timezone: 'Asia/Kolkata', date_format: 'DD-MM-YYYY' }, rules: DEFAULT_RULES, stage_names: DEFAULT_STAGES, items: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newItems, setNewItems] = useState({})
  const [tab, setTab] = useState('lists')
  const [dirty, setDirty] = useState(false)
  const canManage = hasPermission('manage_configuration')

  async function load() {
    setLoading(true)
    try { setData(await crmApi.businessConfiguration()); setDirty(false) }
    catch (e) { toast.error('Configuration could not be loaded', e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function update(section, key, value) {
    setData(v => ({ ...v, [section]: { ...v[section], [key]: value } }))
    setDirty(true)
  }
  async function save() {
    setSaving(true)
    try { const result = await crmApi.saveBusinessConfiguration({ workspace: data.workspace, rules: data.rules, stage_names: data.stage_names }); setData(v => ({ ...v, ...result })); setDirty(false); toast.success('Configuration saved', 'Changes are now active for subsequent requests.') }
    catch (e) { toast.error('Save failed', e.message) }
    finally { setSaving(false) }
  }
  async function addItem(type) {
    const name = (newItems[type] || '').trim()
    if (!name) return
    try { const item = await crmApi.createBusinessListItem({ list_type: type, name }); setData(v => ({ ...v, items: [...v.items, item] })); setNewItems(v => ({ ...v, [type]: '' })); toast.success('List item added', name) }
    catch (e) { toast.error('Could not add item', e.message) }
  }
  async function toggleItem(item) {
    try { const updated = await crmApi.updateBusinessListItem(item.id, { active: !item.active }); setData(v => ({ ...v, items: v.items.map(x => x.id === item.id ? updated : x) })) }
    catch (e) { toast.error('Could not update item', e.message) }
  }
  async function removeItem(item) {
    try { await crmApi.deleteBusinessListItem(item.id); setData(v => ({ ...v, items: v.items.filter(x => x.id !== item.id) })); toast.success('List item deleted', item.name) }
    catch (e) { toast.error('Item retained', e.message) }
  }
  const grouped = useMemo(() => Object.fromEntries(LISTS.map(([key]) => [key, data.items.filter(x => x.list_type === key)])), [data.items])

  if (!canManage) return <div className="p-6 text-sm text-slate-500">You do not have permission to manage business configuration.</div>
  return <div className="space-y-6">
    <PageHeader title="Business Configuration" subtitle="Manage workspace lists, sales rules and display settings." actions={<div className="flex gap-2"><Button variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button><Button icon={Save} disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button></div>} />
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">{[['lists','Business Lists'],['rules','Business Rules'],['workspace','Workspace'],['stages','Deal Stages']].map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab===key?'bg-brand-600 text-white':'bg-slate-100 text-slate-700'}`}>{label}</button>)}</div>
    {loading ? <Card>Loading configuration…</Card> : <>
      {tab === 'lists' && <div className="grid gap-4 lg:grid-cols-2">{LISTS.map(([type,label]) => <Card key={type}><h3 className="mb-3 font-semibold text-slate-900">{label}</h3><div className="mb-3 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={`Add ${label.toLowerCase()}`} value={newItems[type] || ''} onChange={e=>setNewItems(v=>({...v,[type]:e.target.value}))}/><Button icon={Plus} onClick={()=>addItem(type)}>Add</Button></div><div className="space-y-2">{(grouped[type] || []).map(item=><div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className={`text-sm ${item.active?'text-slate-800':'text-slate-400 line-through'}`}>{item.name}</span><div className="flex gap-2"><button className="text-xs text-brand-700" onClick={()=>toggleItem(item)}>{item.active?'Deactivate':'Activate'}</button><button className="text-slate-400 hover:text-red-600" onClick={()=>removeItem(item)} title="Delete"><Trash2 size={15}/></button></div></div>)}{!grouped[type]?.length && <p className="text-sm text-slate-400">No custom items yet.</p>}</div></Card>)}</div>}
      {tab === 'rules' && <Card><h3 className="mb-4 font-semibold">Business Rules</h3><div className="grid gap-5 md:grid-cols-2"><label className="text-sm">Activity correction window (hours)<input type="number" min="0" max="720" className="mt-1 w-full rounded-lg border p-2" value={data.rules.activity_correction_window_hours ?? 24} onChange={e=>update('rules','activity_correction_window_hours',Number(e.target.value))}/></label><label className="text-sm">Overdue task threshold (hours)<input type="number" min="0" max="720" className="mt-1 w-full rounded-lg border p-2" value={data.rules.overdue_task_threshold_hours ?? 0} onChange={e=>update('rules','overdue_task_threshold_hours',Number(e.target.value))}/></label><label className="text-sm">No-activity threshold (days)<input type="number" min="1" max="3650" className="mt-1 w-full rounded-lg border p-2" value={data.rules.no_activity_threshold_days ?? 7} onChange={e=>update('rules','no_activity_threshold_days',Number(e.target.value))}/></label></div><div className="mt-5"><p className="mb-2 text-sm font-medium">Stages allowing deal value changes</p>{[['proposal','Proposal'],['negotiation','Negotiation']].map(([key,label])=><label key={key} className="mr-6 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={(data.rules.value_editable_stages || []).includes(key)} onChange={e=>update('rules','value_editable_stages',e.target.checked?[...(data.rules.value_editable_stages||[]),key]:(data.rules.value_editable_stages||[]).filter(x=>x!==key))}/>{label}</label>)}</div></Card>}
      {tab === 'workspace' && <Card><h3 className="mb-4 font-semibold">Workspace Settings</h3><div className="grid gap-4 md:grid-cols-2">{[['name','Workspace name'],['currency','Currency code'],['timezone','IANA time zone']].map(([key,label])=><label key={key} className="text-sm">{label}<input className="mt-1 w-full rounded-lg border p-2" value={data.workspace[key] || ''} onChange={e=>update('workspace',key,e.target.value)}/></label>)}<label className="text-sm">Date format<select className="mt-1 w-full rounded-lg border p-2" value={data.workspace.date_format} onChange={e=>update('workspace','date_format',e.target.value)}>{['DD-MM-YYYY','MM-DD-YYYY','YYYY-MM-DD','DD/MM/YYYY'].map(x=><option key={x}>{x}</option>)}</select></label></div></Card>}
      {tab === 'stages' && <Card><h3 className="mb-2 font-semibold">Deal Stage Names</h3><p className="mb-4 text-sm text-slate-500">Stage identifiers, order and number of stages are fixed. Only display names can be changed.</p><div className="grid gap-4 md:grid-cols-2">{Object.entries(DEFAULT_STAGES).map(([key,label])=><label key={key} className="text-sm">{label} display name<input className="mt-1 w-full rounded-lg border p-2" value={data.stage_names[key] || label} onChange={e=>update('stage_names',key,e.target.value)}/></label>)}</div></Card>}
      <p className="text-xs text-slate-500">Changes are audited when saved. Existing records and fixed stage identifiers are preserved. Product and lead-source catalogues remain in their existing dedicated screens.</p>
    </>}
  </div>
}
