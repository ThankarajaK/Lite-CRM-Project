import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  Clock3,
  GraduationCap,
  Mail,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  Trash2,
  UserCircle2,
} from 'lucide-react'
import Drawer from '../ui/Drawer'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import Tabs from '../ui/Tabs'
import StatusBadge from '../ui/StatusBadge'
import Badge from '../ui/Badge'
import ActivityTimeline from '../contacts/ActivityTimeline'
import HistoryTimeline from '../contacts/HistoryTimeline'
import { formatDate } from '../../utils/format'

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <div className="mt-0.5 break-words text-sm text-slate-900">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Lead detail panel.
 *
 * Lead-specific fields:
 * - Course Interested
 * - Preferred Learning Mode
 * - Preferred Course Duration
 * - Town / City
 * - Lead Feedback
 *
 * The internal API/database field `notes` is intentionally preserved
 * for backward compatibility. The Lead UI exposes it as "Lead Feedback".
 */
export default function LeadDrawer({
  lead,
  activity = [],
  history = [],
  open,
  onClose,
  onEdit,
  onDelete,
  onMoveToContact,
  onLogActivity,
  canReassign,
  onReassign,
  users = [],
}) {
  const [tab, setTab] = useState('details')

  const [ownerId, setOwnerId] = useState(
    String(lead?.ownerId || ''),
  )

  useEffect(() => {
    setOwnerId(
      String(lead?.ownerId || ''),
    )
  }, [lead?.id, lead?.ownerId])

  if (!lead) return null

  const isQualified =
    lead.status === 'Qualified'

  const productName =
    lead.productName ??
    lead.product_name ??
    lead.product?.name ??
    lead.product ??
    '—'

  const learningModeName =
    lead.learningModeName ??
    lead.learning_mode_name ??
    lead.learning_mode?.name ??
    lead.learningMode ??
    '—'

  const courseDurationName =
    lead.courseDurationName ??
    lead.course_duration_name ??
    lead.course_duration?.name ??
    lead.courseDuration ??
    '—'

  const townCity =
    lead.townCity ??
    lead.town_city ??
    ''

  const leadFeedback =
    lead.notes ??
    lead.feedback ??
    lead.leadFeedback ??
    ''

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={lead.name}
      header={
        <div className="flex items-center gap-3">
          <Avatar
            name={lead.name}
            size="lg"
          />

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {lead.name}
            </h2>

            <p className="truncate text-sm text-slate-500">
              {lead.company}
            </p>
          </div>
        </div>
      }
      footer={
        <>
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={() =>
              onDelete(lead)
            }
          >
            Delete
          </Button>

          <Button
            variant="secondary"
            icon={NotebookPen}
            onClick={() =>
              onLogActivity(lead)
            }
          >
            Log Activity
          </Button>

          <Button
            iconRight={ArrowRight}
            disabled={!isQualified}
            onClick={() =>
              onMoveToContact(lead)
            }
          >
            Move to Contacts
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        tabs={[
          {
            id: 'details',
            label: 'Details',
          },
          {
            id: 'activity',
            label: 'Activity',
            count: activity.length,
          },
          {
            id: 'history',
            label: 'History',
            count: history.length,
          },
        ]}
      />

      <div className="px-5 py-4">
        {tab === 'details' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={lead.status}
              />

              <Badge tone="gray">
                {lead.source}
              </Badge>
            </div>

            <div
              className={
                isQualified
                  ? 'rounded-lg border border-brand-100 bg-brand-50/60 p-3.5'
                  : 'rounded-lg border border-slate-200 bg-slate-50 p-3.5'
              }
            >
              <p className="text-sm font-medium text-slate-900">
                {isQualified
                  ? 'Ready to move'
                  : 'Not qualified yet'}
              </p>

              <p className="mt-0.5 text-sm text-slate-600">
                {isQualified
                  ? 'One click moves this lead to Contacts. Everything logged against it comes along.'
                  : 'Only qualified leads can move on. Edit the lead and set its status to Qualified.'}
              </p>
            </div>

            {/* ----------------------------------------------------------------
                Contact / Lead information
            ----------------------------------------------------------------- */}
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contact
              </h3>

              <div className="divide-y divide-slate-100">
                <DetailRow
                  icon={Mail}
                  label="Email"
                >
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-brand-600 transition-colors hover:text-brand-700"
                  >
                    {lead.email}
                  </a>
                </DetailRow>

                <DetailRow
                  icon={Phone}
                  label="Phone"
                >
                  {lead.phone || '—'}
                </DetailRow>

                <DetailRow
                  icon={Building2}
                  label="Company"
                >
                  {lead.company || '—'}
                </DetailRow>

                <DetailRow
                  icon={MapPin}
                  label="Town / City"
                >
                  {townCity || '—'}
                </DetailRow>

                <DetailRow
                  icon={UserCircle2}
                  label="Owner"
                >
                  <span className="inline-flex items-center gap-2">
                    <Avatar
                      name={lead.owner}
                      size="xs"
                    />

                    {lead.owner || '—'}
                  </span>
                </DetailRow>

                <DetailRow
                  icon={Calendar}
                  label="Captured"
                >
                  {formatDate(
                    lead.createdAt,
                  )}
                </DetailRow>
              </div>
            </section>

            {/* ----------------------------------------------------------------
                Course / learning preferences
            ----------------------------------------------------------------- */}
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Course Preferences
              </h3>

              <div className="divide-y divide-slate-100">
                <DetailRow
                  icon={BookOpen}
                  label="Course Interested"
                >
                  {productName}
                </DetailRow>

                <DetailRow
                  icon={GraduationCap}
                  label="Preferred Learning Mode"
                >
                  {learningModeName}
                </DetailRow>

                <DetailRow
                  icon={Clock3}
                  label="Preferred Course Duration"
                >
                  {courseDurationName}
                </DetailRow>
              </div>
            </section>

            {/* ----------------------------------------------------------------
                Reassignment
            ----------------------------------------------------------------- */}
            {canReassign ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reassign lead
                </h3>

                <div className="flex gap-2">
                  <select
                    value={
                      ownerId ||
                      lead.ownerId ||
                      ''
                    }
                    onChange={(event) =>
                      setOwnerId(
                        event.target.value,
                      )
                    }
                    className="field-input flex-1"
                  >
                    {users.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.display_name}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      onReassign(
                        lead,
                        ownerId,
                      )
                    }
                  >
                    Save owner
                  </Button>
                </div>
              </section>
            ) : null}

            {/* ----------------------------------------------------------------
                Lead Feedback
            ----------------------------------------------------------------- */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Lead Feedback
              </h3>

              <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                {leadFeedback ||
                  'No lead feedback yet.'}
              </p>
            </section>

            {/* ----------------------------------------------------------------
                Disqualification reason
            ----------------------------------------------------------------- */}
            {lead.status ===
              'Not Qualified' &&
            lead.disqualification_reason ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Disqualification Reason
                </h3>

                <Badge tone="gray">
                  {
                    lead.disqualification_reason
                  }
                </Badge>
              </section>
            ) : null}

            <div className="flex justify-end">
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() =>
                  onEdit(lead)
                }
              >
                Edit lead
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              icon={NotebookPen}
              onClick={() =>
                onLogActivity(lead)
              }
              className="w-full justify-center"
            >
              Log a call, email, meeting or note
            </Button>

            <ActivityTimeline
              items={activity}
              action={
                <Button
                  icon={NotebookPen}
                  onClick={() =>
                    onLogActivity(lead)
                  }
                >
                  Log Activity
                </Button>
              }
            />
          </div>
        ) : null}

        {tab === 'history' ? (
          <HistoryTimeline
            items={history}
          />
        ) : null}
      </div>
    </Drawer>
  )
}