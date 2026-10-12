import { useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input, Textarea } from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'

export default function ActivityCorrectionModal({
  open,
  mode = 'edit',
  activity,
  onClose,
  onSubmit,
}) {
  const isVoid = mode === 'void'
  const initialValues = useMemo(() => ({
    subject: activity?.title || '',
    description: activity?.detail || '',
    reason: '',
  }), [activity])

  const form = useForm(
    initialValues,
    (values) => ({
      ...(isVoid
        ? { reason: validators.required(values.reason, 'Reason') }
        : { subject: validators.required(values.subject, 'Subject') }),
    }),
  )

  useEffect(() => {
    if (open) form.reset(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!activity) return null

  const handleSubmit = form.submit((values) => {
    onSubmit(values)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isVoid ? 'Void Activity' : 'Correct Activity'}
      description={isVoid
        ? 'The activity will remain in the timeline and be shown as voided.'
        : 'Correct the activity text. The original text will be retained for Admin review.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isVoid ? 'Void Activity' : 'Save Correction'}</Button>
        </>
      }
    >
      {isVoid ? (
        <Field label="Reason" error={form.errors.reason}>
          <Textarea
            value={form.values.reason}
            onChange={(event) => form.setValue('reason', event.target.value)}
            placeholder="Why is this activity being voided?"
            rows={4}
          />
        </Field>
      ) : (
        <div className="space-y-4">
          <Field label="Subject" error={form.errors.subject}>
            <Input
              value={form.values.subject}
              onChange={(event) => form.setValue('subject', event.target.value)}
              placeholder="Activity subject"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.values.description}
              onChange={(event) => form.setValue('description', event.target.value)}
              placeholder="Description"
              rows={5}
            />
          </Field>
          {activity.originalSubject != null ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Original text (Admin)</p>
              <p className="mt-1"><span className="font-medium">Subject:</span> {activity.originalSubject}</p>
              <p className="mt-1 whitespace-pre-line"><span className="font-medium">Description:</span> {activity.originalDescription || '—'}</p>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
