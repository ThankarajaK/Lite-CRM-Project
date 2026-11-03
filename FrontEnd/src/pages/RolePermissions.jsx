import { useEffect, useMemo, useState } from 'react'
import { Download, Save, ShieldCheck, RotateCcw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useToast } from '../context/ToastContext'
import { crmApi } from '../lib/api'

const ROLE_ORDER = ['admin', 'sales_manager', 'salesperson']
const ROLE_LABELS = { admin: 'Admin', sales_manager: 'Sales Manager', salesperson: 'Salesperson' }
const GROUPS = [
  { title: 'Leads', match: (key) => /lead/.test(key) },
  { title: 'Contacts', match: (key) => /contact/.test(key) },
  { title: 'Deals', match: (key) => /deal/.test(key) },
  { title: 'Activities & Tasks', match: (key) => /activity|task|history/.test(key) },
  { title: 'Reports & Exports', match: (key) => /report|export/.test(key) },
  { title: 'Administration', match: (key) => /manage_|catalogue|configuration|audit|workspace/.test(key) },
]

function groupFor(permission) {
  return GROUPS.find((group) => group.match(permission.key))?.title || 'Other'
}

function cloneRoles(roles) {
  return roles.map((role) => ({ ...role, permissions: [...(role.permissions || [])] }))
}

export default function RolePermissions() {
  const toast = useToast()
  const [roles, setRoles] = useState([])
  const [staged, setStaged] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  async function loadMatrix() {
    setLoading(true)
    try {
      const result = await crmApi.roleMatrix()
      const ordered = [...(result.roles || [])].sort((a, b) => ROLE_ORDER.indexOf(a.key) - ROLE_ORDER.indexOf(b.key))
      setRoles(ordered)
      setStaged(cloneRoles(ordered))
      setPermissions(result.permissions || [])
    } catch (error) {
      toast.error?.(error.message || 'Could not load role permissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMatrix() }, [])

  const dirty = useMemo(() => JSON.stringify(staged.map(({ id, name, permissions: p }) => ({ id, name, permissions: [...p].sort() }))) !== JSON.stringify(roles.map(({ id, name, permissions: p }) => ({ id, name, permissions: [...(p || [])].sort() }))), [roles, staged])

  const changes = useMemo(() => {
    const output = []
    for (const role of staged) {
      const original = roles.find((item) => item.id === role.id)
      if (!original) continue
      if (original.name !== role.name) output.push({ role: role.key, label: `${ROLE_LABELS[role.key]} role name`, from: original.name, to: role.name })
      const oldSet = new Set(original.permissions || [])
      const nextSet = new Set(role.permissions || [])
      for (const permission of permissions) {
        if (oldSet.has(permission.key) !== nextSet.has(permission.key)) output.push({ role: role.key, label: `${ROLE_LABELS[role.key]} · ${permission.label}`, from: oldSet.has(permission.key) ? 'Enabled' : 'Disabled', to: nextSet.has(permission.key) ? 'Enabled' : 'Disabled' })
      }
    }
    return output
  }, [roles, staged, permissions])

  function toggle(roleId, permissionKey, checked) {
    setStaged((current) => current.map((role) => role.id === roleId ? { ...role, permissions: checked ? [...new Set([...role.permissions, permissionKey])] : role.permissions.filter((key) => key !== permissionKey) } : role))
  }

  function rename(roleId, name) {
    setStaged((current) => current.map((role) => role.id === roleId ? { ...role, name } : role))
  }

  function exportMatrix() {
    const escapeCell = (cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`
    const header = ['Area', 'Permission', ...staged.map((role) => role.name)]
    const rows = permissions.map((permission) => [
      groupFor(permission),
      permission.label,
      ...staged.map((role) => role.permissions.includes(permission.key) ? 'Enabled' : 'Disabled'),
    ])
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'litecrm-role-permission-matrix.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function saveChanges() {
    setSaving(true)
    try {
      await crmApi.saveRoleMatrix({ roles: staged.map(({ id, key, name, permissions: values }) => ({ id, key, name, permissions: values })) })
      toast.success?.('Role permissions saved and audited.')
      setShowPreview(false)
      await loadMatrix()
    } catch (error) {
      toast.error?.(error.message || 'Could not save role permissions.')
    } finally {
      setSaving(false)
    }
  }

  const groupedPermissions = GROUPS.map((group) => ({ ...group, items: permissions.filter((permission) => groupFor(permission) === group.title) })).filter((group) => group.items.length)
  const otherPermissions = permissions.filter((permission) => groupFor(permission) === 'Other')
  if (otherPermissions.length) groupedPermissions.push({ title: 'Other', items: otherPermissions })

  return (
    <div className="space-y-6">
      <PageHeader title="Role & Permission Configuration" subtitle="Review and stage access changes for the three workspace roles." />
      <Card>
        <CardHeader title="Permission matrix" description="Changes stay staged until you review the summary and apply them together." />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">Role changes apply on the next request. Existing signed-in sessions may be affected.</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportMatrix}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            <Button variant="secondary" onClick={() => { setStaged(cloneRoles(roles)); setShowPreview(false) }} disabled={!dirty}><RotateCcw className="mr-2 h-4 w-4" />Discard</Button>
            <Button onClick={() => setShowPreview(true)} disabled={!dirty || loading}><Save className="mr-2 h-4 w-4" />Review & save</Button>
          </div>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading permission matrix…</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[850px] w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="sticky left-0 bg-slate-50 px-4 py-3">Permission</th>{staged.map((role) => <th key={role.id} className="min-w-44 px-4 py-3">{ROLE_LABELS[role.key] || role.name}<div className="mt-2 normal-case tracking-normal"><input aria-label={`${ROLE_LABELS[role.key]} role name`} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800" value={role.name} maxLength={50} onChange={(event) => rename(role.id, event.target.value)} /></div><div className="mt-1 normal-case tracking-normal text-slate-400">{role.active_user_count ?? 0} active · {role.signed_in_count ?? 0} signed in</div></th>)}</tr>
              </thead>
              {groupedPermissions.map((group) => <tbody key={group.title} className="divide-y divide-slate-100">
                <tr className="bg-slate-50/70"><th colSpan={4} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</th></tr>
                {group.items.map((permission) => <tr key={permission.key} className="hover:bg-slate-50/60"><th scope="row" className="px-4 py-3 text-left font-medium text-slate-700">{permission.label}<div className="mt-0.5 font-mono text-[10px] font-normal text-slate-400">{permission.key}</div></th>{staged.map((role) => <td key={role.id} className="px-4 py-3"><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={role.permissions.includes(permission.key)} onChange={(event) => toggle(role.id, permission.key, event.target.checked)} /><span className="text-xs text-slate-500">{role.permissions.includes(permission.key) ? 'Enabled' : 'Disabled'}</span></label></td>)}</tr>)}
              </tbody>)}
            </table>
          </div>
        )}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Lockout protection remains enforced by the backend permission checks. Avoid removing permission-management access from every administrator.</p></div>
      </Card>
      {showPreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="role-change-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><h2 id="role-change-title" className="text-lg font-semibold text-slate-900">Review permission changes</h2><p className="mt-1 text-sm text-slate-500">{changes.length} change(s) will be applied together. Users with these roles may see the changes on their next request.</p><div className="mt-4 max-h-[45vh] overflow-auto rounded-lg border border-slate-200">{changes.length ? <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Change</th><th className="px-3 py-2 text-left">Before</th><th className="px-3 py-2 text-left">After</th></tr></thead><tbody className="divide-y divide-slate-100">{changes.map((change, index) => <tr key={`${change.role}-${change.label}-${index}`}><td className="px-3 py-2">{change.label}</td><td className="px-3 py-2 text-slate-500">{change.from}</td><td className="px-3 py-2 font-medium">{change.to}</td></tr>)}</tbody></table> : <p className="p-4 text-sm text-slate-500">No changes to apply.</p>}</div><p className="mt-3 text-sm text-slate-600">Signed-in user counts are shown above per role. Changes are recorded in the audit trail at permission-cell granularity.</p><div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowPreview(false)}>Continue editing</Button><Button onClick={saveChanges} disabled={saving || !changes.length}>{saving ? 'Saving…' : 'Apply changes'}</Button></div></div></div>}
    </div>
  )
}
