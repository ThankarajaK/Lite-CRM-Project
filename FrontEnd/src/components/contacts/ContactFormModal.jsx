import { useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import {
  Field,
  Input,
  Select,
  Textarea,
} from '../ui/FormField'
import { useForm, validators } from '../../hooks/useForm'
import { useData } from '../../context/DataContext'

const STATUS_OPTIONS = [
  {
    value: 'Not Qualified',
    label: 'Not Qualified',
  },
  {
    value: 'Qualified',
    label: 'Qualified',
  },
]

const REASONS = [
  'no budget',
  'no need',
  'too small',
  'wrong fit',
  'went elsewhere',
  'no response',
  'other',
]

function validate(values) {
  const email = values.email?.trim()
    ? validators.email(values.email)
    : undefined

  const phone = values.phone?.trim()

  let phoneError

  if (phone) {
    const digits = phone
      .replace(/\D/g, '')
      .replace(/^91(?=\d{10}$)/, '')

    if (
      !/^\d{10}$/.test(digits) ||
      !/^[6-9]/.test(digits)
    ) {
      phoneError = 'Enter a valid Indian mobile number.'
    }
  }

  return {
    name: validators.required(values.name, 'Name'),
    company: undefined,
    email,
    phone: phoneError,
    source: undefined,
    disqualification_reason: undefined,
  }
}

function normalizeOptions(items = [], selectedId = '') {
  const options = items
    .filter(
      (item) =>
        item &&
        item.id != null &&
        item.active !== false
    )
    .map((item) => ({
      value: String(item.id),
      label: item.name,
    }))

  /*
   * Keep an existing inactive/deactivated value visible
   * while editing so stored Contact data is not lost.
   */
  if (
    selectedId &&
    !options.some(
      (item) =>
        String(item.value) === String(selectedId)
    )
  ) {
    const selectedItem = items.find(
      (item) =>
        String(item.id) === String(selectedId)
    )

    if (selectedItem) {
      options.unshift({
        value: String(selectedItem.id),
        label: selectedItem.name,
      })
    }
  }

  return options
}

export default function ContactFormModal({
  open,
  onClose,
  onSubmit,
  contact,
}) {
  const {
    users,
    user: currentUser,
    sources,
    products,
    learningModes,
    courseDurations,
    hasPermission,
  } = useData()

  const canReassign =
    hasPermission?.('reassign_lead') === true

  const initialValues = useMemo(() => {
    const productId =
      contact?.productId ??
      contact?.product_id ??
      contact?.product ??
      ''

    const learningModeId =
      contact?.learningModeId ??
      contact?.learning_mode_id ??
      contact?.learning_mode ??
      ''

    const courseDurationId =
      contact?.courseDurationId ??
      contact?.course_duration_id ??
      contact?.course_duration ??
      ''

    const townCity =
      contact?.townCity ??
      contact?.town_city ??
      ''

    return {
      name: '',
      company: '',
      email: '',
      phone: '',

      source:
        contact?.source_name ??
        contact?.source ??
        '',

      status:
        contact?.status ??
        'Not Qualified',

      ownerId:
        contact?.ownerId ??
        contact?.owner_id ??
        currentUser?.id ??
        '',

      productId,
      learningModeId,
      courseDurationId,
      townCity,

      notes:
        contact?.notes ??
        contact?.leadFeedback ??
        contact?.lead_feedback ??
        '',

      disqualification_reason:
        contact?.disqualification_reason ??
        contact?.disqualificationReason ??
        '',

      ...(contact
        ? {
            ...contact,

            ownerId:
              contact.ownerId ??
              contact.owner_id ??
              currentUser?.id ??
              '',

            productId,
            learningModeId,
            courseDurationId,
            townCity,

            source:
              contact.source_name ??
              contact.source ??
              '',

            notes:
              contact.notes ??
              contact.leadFeedback ??
              contact.lead_feedback ??
              '',

            disqualification_reason:
              contact.disqualification_reason ??
              contact.disqualificationReason ??
              '',
          }
        : {}),
    }
  }, [contact, currentUser])

  const form = useForm(initialValues, validate)
  const isEdit = Boolean(contact)

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  /*
   * ==========================================================
   * CURRENT USER ROLE
   * ==========================================================
   */

  const currentRoleKey = String(
    currentUser?.role ?? ''
  )
    .trim()
    .toLowerCase()

  const currentRoleName = String(
    currentUser?.role_name ?? ''
  )
    .trim()
    .toLowerCase()

  const isSalesperson =
    currentRoleKey === 'salesperson' ||
    currentRoleName === 'salesperson'

  const isSalesManager =
    currentRoleKey === 'sales_manager' ||
    currentRoleName === 'sales manager'

  const isAdmin =
    currentRoleKey === 'admin' ||
    currentRoleName === 'admin'

  /*
   * ==========================================================
   * OWNER OPTIONS
   * ==========================================================
   *
   * Same rules as Add Lead:
   *
   * - Active users only
   * - Admin users excluded
   * - Salesperson -> only themselves
   * - Sales Manager with reassign permission ->
   *   active Salespersons + active Sales Managers
   * - Sales Manager without reassign permission ->
   *   only themselves
   * - Admin -> active Salespersons + active Sales Managers
   */

  const assignableUsers = (users ?? []).filter((item) => {
    if (!item) {
      return false
    }

    const isActive =
      item.is_active === true ||
      (item.is_active == null && item.active === true)

    if (!isActive) {
      return false
    }

    const roleKey = String(
      item.role ?? ''
    )
      .trim()
      .toLowerCase()

    const roleName = String(
      item.role_name ?? ''
    )
      .trim()
      .toLowerCase()

    const itemIsSalesperson =
      roleKey === 'salesperson' ||
      roleName === 'salesperson'

    const itemIsSalesManager =
      roleKey === 'sales_manager' ||
      roleName === 'sales manager'

    return (
      itemIsSalesperson ||
      itemIsSalesManager
    )
  })

  const currentSalespersonOwner =
    isSalesperson && currentUser?.id != null
      ? {
          ...currentUser,
          id: currentUser.id,
          display_name:
            currentUser.display_name ??
            currentUser.displayName ??
            currentUser.name ??
            currentUser.username ??
            currentUser.email ??
            'Current User',
          name:
            currentUser.name ??
            currentUser.display_name ??
            currentUser.displayName ??
            currentUser.username ??
            currentUser.email ??
            'Current User',
        }
      : null

  const ownerUsers = (() => {
    /*
     * Salesperson
     */
    if (isSalesperson) {
      if (currentSalespersonOwner) {
        return [currentSalespersonOwner]
      }

      return []
    }

    /*
     * Sales Manager
     */
    if (isSalesManager) {
      if (canReassign) {
        return assignableUsers
      }

      const ownUser = assignableUsers.find(
        (item) =>
          String(item.id) ===
          String(currentUser?.id)
      )

      if (ownUser) {
        return [ownUser]
      }

      if (currentUser?.id != null) {
        return [
          {
            ...currentUser,
            id: currentUser.id,
            display_name:
              currentUser.display_name ??
              currentUser.displayName ??
              currentUser.name ??
              currentUser.username ??
              currentUser.email ??
              'Current User',
            name:
              currentUser.name ??
              currentUser.display_name ??
              currentUser.displayName ??
              currentUser.username ??
              currentUser.email ??
              'Current User',
          },
        ]
      }

      return []
    }

    /*
     * Admin
     */
    if (isAdmin) {
      return assignableUsers
    }

    /*
     * Safe fallback
     */
    const ownUser = assignableUsers.find(
      (item) =>
        String(item.id) ===
        String(currentUser?.id)
    )

    if (ownUser) {
      return [ownUser]
    }

    if (currentUser?.id != null) {
      return [
        {
          ...currentUser,
          id: currentUser.id,
          display_name:
            currentUser.display_name ??
            currentUser.displayName ??
            currentUser.name ??
            currentUser.username ??
            currentUser.email ??
            'Current User',
          name:
            currentUser.name ??
            currentUser.display_name ??
            currentUser.displayName ??
            currentUser.username ??
            currentUser.email ??
            'Current User',
        },
      ]
    }

    return []
  })()

  const ownerOptions = ownerUsers.map((item) => ({
    value: String(item.id),
    label:
      item.display_name ??
      item.displayName ??
      item.name ??
      item.username ??
      item.email,
  }))

  /*
   * ==========================================================
   * MASTER DATA OPTIONS
   * ==========================================================
   */

  const sourceOptions = (sources ?? []).map((item) => ({
    value: item.name,
    label: item.name,
  }))

  const selectedProductId =
    form.values?.productId ?? ''

  const selectedLearningModeId =
    form.values?.learningModeId ?? ''

  const selectedCourseDurationId =
    form.values?.courseDurationId ?? ''

  const productOptions = normalizeOptions(
    products ?? [],
    selectedProductId
  )

  const learningModeOptions = normalizeOptions(
    learningModes ?? [],
    selectedLearningModeId
  )

  const courseDurationOptions = normalizeOptions(
    courseDurations ?? [],
    selectedCourseDurationId
  )

  /*
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  const handleSubmit = (event) => {
    event.preventDefault()

    if (form.validateNow()) {
      return
    }

    const values = {
      ...form.values,

      productId:
        form.values.productId || null,

      learningModeId:
        form.values.learningModeId || null,

      courseDurationId:
        form.values.courseDurationId || null,

      townCity:
        form.values.townCity?.trim() || null,

      notes:
        form.values.notes?.trim() || null,

      phone:
        form.values.phone?.trim() || null,

      company:
        form.values.company?.trim() || null,

      email:
        form.values.email?.trim() || null,

      source:
        form.values.source?.trim() || null,

      disqualification_reason:
        form.values.disqualification_reason?.trim() || null,
    }

    /*
     * A Salesperson can never submit another user's ID.
     */
    if (isSalesperson) {
      values.ownerId =
        currentUser?.id ?? ''
    }

    Promise.resolve(onSubmit(values))
      .then(() => onClose())
      .catch(() => {})
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? 'Edit Contact'
          : 'Add Contact'
      }
      description="Use real CRM data. The current user is the default owner."
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit}>
            {isEdit
              ? 'Save Changes'
              : 'Save Contact'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {/* Name */}

        <Field
          label="Name"
          htmlFor="name"
          required
          error={form.field('name').error}
        >
          <Input
            {...form.field('name')}
            placeholder="RAJA"
          />
        </Field>

        {/* Company */}

        <Field
          label="Company"
          htmlFor="company"
        >
          <Input
            {...form.field('company')}
            placeholder="ABC Technologies"
          />
        </Field>

        {/* Email */}

        <Field
          label="Email"
          htmlFor="email"
          error={form.field('email').error}
        >
          <Input
            {...form.field('email')}
            type="email"
            placeholder="name@gmail.com"
          />
        </Field>

        {/* Phone */}

        <Field
          label="Phone"
          htmlFor="phone"
          error={form.field('phone').error}
          hint="Indian mobile number"
        >
          <Input
            {...form.field('phone')}
            placeholder="+91 9876543210"
          />
        </Field>

        {/* Course Interested */}

        <Field
          label="Course Interested"
          htmlFor="productId"
          hint="Uses the existing Product catalogue"
        >
          <Select
            {...form.field('productId')}
            options={[
              {
                value: '',
                label: 'Select Product',
              },
              ...productOptions,
            ]}
          />
        </Field>

        {/* Preferred Learning Mode */}

        <Field
          label="Preferred Learning Mode"
          htmlFor="learningModeId"
        >
          <Select
            {...form.field('learningModeId')}
            options={[
              {
                value: '',
                label: 'Select Learning Mode',
              },
              ...learningModeOptions,
            ]}
          />
        </Field>

        {/* Preferred Course Duration */}

        <Field
          label="Preferred Course Duration"
          htmlFor="courseDurationId"
        >
          <Select
            {...form.field('courseDurationId')}
            options={[
              {
                value: '',
                label: 'Select Course Duration',
              },
              ...courseDurationOptions,
            ]}
          />
        </Field>

        {/* Town / City */}

        <Field
          label="Town / City"
          htmlFor="townCity"
        >
          <Input
            {...form.field('townCity')}
            placeholder="Chennai"
          />
        </Field>

        {/* Source */}

        <Field
          label="Source"
          htmlFor="source"
          error={form.field('source').error}
        >
          <Select
            {...form.field('source')}
            options={[
              {
                value: '',
                label: 'Select Source',
              },
              ...sourceOptions,
            ]}
          />
        </Field>

        {/* Status */}

        <Field
          label="Status"
          htmlFor="status"
        >
          <Select
            {...form.field('status')}
            options={STATUS_OPTIONS}
          />
        </Field>

        {/* Disqualification Reason */}

        {form.values?.status === 'Not Qualified' && (
          <Field
            label="Disqualification reason"
            htmlFor="disqualification_reason"
            error={
              form.field(
                'disqualification_reason'
              ).error
            }
          >
            <Select
              {...form.field(
                'disqualification_reason'
              )}
              options={[
                {
                  value: '',
                  label: 'Select reason',
                },
                ...REASONS.map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
          </Field>
        )}

        {/* Owner */}

        <Field
          label="Owner"
          htmlFor="ownerId"
          className="sm:col-span-2"
          hint={
            isSalesperson
              ? 'The contact will be owned by you.'
              : canReassign
                ? 'Only active Sales Managers and Salespersons can be selected.'
                : 'The contact will be owned by the logged-in user.'
          }
        >
          <Select
            {...form.field('ownerId')}
            options={ownerOptions}
          />
        </Field>

        {/* Lead Feedback */}

        <Field
          label="Lead Feedback"
          htmlFor="notes"
          className="sm:col-span-2"
        >
          <Textarea
            {...form.field('notes')}
            rows={4}
            placeholder="What do we know so far?"
          />
        </Field>

        <button
          type="submit"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </form>
    </Modal>
  )
}