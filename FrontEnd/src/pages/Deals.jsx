import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Briefcase, Download, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProcessSteps from '../components/layout/ProcessSteps'
import Button from '../components/ui/Button'
import SearchBar from '../components/ui/SearchBar'
import FilterDropdown from '../components/ui/FilterDropdown'
import Skeleton from '../components/ui/Skeleton'
import KanbanColumn from '../components/deals/KanbanColumn'
import DealFormModal from '../components/deals/DealFormModal'
import DealDrawer from '../components/deals/DealDrawer'
import Modal from '../components/ui/Modal'
import LogActivityModal from '../components/contacts/LogActivityModal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { crmApi } from '../lib/api'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { CLOSED_STAGES, DEAL_STAGES, PRODUCTS } from '../data/mockData'
import { formatCurrency } from '../utils/format'

/**
 * STEP 3 — the board.
 *
 * Deals arrive at Proposal and move right:
 * Proposal → Negotiation → Won, or out to Lost.
 *
 * Responsive behavior:
 * - Mobile: Kanban remains horizontally scrollable.
 * - Tablet: filters stack cleanly.
 * - Desktop: full-width board and toolbar.
 *
 * Existing business logic and functionality are preserved.
 */
export default function Deals() {
  const {
    deals,
    contacts,
    stats,
    users,
    activityLog,
    auditLog,
    logActivity,
    updateDeal,
    updateDealValue,
    moveDeal,
    reopenDeal,
    refreshCrm,
    loadLeadTimeline,
    activityPagination,
    hasPermission,
  } = useData()

  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const loading = useSimulatedLoading()

  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('')
  const [product, setProduct] = useState('')

  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [logging, setLogging] = useState(null)
  const [closingDeal, setClosingDeal] = useState(null)
  const [closeForm, setCloseForm] = useState({ loss_reason: '', loss_reason_detail: '', contract_start_date: '', close_note: '' })
  const [configuredLossReasons, setConfiguredLossReasons] = useState([])

  useEffect(() => {
    let active = true
    crmApi.businessConfiguration()
      .then((config) => {
        if (active) setConfiguredLossReasons((config.items || []).filter((item) => item.list_type === 'loss_reason'))
      })
      .catch((error) => console.warn('Could not load configured loss reasons:', error))
    return () => { active = false }
  }, [])

  const [draggingDeal, setDraggingDeal] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  // Keep other open board sessions in sync with server-side stage changes.
  // Refresh every 12 seconds so updates are visible within the 15-second PRD limit.
  useEffect(() => {
    let active = true
    const syncBoard = () => {
      if (document.visibilityState === 'visible') {
        refreshCrm().catch((error) => {
          if (active) console.warn('Deal board sync failed:', error)
        })
      }
    }
    const intervalId = window.setInterval(syncBoard, 12_000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncBoard()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshCrm])

  async function openDeal(deal) {
    if (!deal) return
    try {
      const logs = await loadLeadTimeline(deal.recordId)
      setViewing({ ...deal, ...logs })
    } catch (error) {
      console.error('Deal timeline load failed:', error)
      setViewing(deal)
      toast.error('Could not load deal history', error?.message || 'Please try again.')
    }
  }

  // Allow links from Contact detail to open a specific Deal directly.
  useEffect(() => {
    const targetDealId = searchParams.get('deal')
    if (!targetDealId || !deals.length) return

    const targetDeal = deals.find((deal) => String(deal.id) === String(targetDealId))
    if (!targetDeal) return

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('deal')
      return next
    }, { replace: true })
    openDeal(targetDeal)
  }, [deals, searchParams, setSearchParams])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()

    return deals.filter((deal) => {
      const matchesTerm =
        !term ||
        (deal.contact ?? '').toLowerCase().includes(term) ||
        (deal.product ?? '').toLowerCase().includes(term) ||
        (deal.name ?? '').toLowerCase().includes(term)

      return (
        matchesTerm &&
        (!owner || deal.owner === owner) &&
        (!product || deal.product === product)
      )
    })
  }, [deals, query, owner, product])

  const board = useMemo(
    () =>
      DEAL_STAGES.map((stage) => ({
        stage,
        deals: filtered.filter((deal) => deal.stage === stage),
      })),
    [filtered]
  )

  /**
   * How many activities are logged against each contact/record for the card badge.
   * The deal list supplies the persisted count; a loaded timeline overrides it so
   * newly logged activity appears immediately without waiting for a full refresh.
   */
  const activityCounts = useMemo(() => {
    const counts = {}

    deals.forEach((deal) => {
      counts[deal.recordId] = Number(deal.activityCount) || 0
    })

    Object.entries(activityLog).forEach(([recordId, entries]) => {
      counts[recordId] = entries.length
    })

    return counts
  }, [deals, activityLog])

  const totals = useMemo(() => {
    const open = filtered.filter(
      (deal) => !CLOSED_STAGES.includes(deal.stage)
    )

    return {
      count: filtered.length,
      openValue: open.reduce(
        (sum, deal) => sum + (Number(deal.value) || 0),
        0
      ),
    }
  }, [filtered])

  async function handleMove(deal, stage) {
    if (!deal || deal.stage === stage) return
    if (CLOSED_STAGES.includes(stage)) {
      setClosingDeal({ deal, stage })
      setCloseForm({ loss_reason: '', loss_reason_detail: '', contract_start_date: '', close_note: '' })
      return
    }

    try {
      await moveDeal(deal.id, stage)

      setViewing((current) =>
        current?.id === deal.id
          ? { ...current, stage }
          : current
      )

      const closing = CLOSED_STAGES.includes(stage)
      toast.success(
        `Moved to ${stage}`,
        closing
          ? `${deal.contact} · value is now locked`
          : `${deal.contact} · ${deal.product}`
      )
    } catch (error) {
      // moveDeal rehydrates from the server after a failed write; refresh once
      // more as a best effort if that rehydration itself failed.
      await refreshCrm().catch(() => {})
      const reason = error?.message || 'The server could not save this stage change.'
      toast.error('Deal stage was not changed', reason)
    }
  }

  async function confirmCloseDeal(event) {
    event.preventDefault()
    if (!closingDeal) return
    const { deal, stage } = closingDeal
    try {
      await moveDeal(deal.id, stage, closeForm)
      setViewing((current) => current?.id === deal.id ? {
        ...current,
        stage,
        lossReason: stage === 'Lost' ? closeForm.loss_reason : '',
        lossReasonDetail: stage === 'Lost' ? closeForm.loss_reason_detail : '',
        contractStartDate: stage === 'Won' ? closeForm.contract_start_date : '',
        closeNote: closeForm.close_note,
        closedAt: new Date().toISOString().slice(0, 10),
      } : current)
      toast.success(`Deal closed ${stage}`, `${deal.contact} · value locked`)
      setClosingDeal(null)
    } catch (error) {
      toast.error('Deal was not closed', error?.message || 'The server rejected the closing action.')
    }
  }

  async function handleReopen(deal, reason) {
    try {
      await reopenDeal(deal.id, reason)
      setViewing((current) => current?.id === deal.id ? { ...current, stage: 'Negotiation' } : current)
      toast.success('Deal reopened', `${deal.contact} · moved to Negotiation`)
    } catch (error) {
      toast.error('Deal was not reopened', error?.message || 'The server rejected the reopening action.')
    }
  }

  async function moveByOffset(deal, offset) {
    const next =
      DEAL_STAGES[DEAL_STAGES.indexOf(deal.stage) + offset]

    if (next) {
      await handleMove(deal, next)
    }
  }

  async function handleDrop(stage) {
    setDropTarget(null)

    if (draggingDeal) {
      await handleMove(draggingDeal, stage)
    }

    setDraggingDeal(null)
  }

  /** Inline value edit from a card or the drawer. */
  async function handleValueChange(deal, nextValue) {
    try {
      const updated = await updateDealValue(deal.id, nextValue)
      setViewing((current) =>
        current?.id === deal.id
          ? { ...current, value: updated.value }
          : current
      )
      toast.success(
        'Deal value updated',
        `${formatCurrency(deal.value)} → ${formatCurrency(updated.value)}`
      )
    } catch (error) {
      toast.error(
        'Could not update deal value',
        error?.message || 'The value was not saved. Please try again.'
      )
    }
  }

  function handleEditSubmit(values) {
    if (!editing) return

    updateDeal(editing.id, {
      ...values,
      name: `${values.product} — ${editing.contact}`,
    })

    setViewing((current) =>
      current?.id === editing.id
        ? { ...current, ...values }
        : current
    )

    toast.success(
      'Deal updated',
      editing.contact
    )

    setEditing(null)
  }

  /**
   * Activity is logged against the contact, so a deal resolves to its contact
   * through the recordId they share.
   */
  const contactForDeal = (deal) =>
    deal
      ? contacts.find(
          (contact) => contact.recordId === deal.recordId
        )
      : null

  const loggingContact = contactForDeal(logging)

  async function handleLogActivity(values) {
    if (!loggingContact) return

    await logActivity(loggingContact, values)

    setLogging(null)

    toast.success(
      `${values.type} logged`,
      `${values.title} · ${loggingContact.company}`
    )
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* Sales process */}
      <div className="min-w-0 overflow-hidden">
        <ProcessSteps
          current="deals"
          counts={{
            leads: stats.totalLeads,
            contacts: stats.totalContacts,
            deals: stats.totalDeals,
          }}
        />
      </div>

      {/* Page heading */}
      <PageHeader
        title="Deals"
        subtitle="Proposal → Negotiation → Won or Lost. Value is editable until the deal closes."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            {hasPermission('export_records') && ['csv', 'xlsx'].map((format) => <Button key={format} variant="secondary" icon={Download} onClick={async () => { try { const result = await crmApi.createExport('deals', format, { search: query, stage: searchParams.get('stage') || '', product }); if (result?.job_id) toast.info('Export queued', `Exporting ${result.row_count} rows. You will be notified when ready.`); else toast.success('Deals exported', `The filtered deal list was downloaded as ${format.toUpperCase()}.`) } catch (err) { toast.error('Export failed', err.message || 'Could not export deals.') } }}>{format === 'csv' ? 'Export CSV' : 'Export Excel'}</Button>)}
            <Button icon={Plus} onClick={() => navigate('/contacts')} className="w-full sm:w-auto">New Deal</Button>
          </div>
        }
      />

      {/* Board toolbar */}
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          {/* Search */}
          <div className="w-full min-w-0 xl:w-72 xl:shrink-0">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search deals..."
              className="w-full"
            />
          </div>

          {/* Filters */}
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:items-center">
            <FilterDropdown
              label="Owner"
              value={owner}
              options={users.map((item) => item.display_name)}
              onChange={setOwner}
              className="w-full xl:w-48"
            />

            <FilterDropdown
              label="Product"
              value={product}
              options={PRODUCTS}
              onChange={setProduct}
              className="w-full xl:w-52"
            />
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 pt-3 text-sm text-slate-500 xl:ml-auto xl:border-t-0 xl:pt-0 xl:text-right">
            <p className="mb-1 text-xs text-slate-400">
              Showing deals you have access to · totals reflect current filters
            </p>
            <span className="font-medium text-slate-900">
              {totals.count}
            </span>{' '}
            {totals.count === 1 ? 'deal' : 'deals'}
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(totals.openValue)}
            </span>{' '}
            open pipeline
          </div>
        </div>
      </section>

      {/* Kanban board */}
      {loading ? (
        <div className="scrollbar-slim -mx-1 flex gap-3 overflow-x-auto px-1 pb-4 sm:gap-4">
          {DEAL_STAGES.map((stage) => (
            <Skeleton
              key={stage}
              className="h-96 w-[280px] shrink-0 rounded-xl sm:w-[300px]"
            />
          ))}
        </div>
      ) : (
        <div className="min-w-0">
          <div className="scrollbar-slim -mx-1 flex gap-3 overflow-x-auto px-1 pb-4 sm:gap-4">
            {board.map(({ stage, deals: stageDeals }) => (
              <div
                key={stage}
                className="w-[280px] shrink-0 sm:w-[300px]"
              >
                <KanbanColumn
                  stage={stage}
                  deals={stageDeals}
                  isDropTarget={
                    dropTarget === stage &&
                    draggingDeal?.stage !== stage
                  }
                  activityCounts={activityCounts}
                  draggingId={draggingDeal?.id}
                  onOpenDeal={openDeal}
                  onValueChange={handleValueChange}
                  onDragStart={setDraggingDeal}
                  onDragEnd={() => {
                    setDraggingDeal(null)
                    setDropTarget(null)
                  }}
                  onDragOver={setDropTarget}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={handleDrop}
                  onMovePrev={(deal) =>
                    moveByOffset(deal, -1)
                  }
                  onMoveNext={(deal) =>
                    moveByOffset(deal, 1)
                  }
                  canMovePrev={
                    DEAL_STAGES.indexOf(stage) > 0
                  }
                  canMoveNext={
                    DEAL_STAGES.indexOf(stage) <
                    DEAL_STAGES.length - 1
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board help text */}
      <div className="flex flex-col gap-2 text-xs leading-5 text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
        <span>
          Drag a card between columns, or use the ‹ › arrows
          to move it with the keyboard.
        </span>

        <span>
          Click a deal value to change it — it locks once the
          deal is Won or Lost.
        </span>

        <span>
          Open a card to read its Activity and History — at any
          stage.
        </span>

        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3 w-3 shrink-0" />
          New deals start from a contact.
        </span>
      </div>

      <Modal
        open={Boolean(closingDeal)}
        onClose={() => setClosingDeal(null)}
        title={closingDeal?.stage === 'Lost' ? 'Close deal as Lost' : 'Close deal as Won'}
        description="Closing locks the deal value and records the outcome in history."
      >
        <form onSubmit={confirmCloseDeal} className="space-y-4 p-5">
          {closingDeal?.stage === 'Lost' ? <>
            <label className="block text-sm font-medium text-slate-700">Loss reason *
              <select required value={closeForm.loss_reason} onChange={(e) => setCloseForm((v) => ({ ...v, loss_reason: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Choose a reason</option>
                {Array.from(new Map([
                  ['price', 'Price'], ['product_fit', 'Product fit'], ['timing', 'Timing'],
                  ['competitor', 'Competitor'], ['no_decision', 'No decision'], ['no_response', 'No response'], ['other', 'Other'],
                  ...configuredLossReasons.filter((item) => item.active).map((item) => [item.name, item.name]),
                  ...(closeForm.loss_reason ? [[closeForm.loss_reason, closeForm.loss_reason]] : []),
                ]).entries()).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {closeForm.loss_reason === 'other' ? <label className="block text-sm font-medium text-slate-700">Explain the other reason *
              <textarea required minLength={12} value={closeForm.loss_reason_detail} onChange={(e) => setCloseForm((v) => ({ ...v, loss_reason_detail: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} placeholder="Write a sentence explaining the loss reason." />
            </label> : null}
          </> : <label className="block text-sm font-medium text-slate-700">Contract start date (optional)
            <input type="date" value={closeForm.contract_start_date} onChange={(e) => setCloseForm((v) => ({ ...v, contract_start_date: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>}
          <label className="block text-sm font-medium text-slate-700">Note (optional)
            <textarea value={closeForm.close_note} onChange={(e) => setCloseForm((v) => ({ ...v, close_note: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setClosingDeal(null)}>Cancel</Button>
            <Button type="submit">Confirm {closingDeal?.stage}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit deal modal */}
      <DealFormModal
        open={Boolean(editing)}
        deal={editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />

      {/* Deal drawer */}
      <DealDrawer
        deal={viewing}
        open={Boolean(viewing)}
        activity={
          viewing
            ? (activityLog[viewing.recordId] ?? [])
            : []
        }
        activityHasMore={Boolean(viewing && activityPagination[viewing.recordId]?.nextPage)}
        onLoadMoreActivity={() => {
          if (!viewing) return Promise.resolve()
          return loadLeadTimeline(viewing.recordId, activityPagination[viewing.recordId]?.nextPage)
        }}
        onActivityChanged={async () => {
          if (!viewing) return

          const logs = await loadLeadTimeline(
            viewing.recordId,
            1,
          )

          setViewing((current) =>
            current
              ? { ...current, ...logs }
              : current,
          )
        }}
        history={
          viewing
            ? (auditLog[viewing.recordId] ?? [])
            : []
        }
        onClose={() => setViewing(null)}
        onEdit={(deal) => setEditing(deal)}
        onMove={handleMove}
        onReopen={handleReopen}
        onValueChange={handleValueChange}
        onLogActivity={(deal) => setLogging(deal)}
        hasPermission={hasPermission}
      />

      {/* Activity modal */}
      <LogActivityModal
        open={Boolean(logging && loggingContact)}
        record={loggingContact}
        deals={
          loggingContact
            ? deals.filter(
                (deal) =>
                  deal.contact === loggingContact.company
              )
            : []
        }
        defaultDeal={logging?.name ?? ''}
        onClose={() => setLogging(null)}
        onConfirm={handleLogActivity}
      />
    </div>
  )
}