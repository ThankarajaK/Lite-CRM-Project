import DealCard from './DealCard'
import { cn, formatCurrency } from '../../utils/format'

/** Colour strip at the top of each column, matching the stage badges. */
const STAGE_ACCENT = {
  Proposal: 'bg-brand-500',
  Negotiation: 'bg-amber-400',
  Won: 'bg-emerald-500',
  Lost: 'bg-red-400',
}

/** One pipeline stage: header, drop zone and its deal cards. */
export default function KanbanColumn({
  stage,
  deals,
  activityCounts = {},
  isDropTarget,
  draggingId,
  onOpenDeal,
  onValueChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMovePrev,
  onMoveNext,
  canMovePrev,
  canMoveNext,
}) {
  const total = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onDragOver(stage)
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(stage)
      }}
      aria-label={`${stage} stage, ${deals.length} deals`}
      className={cn(
        'flex w-[300px] shrink-0 flex-col rounded-xl border bg-slate-100/70 transition-colors',
        isDropTarget ? 'border-brand-400 bg-brand-50/70' : 'border-slate-200'
      )}
    >
      {/* Column header */}
      <div className="rounded-t-xl border-b border-slate-200 bg-white px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', STAGE_ACCENT[stage] ?? 'bg-slate-300')} />
          <h3 className="text-sm font-semibold text-slate-900">{stage}</h3>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
            {deals.length}
          </span>
          <span className="ml-auto text-xs text-slate-500">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="scrollbar-slim flex max-h-[calc(100vh-20rem)] min-h-[140px] flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center">
            <p className="text-xs text-slate-400">
              Drop a deal here
              <br />
              or use the arrows on a card
            </p>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              activityCount={activityCounts[deal.recordId] ?? 0}
              dragging={draggingId === deal.id}
              onOpen={onOpenDeal}
              onValueChange={onValueChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMovePrev={onMovePrev}
              onMoveNext={onMoveNext}
              canMovePrev={canMovePrev}
              canMoveNext={canMoveNext}
            />
          ))
        )}
      </div>
    </section>
  )
}
