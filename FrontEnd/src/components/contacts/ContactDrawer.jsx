import { useState } from 'react'
import {
  Briefcase,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  Sparkles,
  UserCircle2,
} from 'lucide-react'
import Drawer from '../ui/Drawer'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import Tabs from '../ui/Tabs'
import StatusBadge from '../ui/StatusBadge'
import EmptyState from '../ui/EmptyState'
import ActivityTimeline from './ActivityTimeline'
import HistoryTimeline from './HistoryTimeline'
import { formatCurrency, formatDate } from '../../utils/format'

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
 * Contact detail panel: Overview, their deals, and the activity timeline.
 * The two actions a rep needs are in the footer — log an activity, or move
 * the contact to Deals.
 */
export default function ContactDrawer({
  contact,
  deals = [],
  activity = [],
  history = [],
  open,
  onClose,
  onEdit,
  onMoveToDeal,
  onOpenDeal,
  onLogActivity,
  activityHasMore = false,
  onLoadMoreActivity,
  onActivityChanged,
}) {
  const [tab, setTab] = useState('overview')

  if (!contact) return null

  const totalValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
  const wonValue = deals
    .filter((deal) => deal.stage === 'Won')
    .reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
  const hasDeals = deals.length > 0
  const displayName = contact.name || contact.company || 'Contact'
  const companyLabel = contact.company || 'No company'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={displayName}
      header={
        <div className="flex items-center gap-3">
          <Avatar name={displayName} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">{displayName}</h2>
            <p className="truncate text-sm text-slate-500">
              {contact.company ? `${contact.company}${contact.industry ? ` · ${contact.industry}` : ''}` : (contact.industry || 'Contact')}
            </p>
          </div>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" icon={Pencil} onClick={() => onEdit(contact)}>
            Edit
          </Button>
          <Button variant="secondary" icon={NotebookPen} onClick={() => onLogActivity(contact)}>
            Log Activity
          </Button>
          <Button icon={Briefcase} onClick={() => onMoveToDeal(contact)}>
            {hasDeals ? 'New Deal' : 'Move to Deals'}
          </Button>
        </>
      }
    >
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-200">
        <div className="bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Deals</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{deals.length}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Total value</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">
            {formatCurrency(totalValue, { compact: true })}
          </p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Won</p>
          <p className="mt-0.5 text-lg font-semibold text-emerald-600">
            {formatCurrency(wonValue, { compact: true })}
          </p>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'deals', label: 'Deals', count: deals.length },
          { id: 'activity', label: 'Activity', count: activity.length },
          { id: 'history', label: 'History', count: history.length },
        ]}
      />

      <div className="px-5 py-4">
        {tab === 'overview' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={contact.status} />
              <StatusBadge status={hasDeals ? 'In pipeline' : 'No deal yet'} />
              <span className="text-xs text-slate-500">
                Contact since {formatDate(contact.movedAt)}
              </span>
            </div>

            {/* Next step in the process */}
            {!hasDeals ? (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Next step: move to Deals</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Pick the product they want and what it is worth, and the deal is created at
                    Proposal.
                  </p>
                </div>
              </div>
            ) : null}

            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contact information
              </h3>
              <div className="divide-y divide-slate-100">
                <DetailRow icon={UserCircle2} label="Name">
                  {contact.name}
                </DetailRow>
                <DetailRow icon={Building2} label="Company">
                  {companyLabel}{contact.industry ? ` · ${contact.industry}` : ''}
                </DetailRow>
                <DetailRow icon={Mail} label="Email">
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-brand-600 transition-colors hover:text-brand-700"
                  >
                    {contact.email}
                  </a>
                </DetailRow>
                <DetailRow icon={Phone} label="Phone">
                  {contact.phone || '—'}
                </DetailRow>
                <DetailRow icon={MapPin} label="Town / City">
                  {contact.townCity || contact.town_city || contact.location || '—'}
                </DetailRow>
                <DetailRow icon={Sparkles} label="Course interested">
                  {contact.productName || contact.courseInterestedName || contact.course_interested_name || '—'}
                </DetailRow>
                <DetailRow icon={Sparkles} label="Preferred learning mode">
                  {contact.learningModeName || contact.preferredLearningModeName || contact.preferred_learning_mode_name || '—'}
                </DetailRow>
                <DetailRow icon={Sparkles} label="Preferred course duration">
                  {contact.courseDurationName || contact.preferredCourseDurationName || contact.preferred_course_duration_name || '—'}
                </DetailRow>
                <DetailRow icon={UserCircle2} label="Owner">
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={contact.owner} size="xs" />
                    {contact.owner}
                  </span>
                </DetailRow>
                <DetailRow icon={Sparkles} label="Original lead source">
                  {contact.source ?? '—'}
                </DetailRow>
                <DetailRow icon={CalendarClock} label="Last contact">
                  {formatDate(contact.lastContact ?? contact.last_contact_at)}
                </DetailRow>
                <DetailRow icon={NotebookPen} label="Lead feedback / notes">
                  {contact.notes || '—'}
                </DetailRow>
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'deals' ? (
          deals.length === 0 ? (
            <EmptyState
              compact
              icon={Briefcase}
              title="No deals yet"
              message="Move this contact to Deals to create their first one."
              action={
                <Button icon={Briefcase} onClick={() => onMoveToDeal(contact)}>
                  Move to Deals
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {deals.map((deal) => (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDeal?.(deal)}
                    className="w-full rounded-lg border border-slate-200 p-3.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    aria-label={`Open deal ${deal.name || deal.product || deal.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-brand-700">{deal.name || deal.product || `Deal ${deal.id}`}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {deal.product || '—'} · Expected close {formatDate(deal.closeDate ?? deal.expected_close_date)} · {deal.owner || '—'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(deal.value)}
                        </p>
                        <StatusBadge status={deal.stage} dot={false} className="mt-1" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              icon={NotebookPen}
              onClick={() => onLogActivity(contact)}
              className="w-full justify-center"
            >
              Log a call, email, meeting or note
            </Button>
            <ActivityTimeline
              items={activity}
              recordId={contact?.recordId}
              hasMore={activityHasMore}
              onLoadMore={onLoadMoreActivity}
              onActivityChanged={onActivityChanged}
              action={
                <Button icon={NotebookPen} onClick={() => onLogActivity(contact)}>
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
