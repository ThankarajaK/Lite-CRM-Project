import { useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import {
  Field,
  Input,
  Select,
  Textarea,
} from '../ui/FormField'
import {
  useForm,
  validators,
} from '../../hooks/useForm'

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
  /*
   * Company, Email, Source and Disqualification Reason
   * are intentionally OPTIONAL.
   *
   * Email is validated only when the user enters a value.
   */
  const email =
    values.email?.trim()
      ? validators.email(values.email)
      : undefined

  const phone =
    values.phone?.trim()

  let phoneError

  if (phone) {
    const digits = phone
      .replace(/\D/g, '')
      .replace(
        /^91(?=\d{10}$)/,
        '',
      )

    if (
      !/^\d{10}$/.test(digits) ||
      !/^[6-9]/.test(digits)
    ) {
      phoneError =
        'Enter a valid Indian mobile number.'
    }
  }

  return {
    /*
     * Name is still required.
     */
    name: validators.required(
      values.name,
      'Name',
    ),

    /*
     * Company is OPTIONAL.
     */
    company: undefined,

    /*
     * Email is OPTIONAL.
     * If entered, it must be a valid email.
     */
    email,

    /*
     * Phone remains OPTIONAL,
     * but is validated when entered.
     */
    phone: phoneError,

    /*
     * Source is OPTIONAL.
     */
    source: undefined,

    /*
     * Disqualification reason is OPTIONAL.
     * It is no longer required even when
     * Status = Not Qualified.
     */
    disqualification_reason: undefined,
  }
}

function normalizeOptions(
  items = [],
  selectedId = '',
) {
  const options = items
    .filter(
      (item) =>
        item &&
        item.id != null &&
        item.active !== false,
    )
    .map((item) => ({
      value: String(item.id),
      label: item.name,
    }))

  /*
   * If an existing Lead contains a value that has
   * subsequently been deactivated, keep that value
   * visible while editing so the stored Lead data
   * is not lost.
   */
  if (
    selectedId &&
    !options.some(
      (item) =>
        String(item.value) ===
        String(selectedId),
    )
  ) {
    const selectedItem =
      items.find(
        (item) =>
          String(item.id) ===
          String(selectedId),
      )

    if (selectedItem) {
      options.unshift({
        value: String(
          selectedItem.id,
        ),
        label: selectedItem.name,
      })
    }
  }

  return options
}

export default function LeadFormModal({
  open,
  onClose,
  onSubmit,
  lead,
  users,
  sources,
  products,
  learningModes,
  courseDurations,
  currentUser,
  canReassign,
}) {
  const initialValues = useMemo(() => {
    /*
     * Support both the frontend camelCase model and
     * the Django serializer snake_case response.
     */
    const productId =
      lead?.productId ??
      lead?.product_id ??
      lead?.product ??
      ''

    const learningModeId =
      lead?.learningModeId ??
      lead?.learning_mode_id ??
      lead?.learning_mode ??
      ''

    const courseDurationId =
      lead?.courseDurationId ??
      lead?.course_duration_id ??
      lead?.course_duration ??
      ''

    const townCity =
      lead?.townCity ??
      lead?.town_city ??
      ''

    return {
      name: '',
      company: '',
      email: '',
      phone: '',

      source:
        sources?.find(
          (item) =>
            String(item.name) ===
            String(lead?.source),
        )?.name ??
        lead?.source ??
        sources?.[0]?.name ??
        '',

      status:
        lead?.status ??
        'Not Qualified',

      /*
       * For a new Lead, the logged-in user is the
       * default owner.
       */
      ownerId:
        lead?.ownerId ??
        lead?.owner_id ??
        currentUser?.id ??
        '',

      productId,

      learningModeId,

      courseDurationId,

      townCity,

      notes:
        lead?.notes ??
        lead?.leadFeedback ??
        '',

      disqualification_reason:
        lead?.disqualification_reason ??
        lead?.disqualificationReason ??
        '',

      ...(lead
        ? {
            ...lead,

            ownerId:
              lead.ownerId ??
              lead.owner_id ??
              currentUser?.id ??
              '',

            productId,

            learningModeId,

            courseDurationId,

            townCity,

            notes:
              lead.notes ??
              lead.leadFeedback ??
              '',

            disqualification_reason:
              lead.disqualification_reason ??
              lead.disqualificationReason ??
              '',
          }
        : {}),
    }
  }, [
    lead,
    sources,
    currentUser,
  ])

  const form = useForm(
    initialValues,
    validate,
  )

  const isEdit = Boolean(lead)

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }
  }, [
    open,
    initialValues,
  ])

  /*
   * ==========================================================
   * CURRENT USER ROLE
   * ==========================================================
   */

  const currentRoleKey =
    String(
      currentUser?.role ??
        '',
    )
      .trim()
      .toLowerCase()

  const currentRoleName =
    String(
      currentUser?.role_name ??
        '',
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
   * RULES:
   *
   * 1. Only ACTIVE users can appear.
   *
   * 2. Admin users NEVER appear in the Owner dropdown.
   *
   * 3. Salesperson:
   *      -> ONLY the logged-in Salesperson's own name.
   *
   * 4. Sales Manager:
   *      -> If they have reassignment permission:
   *         active Salespersons + active Sales Managers.
   *      -> Otherwise:
   *         only themselves.
   *
   * 5. Admin:
   *      -> active Salespersons + active Sales Managers.
   */

  /*
   * First build the list of valid assignable users.
   *
   * Only active Salesperson and Sales Manager users
   * are allowed here.
   *
   * Admin is intentionally excluded.
   */
  const assignableUsers = (
    users ?? []
  ).filter((item) => {
    if (!item) {
      return false
    }

    /*
     * Only active users.
     */
    const isActive =
      item.is_active === true ||
      (
        item.is_active == null &&
        item.active === true
      )

    if (!isActive) {
      return false
    }

    /*
     * Normalized role key.
     */
    const roleKey =
      String(
        item.role ??
          '',
      )
        .trim()
        .toLowerCase()

    /*
     * Compatibility fallback.
     */
    const roleName =
      String(
        item.role_name ??
          '',
      )
        .trim()
        .toLowerCase()

    const itemIsSalesperson =
      roleKey === 'salesperson' ||
      roleName === 'salesperson'

    const itemIsSalesManager =
      roleKey === 'sales_manager' ||
      roleName === 'sales manager'

    /*
     * Admin is deliberately excluded.
     */
    return (
      itemIsSalesperson ||
      itemIsSalesManager
    )
  })

  /*
   * ==========================================================
   * LOGGED-IN SALESPERSON FALLBACK
   * ==========================================================
   *
   * Sometimes the /users/ API does not contain the currently
   * logged-in user in exactly the same structure used by the
   * Owner dropdown.
   *
   * For Salesperson, we therefore use currentUser directly
   * as the source of truth.
   *
   * This guarantees that the logged-in Salesperson's own
   * name is displayed even when users[] does not contain them.
   */

  const currentSalespersonOwner =
    isSalesperson &&
    currentUser?.id != null
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

  /*
   * Build Owner dropdown according to logged-in role.
   */
  const ownerUsers = (() => {
    /*
     * ========================================================
     * SALES PERSON
     * ========================================================
     *
     * A Salesperson can create/edit Leads,
     * but Owner must always be themselves.
     *
     * IMPORTANT:
     * Use currentUser directly first.
     *
     * This prevents the Owner dropdown from becoming empty
     * when the current user is missing from users[].
     */
    if (isSalesperson) {
      if (currentSalespersonOwner) {
        return [
          currentSalespersonOwner,
        ]
      }

      return []
    }

    /*
     * ========================================================
     * SALES MANAGER
     * ========================================================
     *
     * If reassignment is allowed:
     * show all active Salespersons and Sales Managers.
     *
     * Otherwise:
     * show only themselves.
     */
    if (isSalesManager) {
      if (canReassign) {
        return assignableUsers
      }

      const ownUser =
        assignableUsers.find(
          (item) =>
            String(item.id) ===
            String(currentUser?.id),
        )

      if (ownUser) {
        return [ownUser]
      }

      /*
       * Fallback to currentUser if the API user list
       * does not contain the logged-in manager.
       */
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
     * ========================================================
     * ADMIN
     * ========================================================
     *
     * Admin can assign Leads to active
     * Salespersons and Sales Managers.
     */
    if (isAdmin) {
      return assignableUsers
    }

    /*
     * ========================================================
     * SAFE FALLBACK
     * ========================================================
     *
     * Never expose another user's name.
     */
    const ownUser =
      assignableUsers.find(
        (item) =>
          String(item.id) ===
          String(currentUser?.id),
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

  const ownerOptions =
    ownerUsers.map((item) => ({
      value: String(item.id),

      label:
        item.display_name ??
        item.displayName ??
        item.name ??
        item.username ??
        item.email,
    }))

  const sourceOptions = (
    sources ?? []
  ).map((item) => ({
    value: item.name,
    label: item.name,
  }))

  const selectedProductId =
    form.values?.productId ??
    ''

  const selectedLearningModeId =
    form.values?.learningModeId ??
    ''

  const selectedCourseDurationId =
    form.values
      ?.courseDurationId ??
    ''

  const productOptions =
    normalizeOptions(
      products ?? [],
      selectedProductId,
    )

  const learningModeOptions =
    normalizeOptions(
      learningModes ?? [],
      selectedLearningModeId,
    )

  const courseDurationOptions =
    normalizeOptions(
      courseDurations ?? [],
      selectedCourseDurationId,
    )

  /*
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  const handleSubmit = (
    event,
  ) => {
    event.preventDefault()

    if (form.validateNow()) {
      return
    }

    /*
     * Keep the UI model in camelCase.
     *
     * useLocalData.js is responsible for translating
     * this into the backend API payload.
     */
    const values = {
      ...form.values,

      productId:
        form.values.productId ||
        null,

      learningModeId:
        form.values.learningModeId ||
        null,

      courseDurationId:
        form.values.courseDurationId ||
        null,

      townCity:
        form.values.townCity?.trim() ||
        '',

      notes:
        form.values.notes?.trim() ||
        '',

      phone:
        form.values.phone?.trim() ||
        '',

      /*
       * Optional fields should be sent as empty strings
       * rather than causing frontend validation errors.
       */
      company:
        form.values.company?.trim() ||
        '',

      email:
        form.values.email?.trim() ||
        '',

      source:
        form.values.source?.trim() ||
        '',

      disqualification_reason:
        form.values.disqualification_reason?.trim() ||
        '',
    }

    /*
     * ========================================================
     * SALESPERSON OWNER SECURITY
     * ========================================================
     *
     * Regardless of what the UI contains, a Salesperson
     * can NEVER submit another user's ID as Owner.
     *
     * The logged-in user's ID is always forced here.
     */
    if (isSalesperson) {
      values.ownerId =
        currentUser?.id ?? ''
    }

    onSubmit(values)
      .then(() => onClose())
      .catch(() => {})
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? 'Edit Lead'
          : 'Capture Lead'
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

          <Button
            onClick={handleSubmit}
          >
            {isEdit
              ? 'Save Changes'
              : 'Save Lead'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {/* =====================================================
            BASIC LEAD INFORMATION
            ===================================================== */}

        <Field
          label="Name"
          htmlFor="name"
          required
          error={
            form.field('name')
              .error
          }
        >
          <Input
            {...form.field('name')}
            placeholder="RAJA"
          />
        </Field>

        <Field
          label="Company"
          htmlFor="company"
        >
          <Input
            {...form.field('company')}
            placeholder="ABC Technologies"
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          error={
            form.field('email')
              .error
          }
        >
          <Input
            {...form.field('email')}
            type="email"
            placeholder="name@gmail.com"
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="phone"
          error={
            form.field('phone')
              .error
          }
          hint="Indian mobile number"
        >
          <Input
            {...form.field('phone')}
            placeholder="+91 9876543210"
          />
        </Field>

        {/* =====================================================
            COURSE INTEREST
            ===================================================== */}

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
                label:
                  'Select Product',
              },
              ...productOptions,
            ]}
          />
        </Field>

        {/* =====================================================
            PREFERRED LEARNING MODE
            ===================================================== */}

        <Field
          label="Preferred Learning Mode"
          htmlFor="learningModeId"
        >
          <Select
            {...form.field(
              'learningModeId',
            )}
            options={[
              {
                value: '',
                label:
                  'Select Learning Mode',
              },
              ...learningModeOptions,
            ]}
          />
        </Field>

        {/* =====================================================
            PREFERRED COURSE DURATION
            ===================================================== */}

        <Field
          label="Preferred Course Duration"
          htmlFor="courseDurationId"
        >
          <Select
            {...form.field(
              'courseDurationId',
            )}
            options={[
              {
                value: '',
                label:
                  'Select Course Duration',
              },
              ...courseDurationOptions,
            ]}
          />
        </Field>

        {/* =====================================================
            TOWN / CITY
            ===================================================== */}

        <Field
          label="Town / City"
          htmlFor="townCity"
        >
          <Input
            {...form.field(
              'townCity',
            )}
            placeholder="Chennai"
          />
        </Field>

        {/* =====================================================
            SOURCE
            ===================================================== */}

        <Field
          label="Source"
          htmlFor="source"
          error={
            form.field('source')
              .error
          }
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

        {/* =====================================================
            STATUS
            ===================================================== */}

        <Field
          label="Status"
          htmlFor="status"
        >
          <Select
            {...form.field('status')}
            options={
              STATUS_OPTIONS
            }
          />
        </Field>

        {/* =====================================================
            DISQUALIFICATION REASON
            ===================================================== */}

        {form.values?.status ===
        'Not Qualified' ? (
          <Field
            label="Disqualification reason"
            htmlFor="disqualification_reason"
            error={
              form.field(
                'disqualification_reason',
              ).error
            }
          >
            <Select
              {...form.field(
                'disqualification_reason',
              )}
              options={[
                {
                  value: '',
                  label:
                    'Select reason',
                },
                ...REASONS.map(
                  (value) => ({
                    value,
                    label: value,
                  }),
                ),
              ]}
            />
          </Field>
        ) : null}

        {/* =====================================================
            OWNER
            ===================================================== */}

        <Field
          label="Owner"
          htmlFor="ownerId"
          className="sm:col-span-2"
          hint={
            isSalesperson
              ? 'The lead will be owned by you.'
              : canReassign
                ? 'Only active Sales Managers and Salespersons can be selected.'
                : 'The lead will be owned by the logged-in user.'
          }
        >
          <Select
            {...form.field(
              'ownerId',
            )}
            options={
              ownerOptions
            }

            /*
             * IMPORTANT:
             *
             * Salesperson is NOT disabled anymore.
             *
             * The dropdown is clickable, but it contains
             * only the logged-in Salesperson's own name.
             *
             * handleSubmit() also forces the current user's
             * ID before sending the request.
             */
            disabled={false}
          />
        </Field>

        {/* =====================================================
            LEAD FEEDBACK
            ===================================================== */}

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