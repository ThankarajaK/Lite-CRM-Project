import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProcessSteps from '../components/layout/ProcessSteps'
import Button from '../components/ui/Button'
import SearchBar from '../components/ui/SearchBar'
import FilterDropdown from '../components/ui/FilterDropdown'
import Skeleton from '../components/ui/Skeleton'
import KanbanColumn from '../components/deals/KanbanColumn'
import DealFormModal from '../components/deals/DealFormModal'
import DealDrawer from '../components/deals/DealDrawer'
import LogActivityModal from '../components/contacts/LogActivityModal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { CLOSED_STAGES, DEAL_STAGES, PRODUCTS } from '../data/mockData'
import { formatCurrency } from '../utils/format'

/**
 * STEP 3 — the board.
 *
 * Deals arrive at Proposal and move right: Proposal → Negotiation → Won, or
 * out to Lost. The value stays editable in Proposal and Negotiation.
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
  } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const loading = useSimulatedLoading()

  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('')
  const [product, setProduct] = useState('')

  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [logging, setLogging] = useState(null)

  const [draggingDeal, setDraggingDeal] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return deals.filter((deal) => {
      const matchesTerm =
        !term ||
        deal.contact.toLowerCase().includes(term) ||
        deal.product.toLowerCase().includes(term) ||
        deal.name.toLowerCase().includes(term)
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

  /** How many activities are logged against each record, for the card badge. */
  const activityCounts = useMemo(() => {
    const counts = {}
    Object.entries(activityLog).forEach(([recordId, entries]) => {
      counts[recordId] = entries.length
    })
    return counts
  }, [activityLog])

  const totals = useMemo(() => {
    const open = filtered.filter((deal) => !CLOSED_STAGES.includes(deal.stage))
    return {
      count: filtered.length,
      openValue: open.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
    }
  }, [filtered])

  async function handleMove(deal, stage) {
    if (!deal || deal.stage === stage) return
    await moveDeal(deal.id, stage)
    setViewing((current) => (current?.id === deal.id ? { ...current, stage } : current))
    const closing = CLOSED_STAGES.includes(stage)
    toast.success(
      `Moved to ${stage}`,
      closing ? `${deal.contact} · value is now locked` : `${deal.contact} · ${deal.product}`
    )
  }

  async function moveByOffset(deal, offset) {
    const next = DEAL_STAGES[DEAL_STAGES.indexOf(deal.stage) + offset]
    if (next) await handleMove(deal, next)
  }

  async function handleDrop(stage) {
    setDropTarget(null)
    if (draggingDeal) await handleMove(draggingDeal, stage)
    setDraggingDeal(null)
  }

  /** Inline value edit from a card or the drawer. */
  function handleValueChange(deal, nextValue) {
    const updated = updateDealValue(deal.id, nextValue)
    if (!updated) {
      toast.error('Value is locked', `${deal.name} is ${deal.stage}.`)
      return
    }
    setViewing((current) => (current?.id === deal.id ? { ...current, value: updated.value } : current))
    toast.success(
      'Deal value updated',
      `${formatCurrency(deal.value)} → ${formatCurrency(updated.value)}`
    )
  }

  function handleEditSubmit(values) {
    if (!editing) return
    updateDeal(editing.id, { ...values, name: `${values.product} — ${editing.contact}` })
    setViewing((current) => (current?.id === editing.id ? { ...current, ...values } : current))
    toast.success('Deal updated', editing.contact)
    setEditing(null)
  }

  /**
   * Activity is logged against the contact, so a deal resolves to its contact
   * through the `recordId` they share.
   */
  const contactForDeal = (deal) =>
    deal ? contacts.find((contact) => contact.recordId === deal.recordId) : null

  const loggingContact = contactForDeal(logging)

  async function handleLogActivity(values) {
    if (!loggingContact) return
    await logActivity(loggingContact, values)
    setLogging(null)
    toast.success(`${values.type} logged`, `${values.title} · ${loggingContact.company}`)
  }

  return (
    <div className="space-y-5">
      <ProcessSteps
        current="deals"
        counts={{ leads: stats.totalLeads, contacts: stats.totalContacts, deals: stats.totalDeals }}
      />

      <PageHeader
        title="Deals"
        subtitle="Proposal → Negotiation → Won or Lost. Value is editable until the deal closes."
        actions={
          <Button icon={Plus} onClick={() => navigate('/contacts')}>
            New Deal
          </Button>
        }
      />

      {/* Board toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:flex-row lg:items-center">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search deals..."
          className="w-full lg:w-64 lg:shrink-0"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
          <FilterDropdown
            label="Owner"
            value={owner}
            options={users.map((item) => item.display_name)}
            onChange={setOwner}
            className="lg:w-48"
          />
          <FilterDropdown
            label="Product"
            value={product}
            options={PRODUCTS}
            onChange={setProduct}
            className="lg:w-52"
          />
        </div>
        <div className="text-sm text-slate-500 lg:ml-auto">
          <span className="font-medium text-slate-900">{totals.count}</span> deals ·{' '}
          <span className="font-medium text-slate-900">{formatCurrency(totals.openValue)}</span>{' '}
          open pipeline
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="scrollbar-slim flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <Skeleton key={stage} className="h-96 w-[300px] shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="scrollbar-slim flex gap-4 overflow-x-auto pb-4">
          {board.map(({ stage, deals: stageDeals }) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={stageDeals}
              isDropTarget={dropTarget === stage && draggingDeal?.stage !== stage}
              activityCounts={activityCounts}
              draggingId={draggingDeal?.id}
              onOpenDeal={setViewing}
              onValueChange={handleValueChange}
              onDragStart={setDraggingDeal}
              onDragEnd={() => {
                setDraggingDeal(null)
                setDropTarget(null)
              }}
              onDragOver={setDropTarget}
              onDragLeave={() => setDropTarget(null)}
              onDrop={handleDrop}
              onMovePrev={(deal) => moveByOffset(deal, -1)}
              onMoveNext={(deal) => moveByOffset(deal, 1)}
              canMovePrev={DEAL_STAGES.indexOf(stage) > 0}
              canMoveNext={DEAL_STAGES.indexOf(stage) < DEAL_STAGES.length - 1}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>Drag a card between columns, or use the ‹ › arrows to move it with the keyboard.</span>
        <span>Click a deal value to change it — it locks once the deal is Won or Lost.</span>
        <span>Open a card to read its Activity and History — at any stage.</span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          New deals start from a contact.
        </span>
      </div>

      <DealFormModal
        open={Boolean(editing)}
        deal={editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />

      <DealDrawer
        deal={viewing}
        open={Boolean(viewing)}
        activity={viewing ? (activityLog[viewing.recordId] ?? []) : []}
        history={viewing ? (auditLog[viewing.recordId] ?? []) : []}
        onClose={() => setViewing(null)}
        onEdit={(deal) => setEditing(deal)}
        onMove={handleMove}
        onValueChange={handleValueChange}
        onLogActivity={(deal) => setLogging(deal)}
      />

      <LogActivityModal
        open={Boolean(logging && loggingContact)}
        record={loggingContact}
        deals={
          loggingContact ? deals.filter((deal) => deal.contact === loggingContact.company) : []
        }
        defaultDeal={logging?.name ?? ''}
        onClose={() => setLogging(null)}
        onConfirm={handleLogActivity}
      />
    </div>
  )
}
