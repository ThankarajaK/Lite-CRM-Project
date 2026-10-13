import { useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'
import { useData } from '../../context/DataContext'
import { DEAL_STAGES, PRODUCTS, VALUE_EDITABLE_STAGES } from '../../data/mockData'

function validate(values) {
  return {
    product: validators.required(values.product, 'Product'),
    value: validators.required(values.value, 'Value') ?? validators.positiveNumber(values.value, 'Value'),
    closeDate: !values.closeDate
      ? 'Expected close date is required.'
      : values.closeDate < (() => {
          const today = new Date()
          const year = today.getFullYear()
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const day = String(today.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        })()
        ? 'Expected close date cannot be in the past.'
        : undefined,
  }
}

/**
 * Edit an existing deal.
 *
 * New deals are never created here — they are created by moving a contact to
 * Deals, which is the only way onto the board. The value field is disabled
 * once the deal is Won or Lost, matching the inline editor on the card.
 */
export default function DealFormModal({ open, onClose, onSubmit, deal }) {
  const { users } = useData()
  const initialValues = useMemo(
    () => ({
      product: deal?.product ?? PRODUCTS[0],
      value: String(deal?.value ?? ''),
      closeDate: deal?.closeDate ?? '',
      stage: deal?.stage ?? DEAL_STAGES[0],
      owner: deal?.owner ?? users[0]?.display_name ?? '',
      notes: deal?.notes ?? '',
    }),
    [deal]
  )

  const form = useForm(initialValues, validate)

  useEffect(() => {
    if (open) form.reset(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  const handleSubmit = form.submit((values) => {
    onSubmit({ ...values, value: Number(values.value) || 0 })
    onClose()
  })

  if (!deal) return null

  const valueEditable = VALUE_EDITABLE_STAGES.includes(form.values.stage)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Deal"
      description={`${deal.contact} · created at ${DEAL_STAGES[0]}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product" htmlFor="product" required error={form.field('product').error}>
          <Select {...form.field('product')} options={PRODUCTS} />
        </Field>

        <Field
          label="Value (INR ₹)"
          htmlFor="value"
          required
          error={form.field('value').error}
          hint={
            valueEditable
              ? 'Changeable while the deal is in Proposal or Negotiation.'
              : `Locked — this deal is ${form.values.stage}.`
          }
        >
          <Input
            {...form.field('value')}
            type="number"
            min="0"
            step="100"
            disabled={!valueEditable}
          />
        </Field>

        <Field
          label="Expected Close Date"
          htmlFor="closeDate"
          required
          error={form.field('closeDate').error}
        >
          <Input {...form.field('closeDate')} type="date" min={(() => {
            const today = new Date()
            const year = today.getFullYear()
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const day = String(today.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          })()} />
        </Field>

        <Field label="Stage" htmlFor="stage">
          <Select {...form.field('stage')} options={DEAL_STAGES} />
        </Field>

        <Field label="Owner" htmlFor="owner" className="sm:col-span-2">
          <Select {...form.field('owner')} options={users.map((item) => item.display_name)} />
        </Field>

        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea {...form.field('notes')} rows={3} placeholder="Where does this deal stand?" />
        </Field>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
