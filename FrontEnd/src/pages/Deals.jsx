import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
    loadLeadTimeline,
    activityPagination,
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

  const [draggingDeal, setDraggingDeal] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

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

  /** How many activities are logged against each record, for the card badge. */
  const activityCounts = useMemo(() => {
    const counts = {}

    Object.entries(activityLog).forEach(([recordId, entries]) => {
      counts[recordId] = entries.length
    })

    return counts
  }, [activityLog])

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
  function handleValueChange(deal, nextValue) {
    const updated = updateDealValue(deal.id, nextValue)

    if (!updated) {
      toast.error(
        'Value is locked',
        `${deal.name} is ${deal.stage}.`
      )
      return
    }

    setViewing((current) =>
      current?.id === deal.id
        ? { ...current, value: updated.value }
        : current
    )

    toast.success(
      'Deal value updated',
      `${formatCurrency(deal.value)} → ${formatCurrency(updated.value)}`
    )
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
          <Button
            icon={Plus}
            onClick={() => navigate('/contacts')}
            className="w-full sm:w-auto"
          >
            New Deal
          </Button>
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
        onValueChange={handleValueChange}
        onLogActivity={(deal) => setLogging(deal)}
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