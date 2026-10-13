import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MessagesSquare,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import Tooltip from '../ui/Tooltip'
import EditableValue from '../ui/EditableValue'
import { VALUE_EDITABLE_STAGES } from '../../data/mockData'
import { cn, formatShortDate, isOverdue } from '../../utils/format'

/**
 * A single deal on the kanban board.
 *
 * The value is editable in place while the deal is in Proposal or Negotiation
 * — that is where the number actually changes — and locks once it is Won or
 * Lost.
 *
 * Two ways to move a card, so it works with a mouse and without:
 *   · drag it to another column
 *   · the ‹ › buttons at the bottom of the card
 */
export default function DealCard({
  deal,
  activityCount = 0,
  onOpen,
  onValueChange,
  onDragStart,
  onDragEnd,
  onMovePrev,
  onMoveNext,
  canMovePrev,
  canMoveNext,
  dragging,
}) {
  const valueEditable = VALUE_EDITABLE_STAGES.includes(deal.stage)
  const pastDue = valueEditable && isOverdue(deal.closeDate)

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', deal.id)
        onDragStart(deal)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(deal)}
      onKeyDown={(event) => {
        // Ignore keys typed into the inline value editor or the move buttons.
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter') {
          event.preventDefault()
          onOpen(deal)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${deal.name}, ${deal.stage}`}
      className={cn(
        'group cursor-pointer rounded-lg border border-slate-200 bg-white p-3.5 shadow-card transition-all',
        'hover:border-slate-300 hover:shadow-pop',
        dragging && 'opacity-40'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-300 transition-colors group-hover:text-slate-400" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-slate-900">{deal.contact}</h4>
          <span className="mt-1.5 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            {deal.product}
          </span>
        </div>
      </div>

      {/* Editable while the deal is open, locked once it is closed */}
      <div className="mt-2.5">
        <EditableValue
          value={deal.value}
          editable={valueEditable}
          onSave={(next) => onValueChange(deal, next)}
          lockedHint={`Locked — this deal is ${deal.stage}`}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs',
            pastDue ? 'font-medium text-red-600' : 'text-slate-500'
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Close: {formatShortDate(deal.closeDate)}
        </span>
        {pastDue && (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-200">
            Overdue
          </span>
        )}
        <span className="flex items-center gap-2">
          {/* How much has been logged with this contact — open the card to read it. */}
          <Tooltip
            label={
              activityCount === 0
                ? 'Nothing logged yet'
                : `${activityCount} logged ${activityCount === 1 ? 'activity' : 'activities'}`
            }
            side="top"
          >
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1 text-xs',
                activityCount > 0 ? 'text-slate-500' : 'text-slate-300'
              )}
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              {activityCount}
            </span>
          </Tooltip>
          <Tooltip label={deal.owner} side="left">
            <Avatar name={deal.owner} size="xs" />
          </Tooltip>
        </span>
      </div>

      {/* Move controls — keyboard accessible alternative to dragging */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 opacity-50 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          disabled={!canMovePrev}
          onClick={(event) => {
            event.stopPropagation()
            onMovePrev(deal)
          }}
          aria-label={`Move ${deal.name} to the previous stage`}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Move stage
        </span>
        <button
          type="button"
          disabled={!canMoveNext}
          onClick={(event) => {
            event.stopPropagation()
            onMoveNext(deal)
          }}
          aria-label={`Move ${deal.name} to the next stage`}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}
