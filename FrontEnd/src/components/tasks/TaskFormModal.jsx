import { useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'
import { useData } from '../../context/DataContext'
import { TASK_PRIORITIES, TASK_TYPES } from '../../data/mockData'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function validate(values) {
  return {
    title: validators.required(values.title, 'Task name'),
    dueDate: validators.required(values.dueDate, 'Due date'),
  }
}

/** Add / Edit task dialog. */
export default function TaskFormModal({ open, onClose, onSubmit, task, contacts = [] }) {
  const { users } = useData()
  const initialValues = useMemo(() => {
    const base = {
      title: '',
      contact: contacts[0]?.company ?? '',
      dueDate: today(),
      dueTime: '09:00',
      owner: users[0]?.display_name ?? '',
      priority: 'Medium',
      type: 'Call',
      notes: '',
    }
    return task ? { ...base, ...task } : base
  }, [task, contacts])

  const form = useForm(initialValues, validate)
  const isEdit = Boolean(task)

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
      title={isEdit ? 'Edit Task' : 'Add Task'}
      description={isEdit ? 'Update this follow-up.' : 'Schedule a follow-up or activity.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Save Task'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Task Name"
          htmlFor="title"
          required
          error={form.field('title').error}
          className="sm:col-span-2"
        >
          <Input {...form.field('title')} placeholder="Call ABC Technologies" autoComplete="off" />
        </Field>

        <Field label="Contact" htmlFor="contact">
          <Select
            {...form.field('contact')}
            options={contacts.map((contact) => contact.company)}
            placeholder="Select a contact"
          />
        </Field>

        <Field label="Type" htmlFor="type">
          <Select {...form.field('type')} options={TASK_TYPES} />
        </Field>

        <Field label="Due Date" htmlFor="dueDate" required error={form.field('dueDate').error}>
          <Input {...form.field('dueDate')} type="date" />
        </Field>

        <Field label="Due Time" htmlFor="dueTime">
          <Input {...form.field('dueTime')} type="time" />
        </Field>

        <Field label="Priority" htmlFor="priority">
          <Select {...form.field('priority')} options={TASK_PRIORITIES} />
        </Field>

        <Field label="Assigned To" htmlFor="owner">
          <Select {...form.field('owner')} options={users.map((item) => item.display_name)} />
        </Field>

        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea {...form.field('notes')} rows={3} placeholder="Anything to prepare?" />
        </Field>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
