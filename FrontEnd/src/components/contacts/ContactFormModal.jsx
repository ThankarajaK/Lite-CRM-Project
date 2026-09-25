import { useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input, Select } from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'
import { useData } from '../../context/DataContext'
import { CONTACT_STATUSES, INDUSTRIES, LEAD_SOURCES } from '../../data/mockData'

const EMPTY_CONTACT = {
  name: '',
  company: '',
  email: '',
  phone: '',
  industry: 'Software',
  location: '',
  owner: '',
  source: 'Website',
  status: 'Active',
}

function validate(values) {
  return {
    name: validators.required(values.name, 'Name'),
    company: validators.required(values.company, 'Company'),
    email: validators.required(values.email, 'Email') ?? validators.email(values.email),
  }
}

/**
 * Add / Edit contact dialog.
 *
 * Most contacts arrive by moving a qualified lead across, which needs no form
 * at all. This exists for editing them afterwards — industry and location are
 * the two fields a lead never had.
 */
export default function ContactFormModal({ open, onClose, onSubmit, contact }) {
  const { users, user } = useData()
  const initialValues = useMemo(
    () => (contact ? { ...EMPTY_CONTACT, ...contact } : { ...EMPTY_CONTACT, owner: user?.name || '' }),
    [contact]
  )
  const form = useForm(initialValues, validate)
  const isEdit = Boolean(contact)

  useEffect(() => {
    if (open) form.reset(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  const handleSubmit = form.submit((values) => {
    onSubmit(values)
    onClose()
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Contact' : 'Add Contact'}
      description={
        isEdit
          ? 'Update this contact.'
          : 'Most contacts come from moving a qualified lead across — this adds one directly.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Save Contact'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required error={form.field('name').error}>
          <Input {...form.field('name')} placeholder="Erik Johansson" autoComplete="off" />
        </Field>

        <Field label="Company" htmlFor="company" required error={form.field('company').error}>
          <Input {...form.field('company')} placeholder="ABC Technologies" autoComplete="off" />
        </Field>

        <Field label="Email" htmlFor="email" required error={form.field('email').error}>
          <Input {...form.field('email')} type="email" placeholder="name@gmail.com" autoComplete="off" />
        </Field>

        <Field label="Phone" htmlFor="phone">
          <Input {...form.field('phone')} placeholder="+91 9876543210" autoComplete="off" />
        </Field>

        <Field label="Industry" htmlFor="industry">
          <Select {...form.field('industry')} options={INDUSTRIES} />
        </Field>

        <Field label="Location" htmlFor="location">
          <Input {...form.field('location')} placeholder="Stockholm, Sweden" autoComplete="off" />
        </Field>

        <Field label="Source" htmlFor="source" hint="Where the lead came from.">
          <Select {...form.field('source')} options={LEAD_SOURCES} />
        </Field>

        <Field label="Owner" htmlFor="owner">
          <Select {...form.field('owner')} options={users.map((item) => item.display_name)} />
        </Field>

        <Field label="Status" htmlFor="status" className="sm:col-span-2">
          <Select {...form.field('status')} options={CONTACT_STATUSES} />
        </Field>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
