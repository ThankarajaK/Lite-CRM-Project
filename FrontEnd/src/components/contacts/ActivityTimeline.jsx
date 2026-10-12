import { useState } from 'react'

import { api } from '../../lib/api'

import ActivityCorrectionModal from './ActivityCorrectionModal'

import {
  Briefcase,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  StickyNote,
  Users,
} from 'lucide-react'

import EmptyState from '../ui/EmptyState'

import Button from '../ui/Button'

import Modal from '../ui/Modal'

import { formatDate, formatRelativeTime } from '../../utils/format'

/**
 * The ACTIVITY log — what a rep actually did.
 *
 * Only the five activity types appear here. System events (moved, deal
 * created, value changed) live in the History tab instead.
 */
const TYPE_STYLES = {
  Call: {
    icon: Phone,
    className: 'bg-brand-50 text-brand-600 ring-brand-100',
  },
  Email: {
    icon: Mail,
    className: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  },
  Meeting: {
    icon: Users,
    className: 'bg-violet-50 text-violet-600 ring-violet-100',
  },
  Note: {
    icon: StickyNote,
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
  'Follow-up': {
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
}

function dayKey(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'unknown'

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatActivityWhen(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return `${formatDate(date)} · ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export default function ActivityTimeline({
  items = [],
  action,
  hasMore = false,
  onLoadMore,
  recordId,
  onActivityChanged,
}) {
  const [loadingMore, setLoadingMore] = useState(false)
  const [correction, setCorrection] = useState(null)
  const [originalActivity, setOriginalActivity] = useState(null)
  const [savingCorrection, setSavingCorrection] = useState(false)

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={StickyNote}
        title="Nothing logged yet"
        message="Calls, emails, meetings, notes and follow-ups you log will appear here."
        action={action}
      />
    )
  }

  const sortedItems = [...items].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  )

  const groups = sortedItems.reduce((result, item) => {
    const key = dayKey(item.timestamp)
    const existing = result.find((group) => group.key === key)

    if (existing) {
      existing.items.push(item)
    } else {
      result.push({
        key,
        label: formatDate(item.timestamp),
        items: [item],
      })
    }

    return result
  }, [])

  async function handleLoadMore() {
    if (!onLoadMore || loadingMore) return

    setLoadingMore(true)

    try {
      await onLoadMore()
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </span>

            <span className="h-px flex-1 bg-slate-100" />
          </div>

          <ol className="relative space-y-5 pl-2">
            {group.items.map((item, index) => {
              const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.Note
              const Icon = style.icon
              const isLast = index === group.items.length - 1

              return (
                <li
                  key={item.id}
                  className="relative flex gap-3"
                >
                  {!isLast ? (
                    <span className="absolute left-[15px] top-8 h-[calc(100%+4px)] w-px bg-slate-200" />
                  ) : null}

                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${style.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p
                        className={`text-sm font-medium ${
                          item.voided
                            ? 'text-slate-500 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </p>

                      <span
                        className="text-xs text-slate-400"
                        title={formatActivityWhen(item.timestamp)}
                      >
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    {item.detail ? (
                      <p
                        className={`mt-0.5 whitespace-pre-line text-sm ${
                          item.voided
                            ? 'text-slate-400 line-through'
                            : 'text-slate-600'
                        }`}
                      >
                        {item.detail}
                      </p>
                    ) : null}

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>
                        {item.type} · {item.actor || 'Unknown user'}
                      </span>

                      {item.deal ? (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                          <Briefcase className="h-3 w-3" />
                          {item.deal}
                        </span>
                      ) : null}

                      {item.edited ? (
                        <span>
                          · Edited{' '}
                          {item.editedAt
                            ? formatRelativeTime(item.editedAt)
                            : ''}
                        </span>
                      ) : null}
                    </div>

                    {item.voided ? (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                        <span className="font-semibold">Voided:</span>{' '}
                        {item.voidReason || 'No reason provided'}

                        {item.voidedAt
                          ? ` · ${formatRelativeTime(item.voidedAt)}`
                          : ''}
                      </div>
                    ) : null}

                    {(
                      item.originalSubject != null ||
                      item.originalDescription != null
                    ) ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOriginalActivity(item)}
                        >
                          View original
                        </Button>

                        {!item.voided && item.canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCorrection({
                                mode: 'edit',
                                item,
                              })
                            }
                          >
                            Edit
                          </Button>
                        ) : null}

                        {!item.voided && item.canVoid ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCorrection({
                                mode: 'void',
                                item,
                              })
                            }
                          >
                            Void
                          </Button>
                        ) : null}
                      </div>
                    ) : !item.voided &&
                      (item.canEdit || item.canVoid) ? (
                      <div className="mt-2 flex gap-2">
                        {item.canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCorrection({
                                mode: 'edit',
                                item,
                              })
                            }
                          >
                            Edit
                          </Button>
                        ) : null}

                        {item.canVoid ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCorrection({
                                mode: 'void',
                                item,
                              })
                            }
                          >
                            Void
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}

      {hasMore && onLoadMore ? (
        <div className="flex justify-center border-t border-slate-100 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            icon={loadingMore ? Loader2 : undefined}
            className={loadingMore ? '[&>svg]:animate-spin' : ''}
          >
            {loadingMore
              ? 'Loading…'
              : 'Load more activities'}
          </Button>
        </div>
      ) : null}

      <Modal
        open={Boolean(originalActivity)}
        onClose={() => setOriginalActivity(null)}
        title="Original Activity"
        description="Read-only copy of the text retained when this activity was first corrected."
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Original subject
            </p>

            <p className="mt-1 text-sm font-medium text-slate-900">
              {originalActivity?.originalSubject || '—'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Original description
            </p>

            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
              {originalActivity?.originalDescription || '—'}
            </p>
          </div>
        </div>
      </Modal>

      <ActivityCorrectionModal
        open={Boolean(correction)}
        mode={correction?.mode}
        activity={correction?.item}
        onClose={() => {
          if (!savingCorrection) {
            setCorrection(null)
          }
        }}
        onSubmit={async (values) => {
          if (!recordId || !correction?.item) return

          setSavingCorrection(true)

          try {
            const url =
              correction.mode === 'edit'
                ? `/records/${recordId}/activities/${correction.item.id}/edit/`
                : `/records/${recordId}/activities/${correction.item.id}/void/`

            const body =
              correction.mode === 'edit'
                ? {
                    subject: values.subject,
                    description: values.description,
                  }
                : {
                    reason: values.reason,
                  }

            await api(url, {
              method:
                correction.mode === 'edit'
                  ? 'PATCH'
                  : 'POST',
              body: JSON.stringify(body),
            })

            setCorrection(null)

            if (onActivityChanged) {
              await onActivityChanged()
            }
          } finally {
            setSavingCorrection(false)
          }
        }}
      />
    </div>
  )
}