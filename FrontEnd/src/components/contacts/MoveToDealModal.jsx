import { useEffect, useMemo } from 'react'
import { ArrowRight, Briefcase } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import { Field, Input, Select } from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'
import { useData } from '../../context/DataContext'
import { ENTRY_STAGE } from '../../data/mockData'
import { formatCurrency } from '../../utils/format'

function defaultCloseDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

function validate(values) {
  return {
    product: validators.required(values.product, 'Product'),
    value:
      validators.required(values.value, 'Deal value') ??
      validators.positiveNumber(values.value, 'Deal value'),
  }
}

/**
 * STEP 2 — move a contact to Deals.
 *
 * Deliberately short. A contact already has everything except the two things
 * that make a deal: **what they want** and **what it is worth**. Those are the
 * only required fields; the close date and owner are pre-filled.
 *
 * Saving creates the deal at Proposal.
 */
export default function MoveToDealModal({ open, onClose, onConfirm, contact }) {
  const { products, users } = useData()

  // Only active products from the Admin-managed catalogue may be selected
  // when creating a Deal. Do not use the old hard-coded mock product list.
  const activeProducts = useMemo(
    () =>
      (products ?? []).filter(
        (item) => item && item.active !== false
      ),
    [products]
  )

  // Deal owners must be active Salespersons or Sales Managers. Admin users
  // and inactive users are intentionally excluded from this assignment list.
  const ownerUsers = useMemo(
    () =>
      (users ?? []).filter((item) => {
        if (!item) return false

        const isActive =
          item.is_active === true ||
          (item.is_active == null && item.active === true)

        if (!isActive) return false

        const roleKey = String(item.role ?? '')
          .trim()
          .toLowerCase()
        const roleName = String(item.role_name ?? '')
          .trim()
          .toLowerCase()

        return (
          roleKey === 'salesperson' ||
          roleName === 'salesperson' ||
          roleKey === 'sales_manager' ||
          roleName === 'sales manager'
        )
      }),
    [users]
  )

  const productOptions = useMemo(
    () =>
      activeProducts.map((item) => ({
        value: item.name,
        label: item.name,
      })),
    [activeProducts]
  )

  const ownerOptions = useMemo(
    () =>
      ownerUsers.map((item) => {
        const name =
          item.display_name ??
          item.displayName ??
          item.name ??
          item.username ??
          item.email ??
          'User'

        return {
          value: name,
          label: name,
        }
      }),
    [ownerUsers]
  )

  const initialValues = useMemo(
    () => ({
      product: activeProducts[0]?.name ?? '',
      value: '',
      closeDate: defaultCloseDate(),
      owner:
        ownerOptions.some(
          (item) => item.value === contact?.owner
        )
          ? contact?.owner
          : ownerOptions[0]?.value ?? '',
      notes: '',
    }),
    [activeProducts, contact, ownerOptions]
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

  if (!contact) return null

  const preview = Number(form.values.value) || 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move to Deals"
      description="Set the product and the value — that is all a deal needs."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Briefcase} onClick={handleSubmit}>
            Create Deal
          </Button>
        </>
      }
    >
      {/* What is about to happen */}
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50/60 p-3.5">
        <Avatar name={contact.company} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{contact.company}</p>
          <p className="truncate text-xs text-slate-600">{contact.name}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
          {ENTRY_STAGE}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Product"
          htmlFor="product"
          required
          error={form.field('product').error}
          hint="What they are interested in."
        >
          <Select
            {...form.field('product')}
            options={productOptions}
            placeholder={
              productOptions.length
                ? undefined
                : 'No active products available'
            }
          />
        </Field>

        <Field
          label="Deal Value (INR ₹)"
          htmlFor="value"
          required
          error={form.field('value').error}
          hint={
            preview > 0
              ? `${formatCurrency(preview)} — you can still change this in Proposal and Negotiation.`
              : 'Numbers only, e.g. 8500. You can change it later.'
          }
        >
          <Input {...form.field('value')} type="number" min="0" step="100" placeholder="8500" />
        </Field>

        {/* Everything below is pre-filled — shown, but rarely touched */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Expected close" htmlFor="closeDate">
            <Input {...form.field('closeDate')} type="date" />
          </Field>
          <Field label="Owner" htmlFor="owner">
            <Select
              {...form.field('owner')}
              options={ownerOptions}
              placeholder={
                ownerOptions.length
                  ? undefined
                  : 'No active Sales users available'
              }
            />
          </Field>
        </div>

        <p className="text-xs text-slate-500">
          The deal will be named{' '}
          <span className="font-medium text-slate-700">
            {form.values.product} — {contact.company}
          </span>
          .
        </p>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
