import { useState } from 'react'
import {
  Building2,
  CalendarDays,
  Lock,
  NotebookPen,
  Package,
  Pencil,
  UserCircle2,
} from 'lucide-react'
import Drawer from '../ui/Drawer'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import Tabs from '../ui/Tabs'
import StatusBadge from '../ui/StatusBadge'
import EditableValue from '../ui/EditableValue'
import ActivityTimeline from '../contacts/ActivityTimeline'
import HistoryTimeline from '../contacts/HistoryTimeline'
import { DEAL_STAGES, VALUE_EDITABLE_STAGES } from '../../data/mockData'
import { cn, formatDate } from '../../utils/format'

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="mt-0.5 break-words text-sm text-slate-900">{children}</div>
      </div>
    </div>
  )
}

/**
 * Deal detail panel.
 *
 * It shows the same Activity and History as the contact does, because a deal
 * belongs to a contact and they share a `recordId`. Both tabs are readable at
 * **every stage**, Won and Lost included — only the deal *value* ever locks.
 *
 * The Activity tab can be narrowed to the entries tagged with this deal, or
 * left on everything logged with the contact.
 */
export default function DealDrawer({
  deal,
  activity = [],
  history = [],
  open,
  onClose,
  onEdit,
  onMove,
  onValueChange,
  onLogActivity,
}) {
  const [tab, setTab] = useState('details')
  const [scope, setScope] = useState('all')

  if (!deal) return null

  const valueEditable = VALUE_EDITABLE_STAGES.includes(deal.stage)
  const forThisDeal = activity.filter((item) => item.deal === deal.name)
  const shownActivity = scope === 'deal' ? forThisDeal : activity

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={deal.name}
      header={
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900">{deal.contact}</h2>
          <p className="truncate text-sm text-slate-500">
            {deal.product} · {deal.stage}
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" icon={NotebookPen} onClick={() => onLogActivity(deal)}>
            Log Activity
          </Button>
          <Button icon={Pencil} onClick={() => onEdit(deal)}>
            Edit Deal
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'activity', label: 'Activity', count: activity.length },
          { id: 'history', label: 'History', count: history.length },
        ]}
      />

      <div className="px-5 py-4">
        {tab === 'details' ? (
          <div className="space-y-6">
            {/* Value — editable while the deal is open */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Deal value
              </p>
              <EditableValue
                value={deal.value}
                size="lg"
                editable={valueEditable}
                onSave={(next) => onValueChange(deal, next)}
                lockedHint={`Locked — this deal is ${deal.stage}`}
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                {valueEditable ? (
                  <>Editable while the deal is in Proposal or Negotiation.</>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Locked now the deal is {deal.stage}.
                  </>
                )}
              </p>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stage
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {DEAL_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => onMove(deal, stage)}
                    aria-pressed={stage === deal.stage}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      stage === deal.stage
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Details
              </h3>
              <div className="divide-y divide-slate-100">
                <DetailRow icon={Building2} label="Contact">
                  {deal.contact}
                </DetailRow>
                <DetailRow icon={Package} label="Product">
                  {deal.product}
                </DetailRow>
                <DetailRow icon={CalendarDays} label="Expected close">
                  {formatDate(deal.closeDate)}
                </DetailRow>
                <DetailRow icon={UserCircle2} label="Owner">
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={deal.owner} size="xs" />
                    {deal.owner}
                  </span>
                </DetailRow>
                <DetailRow icon={CalendarDays} label="Created">
                  {formatDate(deal.createdAt)} at {DEAL_STAGES[0]}
                </DetailRow>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Notes
              </h3>
              <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                {deal.notes || 'No notes yet.'}
              </p>
            </section>

            <div className="pt-1">
              <StatusBadge status={deal.stage} />
            </div>
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              icon={NotebookPen}
              onClick={() => onLogActivity(deal)}
              className="w-full justify-center"
            >
              Log a call, email, meeting or note
            </Button>

            {/* Narrow to this deal, or see everything logged with the contact */}
            <div
              role="group"
              aria-label="Activity scope"
              className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5"
            >
              {[
                { id: 'all', label: `All with ${deal.contact}`, count: activity.length },
                { id: 'deal', label: 'This deal only', count: forThisDeal.length },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setScope(option.id)}
                  aria-pressed={scope === option.id}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    scope === option.id
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span className="max-w-[14rem] truncate">{option.label}</span> · {option.count}
                </button>
              ))}
            </div>

            <ActivityTimeline
              items={shownActivity}
              action={
                <Button icon={NotebookPen} onClick={() => onLogActivity(deal)}>
                  Log Activity
                </Button>
              }
            />
          </div>
        ) : null}

        {tab === 'history' ? <HistoryTimeline items={history} /> : null}
      </div>
    </Drawer>
  )
}
