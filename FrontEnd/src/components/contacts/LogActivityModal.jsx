import { useEffect, useMemo } from 'react'
import { CheckCircle2, Mail, NotebookPen, Phone, Users } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import { Field, Input, Select, Textarea } from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'
import { ACTIVITY_TYPES } from '../../data/mockData'
import { useData } from '../../context/DataContext'
import { cn } from '../../utils/format'

const TYPE_ICONS = {
  Call: Phone,
  Email: Mail,
  Meeting: Users,
  Note: NotebookPen,
  'Follow-up': CheckCircle2,
}

/** A sensible default subject per type, so the field is rarely empty. */
const TYPE_PLACEHOLDERS = {
  Call: 'Discovery call',
  Email: 'Sent pricing summary',
  Meeting: 'Product demo',
  Note: 'Account note',
  'Follow-up': 'Checked in on the proposal',
}

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function nowForInput() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function validate(values) {
  return {
    title: validators.required(values.title, 'Subject'),
    timestamp: validators.required(values.timestamp, 'Date and time'),
  }
}

/**
 * Log a call, email, meeting, note or follow-up.
 *
 * `record` is a **lead or a contact** — both carry a `recordId`, so this one
 * dialog works at any stage, and what is logged here stays with the record
 * when a lead becomes a contact.
 *
 * This writes to the Activity log only. System events (moved, deal created,
 * value changed) are recorded automatically and live in the History tab.
 */
export default function LogActivityModal({
  open,
  onClose,
  onConfirm,
  record,
  deals = [],
  defaultDeal = '',
  lockedDeal = false,
}) {
  const { user } = useData()
  const initialValues = useMemo(
    () => ({
      type: 'Call',
      title: '',
      detail: '',
      timestamp: nowForInput(),
      actor: user?.name || '',
      deal: defaultDeal,
    }),
    [defaultDeal, user?.name]
  )

  const form = useForm(initialValues, validate)

  useEffect(() => {
    if (open) form.reset(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  const handleSubmit = form.submit((values) => {
    onConfirm(values)
    onClose()
  })

  if (!record) return null

  // A lead has a status; a contact has a movedAt. Used only for the footnote.
  const isLead = Boolean(record.status === 'Qualified' || record.status === 'Not Qualified')
  const recordDisplayName = record.name || record.company || 'Contact'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Activity"
      description={`Record what happened with ${recordDisplayName}.`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Log Activity</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type picker — one tap, rather than a dropdown */}
        <fieldset>
          <legend className="field-label">Type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ACTIVITY_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type]
              const selected = form.values.type === type
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => form.setValue('type', type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                    selected
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {type}
                </button>
              )
            })}
          </div>
        </fieldset>

        <Field label="Subject" htmlFor="title" required error={form.field('title').error}>
          <Input
            {...form.field('title')}
            placeholder={TYPE_PLACEHOLDERS[form.values.type]}
            autoComplete="off"
          />
        </Field>

        <Field
          label="What happened"
          htmlFor="detail"
          hint="One or two lines is plenty — enough for the next person to pick it up."
        >
          <Textarea
            {...form.field('detail')}
            rows={3}
            placeholder="Agreed to send a revised quote by Friday."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="When"
            htmlFor="timestamp"
            required
            error={form.field('timestamp').error}
            hint="Defaults to now; change it to log something earlier."
          >
            <Input {...form.field('timestamp')} type="datetime-local" />
          </Field>

          <Field
            label="Logged by"
            htmlFor="actor"
            hint="This is the currently signed-in user and cannot be changed."
          >
            <Input
              id="actor"
              value={form.values.actor || 'Current user'}
              readOnly
              aria-readonly="true"
              className="bg-slate-50 text-slate-600"
            />
          </Field>
        </div>

        {deals.length > 0 ? (
          <Field
            label="Related deal"
            htmlFor="deal"
            hint="Optional — links this conversation to the opportunity it was about."
          >
            {lockedDeal ? (
              <Input
                id="deal"
                value={form.values.deal || 'Selected deal'}
                readOnly
                aria-readonly="true"
                className="bg-slate-50 text-slate-600"
              />
            ) : (
              <Select {...form.field('deal')}>
                <option value="">No specific deal</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.name}>
                    {deal.name} · {deal.stage}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}

        {/* Who this is being logged against */}
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3">
          <Avatar name={recordDisplayName} size="sm" />
          <p className="min-w-0 text-sm text-slate-600">
            Logging against{' '}
            <span className="font-medium text-slate-900">{recordDisplayName}</span>
            {isLead
              ? ' — this stays with the record when the lead moves to Contacts.'
              : ' — this also updates their last contact date.'}
          </p>
        </div>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
