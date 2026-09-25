import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, crmApi } from '../lib/api'
import {
  CLOSED_STAGES,
  ENTRY_STAGE,
  OPEN_STAGES,
} from '../data/mockData'

/**
 * The single in-memory "store" for the whole CRM.
 *
 * API data is normalised at the boundary so the rest of the frontend
 * can continue using the existing camelCase visual model.
 *
 * ---------------------------------------------------------------------------
 * TWO LOGS, KEPT APART
 * ---------------------------------------------------------------------------
 *
 * activityLog
 *   What a rep did: calls, emails, meetings, notes, follow-ups.
 *
 * auditLog
 *   What the system recorded: qualified, moved, deal created,
 *   value changed, stage moved, won, lost.
 *
 * Both are keyed by recordId.
 */

let idCounter = 1000

function nextId(prefix) {
  idCounter += 1
  return `${prefix}${idCounter}`
}

function nowIso() {
  return new Date().toISOString()
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function money(amount) {
  return `$${(Number(amount) || 0).toLocaleString('en-US')}`
}

/** Newest first. */
function byNewest(a, b) {
  return new Date(b.timestamp) - new Date(a.timestamp)
}

function unwrapResults(response) {
  return response?.results ?? response ?? []
}

function normalizeProduct(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    default_value_minor:
      item.default_value_minor ??
      item.price_minor ??
      null,
    active: item.active !== false,
  }
}

function normalizeLearningMode(item) {
  return {
    id: item.id,
    name: item.name,
    active: item.active !== false,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }
}

function normalizeCourseDuration(item) {
  return {
    id: item.id,
    name: item.name,
    active: item.active !== false,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }
}

function normalizeLead(item) {
  const productId =
    item.product_id ??
    item.product ??
    null

  const learningModeId =
    item.learning_mode_id ??
    item.learning_mode ??
    null

  const courseDurationId =
    item.course_duration_id ??
    item.course_duration ??
    null

  return {
    id: String(item.id),
    recordId: item.record_id,

    name: item.name,
    company: item.company,
    email: item.email,
    phone: item.phone,

    source:
      item.source_name ??
      item.source ??
      '',

    status:
      item.status === 'qualified'
        ? 'Qualified'
        : 'Not Qualified',

    owner:
      item.owner_name ??
      '',

    ownerId:
      item.owner_id ??
      item.owner ??
      null,

    createdAt:
      item.created_at?.slice(0, 10),

    notes:
      item.notes ??
      '',

    disqualification_reason:
      item.disqualification_reason ??
      '',

    /*
     * Lead course information
     */
    productId,
    product_id: productId,

    productName:
      item.product_name ??
      item.product?.name ??
      '',

    learningModeId,
    learning_mode_id:
      learningModeId,

    learningModeName:
      item.learning_mode_name ??
      item.learning_mode?.name ??
      '',

    courseDurationId,
    course_duration_id:
      courseDurationId,

    courseDurationName:
      item.course_duration_name ??
      item.course_duration?.name ??
      '',

    /*
     * Location
     */
    townCity:
      item.town_city ??
      item.townCity ??
      '',

    town_city:
      item.town_city ??
      item.townCity ??
      '',
  }
}

export function useLocalData(currentUser) {
  const [leads, setLeads] = useState([])
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [activityLog, setActivityLog] = useState({})
  const [auditLog, setAuditLog] = useState({})
  const [users, setUsers] = useState([])
  const [sources, setSources] = useState([])

  // ---------------------------------------------------------------------------
  // Product / Lead Master Data
  // ---------------------------------------------------------------------------

  const [products, setProducts] =
    useState([])

  const [learningModes, setLearningModes] =
    useState([])

  const [courseDurations, setCourseDurations] =
    useState([])

  /**
   * Refresh all CRM data from the backend.
   *
   * Existing CRM resources remain unchanged.
   *
   * Product catalogue, Learning Modes and Course Durations are loaded
   * independently so that a permission failure in one catalogue does not
   * prevent the rest of the CRM from loading.
   */
  const refreshCrm = useCallback(async () => {
    /*
     * Load Lead master data independently from the main CRM records.
     *
     * This is important because one failed CRM endpoint must not prevent
     * Sources, Products, Learning Modes or Course Durations from reaching
     * the Lead form. The Lead form depends on these arrays for its dropdowns.
     */
    const [
      sourcePage,
      productPage,
      learningModePage,
      courseDurationPage,
    ] = await Promise.all([
      crmApi.sources().catch(() => []),
      crmApi.products().catch(() => []),
      crmApi
        .learningModes({
          active: 'true',
        })
        .catch(() => []),
      crmApi
        .courseDurations({
          active: 'true',
        })
        .catch(() => []),
    ])

    /*
     * Sources
     *
     * Keep the complete source objects because addLead/updateLead resolve
     * the selected source name/id back to the backend Source primary key.
     */
    setSources(
      unwrapResults(sourcePage),
    )

    /*
     * Product catalogue
     *
     * Existing backend permission rules are preserved. A user who cannot
     * access the catalogue should not lose access to the rest of CRM.
     */
    const remoteProducts =
      unwrapResults(
        productPage,
      ).map(normalizeProduct)

    setProducts(remoteProducts)

    /*
     * Learning Modes
     *
     * These are backend-managed master values.
     */
    const remoteLearningModes =
      unwrapResults(
        learningModePage,
      ).map(
        normalizeLearningMode,
      )

    setLearningModes(
      remoteLearningModes,
    )

    /*
     * Course Durations
     *
     * These are backend-managed master values.
     */
    const remoteCourseDurations =
      unwrapResults(
        courseDurationPage,
      ).map(
        normalizeCourseDuration,
      )

    setCourseDurations(
      remoteCourseDurations,
    )

    /*
     * Load the existing CRM records separately.
     *
     * All existing Leads / Contacts / Deals / Tasks / Users behaviour remains
     * unchanged. The separation above guarantees that master-data dropdowns
     * can still hydrate even when a different CRM request has a problem.
     */
    const [
      leadPage,
      contactPage,
      dealPage,
      taskPage,
      userPage,
    ] = await Promise.all([
      crmApi.leads(),
      crmApi.contacts(),
      crmApi.deals(),
      crmApi.tasks(),
      crmApi.users(),
    ])

    const remoteContacts =
      unwrapResults(
        contactPage,
      ).map((item) => ({
        id: String(item.id),
        recordId: item.record_id,
        name: item.name,
        company: item.company,
        email: item.email,
        phone: item.phone,
        industry:
          item.industry ||
          'Other',
        location:
          item.location,
        owner:
          item.owner_name,
        source:
          item.source,
        movedAt:
          item.became_contact_at?.slice(
            0,
            10,
          ),
        lastContact: null,
        status: 'Active',
        notes: item.notes,
      }))

    setUsers(
      unwrapResults(userPage),
    )

    setLeads(
      unwrapResults(
        leadPage,
      ).map(normalizeLead),
    )

    setContacts(
      remoteContacts,
    )

    setDeals(
      unwrapResults(
        dealPage,
      ).map((item) => {
        const contact =
          remoteContacts.find(
            (entry) =>
              entry.recordId ===
              item.record,
          )

        return {
          id: String(item.id),
          recordId:
            item.record,
          name: `${item.product_name} — ${
            contact?.company ??
            'Contact'
          }`,
          contact:
            contact?.company ??
            'Contact',
          product:
            item.product_name,
          value:
            item.value_minor / 100,
          stage:
            item.stage[0].toUpperCase() +
            item.stage.slice(1),
          closeDate:
            item.expected_close_date,
          owner:
            item.owner_name,
          createdAt:
            item.created_at?.slice(
              0,
              10,
            ),
          notes:
            item.notes,
        }
      }),
    )

    setTasks(
      unwrapResults(
        taskPage,
      ).map((item) => {
        const contact =
          remoteContacts.find(
            (entry) =>
              entry.recordId ===
              item.record,
          )

        return {
          id: String(item.id),
          title: item.title,
          contact:
            contact?.company ?? '',
          recordId:
            item.record,
          dueDate:
            item.due_at?.slice(
              0,
              10,
            ),
          dueTime:
            item.due_at?.slice(
              11,
              16,
            ),
          priority:
            item.priority[0].toUpperCase() +
            item.priority.slice(1),
          type:
            item.task_type,
          owner:
            item.assignee_name,
          completed:
            Boolean(
              item.completed_at,
            ),
          notes: '',
        }
      }),
    )
  }, [])

  useEffect(() => {
    refreshCrm().catch(() => {})
  }, [refreshCrm])

  // ---------------------------------------------------------------------------
  // Product Catalogue
  // ---------------------------------------------------------------------------

  const createProduct = useCallback(
    async (values) => {
      const payload = {
        name:
          values.name?.trim(),
        description:
          values.description?.trim() ||
          '',
        price_minor:
          values.price_minor != null
            ? Number(
                values.price_minor,
              )
            : values.default_value_minor !=
                null
              ? Number(
                  values.default_value_minor,
                )
              : null,
        active:
          values.active !== false,
      }

      const response =
        await crmApi.createProduct(
          payload,
        )

      const product =
        normalizeProduct(
          response,
        )

      setProducts(
        (current) => [
          product,
          ...current,
        ],
      )

      return product
    },
    [],
  )

  const updateProduct =
    useCallback(
      async (id, values) => {
        const payload = {}

        if (
          values.name !==
          undefined
        ) {
          payload.name =
            values.name.trim()
        }

        if (
          values.description !==
          undefined
        ) {
          payload.description =
            values.description.trim()
        }

        if (
          values.default_value_minor !==
          undefined
        ) {
          payload.default_value_minor =
            Number(
              values.default_value_minor,
            )
        }

        if (
          values.price_minor !==
          undefined
        ) {
          payload.price_minor =
            Number(
              values.price_minor,
            )
        }

        if (
          values.active !==
          undefined
        ) {
          payload.active =
            Boolean(
              values.active,
            )
        }

        const response =
          await crmApi.updateProduct(
            id,
            payload,
          )

        const updatedProduct =
          normalizeProduct(
            response,
          )

        setProducts(
          (current) =>
            current.map(
              (product) =>
                String(
                  product.id,
                ) ===
                String(id)
                  ? updatedProduct
                  : product,
            ),
        )

        return updatedProduct
      },
      [],
    )

  const deleteProduct =
    useCallback(
      async (id) => {
        await crmApi.deleteProduct(
          id,
        )

        setProducts(
          (current) =>
            current.filter(
              (product) =>
                String(
                  product.id,
                ) !==
                String(id),
            ),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Learning Mode Catalogue
  // ---------------------------------------------------------------------------

  const createLearningMode =
    useCallback(
      async (values) => {
        const response =
          await crmApi.createLearningMode(
            {
              name:
                values.name?.trim(),
              active:
                values.active !== false,
            },
          )

        const item =
          normalizeLearningMode(
            response,
          )

        setLearningModes(
          (current) => [
            item,
            ...current,
          ],
        )

        return item
      },
      [],
    )

  const updateLearningMode =
    useCallback(
      async (id, values) => {
        const response =
          await crmApi.updateLearningMode(
            id,
            {
              ...(values.name !==
              undefined
                ? {
                    name:
                      values.name.trim(),
                  }
                : {}),
              ...(values.active !==
              undefined
                ? {
                    active:
                      Boolean(
                        values.active,
                      ),
                  }
                : {}),
            },
          )

        const updated =
          normalizeLearningMode(
            response,
          )

        setLearningModes(
          (current) =>
            current.map(
              (item) =>
                String(item.id) ===
                String(id)
                  ? updated
                  : item,
            ),
        )

        return updated
      },
      [],
    )

  const deleteLearningMode =
    useCallback(
      async (id) => {
        await crmApi.deleteLearningMode(
          id,
        )

        setLearningModes(
          (current) =>
            current.filter(
              (item) =>
                String(item.id) !==
                String(id),
            ),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Course Duration Catalogue
  // ---------------------------------------------------------------------------

  const createCourseDuration =
    useCallback(
      async (values) => {
        const response =
          await crmApi.createCourseDuration(
            {
              name:
                values.name?.trim(),
              active:
                values.active !== false,
            },
          )

        const item =
          normalizeCourseDuration(
            response,
          )

        setCourseDurations(
          (current) => [
            item,
            ...current,
          ],
        )

        return item
      },
      [],
    )

  const updateCourseDuration =
    useCallback(
      async (id, values) => {
        const response =
          await crmApi.updateCourseDuration(
            id,
            {
              ...(values.name !==
              undefined
                ? {
                    name:
                      values.name.trim(),
                  }
                : {}),
              ...(values.active !==
              undefined
                ? {
                    active:
                      Boolean(
                        values.active,
                      ),
                  }
                : {}),
            },
          )

        const updated =
          normalizeCourseDuration(
            response,
          )

        setCourseDurations(
          (current) =>
            current.map(
              (item) =>
                String(item.id) ===
                String(id)
                  ? updated
                  : item,
            ),
        )

        return updated
      },
      [],
    )

  const deleteCourseDuration =
    useCallback(
      async (id) => {
        await crmApi.deleteCourseDuration(
          id,
        )

        setCourseDurations(
          (current) =>
            current.filter(
              (item) =>
                String(item.id) !==
                String(id),
            ),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Record Timeline
  // ---------------------------------------------------------------------------

  const loadLeadTimeline =
    useCallback(
      async (recordId) => {
        if (!recordId) {
          return {
            activities: [],
            history: [],
          }
        }

        const [
          activityRows,
          historyRows,
        ] = await Promise.all([
          api(
            `/records/${recordId}/activities/`,
          ),
          api(
            `/records/${recordId}/history/`,
          ),
        ])

        const activityItems =
          (activityRows ?? []).map(
            (item) => ({
              id: item.id,
              type: item.type,
              title:
                item.subject,
              detail:
                item.description,
              actor:
                item.author_name,
              timestamp:
                item.happened_at,
            }),
          )

        const historyItems =
          (historyRows ?? []).map(
            (item) => ({
              id: item.id,
              title:
                item.action.replaceAll(
                  '_',
                  ' ',
                ),
              detail:
                item.detail
                  ? JSON.stringify(
                      item.detail,
                    )
                  : '',
              actor:
                item.actor_name,
              timestamp:
                item.created_at,
            }),
          )

        setActivityLog(
          (current) => ({
            ...current,
            [recordId]:
              activityItems,
          }),
        )

        setAuditLog(
          (current) => ({
            ...current,
            [recordId]:
              historyItems,
          }),
        )

        return {
          activities:
            activityItems,
          history:
            historyItems,
        }
      },
      [],
    )

  /** Push an entry onto the global feed shown on the Dashboard. */
  const pushFeed =
    useCallback(
      (entry) => {
        setActivities(
          (current) => [
            {
              id: nextId('a'),
              actor:
                currentUser?.name ||
                'User',
              timestamp:
                nowIso(),
              ...entry,
            },
            ...current,
          ],
        )
      },
      [currentUser],
    )

  /**
   * Record a system event against a record.
   */
  const audit =
    useCallback(
      (recordId, entry) => {
        if (!recordId) return

        setAuditLog(
          (current) => ({
            ...current,
            [recordId]: [
              {
                id: nextId(
                  'au',
                ),
                timestamp:
                  nowIso(),
                ...entry,
              },
              ...(current[
                recordId
              ] ?? []),
            ].sort(
              byNewest,
            ),
          }),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Activity
  // ---------------------------------------------------------------------------

  const logActivity =
    useCallback(
      async (
        record,
        values,
      ) => {
        if (!record?.recordId) {
          return null
        }

        const relatedDeal =
          deals.find(
            (deal) =>
              deal.name ===
                values.deal &&
              deal.recordId ===
                record.recordId,
          )

        await api(
          `/records/${record.recordId}/activities/`,
          {
            method: 'POST',
            body: JSON.stringify(
              {
                type: values.type
                  .toLowerCase()
                  .replace(
                    '-',
                    '_',
                  ),
                subject:
                  values.title,
                description:
                  values.detail ??
                  '',
                happened_at:
                  new Date(
                    values.timestamp ||
                      Date.now(),
                  ).toISOString(),
                ...(relatedDeal
                  ? {
                      deal: Number(
                        relatedDeal.id,
                      ),
                    }
                  : {}),
              },
            ),
          },
        )

        const timestamp =
          values.timestamp
            ? new Date(
                values.timestamp,
              ).toISOString()
            : nowIso()

        const entry = {
          id: nextId('ac'),
          type: values.type,
          title:
            values.title,
          detail:
            values.detail ?? '',
          deal:
            values.deal ||
            undefined,
          actor:
            values.actor,
          timestamp,
        }

        setActivityLog(
          (current) => ({
            ...current,
            [record.recordId]: [
              entry,
              ...(current[
                record.recordId
              ] ?? []),
            ].sort(
              byNewest,
            ),
          }),
        )

        const loggedDate =
          timestamp.slice(
            0,
            10,
          )

        setContacts(
          (current) =>
            current.map(
              (item) =>
                item.recordId ===
                  record.recordId &&
                loggedDate >
                  (item.lastContact ??
                    '')
                  ? {
                      ...item,
                      lastContact:
                        loggedDate,
                    }
                  : item,
            ),
        )

        pushFeed({
          type: values.type,
          actor:
            values.actor,
          timestamp,
          description: `logged ${
            /^[aeiou]/i.test(
              values.type,
            )
              ? 'an'
              : 'a'
          } ${values.type.toLowerCase()} with ${record.company}`,
          detail: [
            values.title,
            values.deal,
          ]
            .filter(Boolean)
            .join(' · '),
          company:
            record.company,
        })

        return entry
      },
      [pushFeed, deals],
    )

  // ---------------------------------------------------------------------------
  // Leads
  // ---------------------------------------------------------------------------

  const addLead =
    useCallback(
      async (values) => {
        const source =
          sources.find(
            (item) =>
              item.name ===
                values.source ||
              String(item.id) ===
                String(
                  values.source,
                ),
          )

        const payload = {
          name:
            values.name
              ?.trim() || '',
          company:
            values.company
              ?.trim() || '',
          email:
            values.email
              ?.trim()
              .toLowerCase() ||
            '',
          phone:
            values.phone || '',

          source:
            source?.id ??
            null,

          status:
            values.status ===
            'Qualified'
              ? 'qualified'
              : 'not_qualified',

          owner:
            values.ownerId ||
            currentUser?.id,

          /*
           * New Lead fields
           */
          product:
            values.productId ||
            null,

          learning_mode:
            values.learningModeId ||
            null,

          course_duration:
            values.courseDurationId ||
            null,

          town_city:
            values.townCity
              ?.trim() || '',

          /*
           * Existing Lead Feedback storage.
           * Lead Feedback continues to use the existing notes field.
           */
          notes:
            values.notes
              ?.trim() || '',

          disqualification_reason:
            values.disqualification_reason ||
            '',
        }

        const response =
          await api('/leads/', {
            method: 'POST',
            body: JSON.stringify(
              payload,
            ),
          })

        await refreshCrm()

        return response
      },
      [
        sources,
        currentUser,
        refreshCrm,
      ],
    )

  const updateLead =
    useCallback(
      async (id, values) => {
        const source =
          sources.find(
            (item) =>
              item.name ===
                values.source ||
              String(item.id) ===
                String(
                  values.source,
                ),
          )

        const payload = {
          name:
            values.name?.trim(),
          company:
            values.company?.trim(),
          email:
            values.email
              ?.trim()
              .toLowerCase(),
          phone:
            values.phone || '',

          source:
            source?.id ??
            null,

          status:
            values.status ===
            'Qualified'
              ? 'qualified'
              : 'not_qualified',

          /*
           * New Lead fields
           */
          product:
            values.productId ||
            null,

          learning_mode:
            values.learningModeId ||
            null,

          course_duration:
            values.courseDurationId ||
            null,

          town_city:
            values.townCity
              ?.trim() || '',

          /*
           * Lead Feedback continues to use notes.
           */
          notes:
            values.notes
              ?.trim() || '',

          disqualification_reason:
            values.disqualification_reason ||
            '',
        }

        if (
          values.ownerId !=
          null
        ) {
          payload.owner =
            values.ownerId
        }

        const response =
          await api(
            `/leads/${id}/`,
            {
              method: 'PATCH',
              body: JSON.stringify(
                payload,
              ),
            },
          )

        await refreshCrm()

        return response
      },
      [
        sources,
        refreshCrm,
      ],
    )

  const deleteLead =
    useCallback(
      async (id) => {
        await api(
          `/leads/${id}/`,
          {
            method: 'DELETE',
          },
        )

        await refreshCrm()
      },
      [refreshCrm],
    )

  const reassignLead =
    useCallback(
      async (
        id,
        ownerId,
      ) => {
        const response =
          await api(
            `/leads/${id}/reassign/`,
            {
              method: 'POST',
              body: JSON.stringify(
                {
                  owner: ownerId,
                },
              ),
            },
          )

        await refreshCrm()

        return response
      },
      [refreshCrm],
    )

  const qualifyLead =
    useCallback(
      async (
        id,
        statusValue,
        reason = '',
        details = '',
      ) => {
        const response =
          await api(
            `/leads/${id}/qualify/`,
            {
              method: 'POST',
              body: JSON.stringify(
                {
                  status:
                    statusValue ===
                    'Qualified'
                      ? 'qualified'
                      : 'not_qualified',
                  reason,
                  details,
                },
              ),
            },
          )

        await refreshCrm()

        return response
      },
      [refreshCrm],
    )

  const moveLeadToContact =
    useCallback(
      async (id) => {
        const response =
          await api(
            `/leads/${id}/convert/`,
            {
              method: 'POST',
            },
          )

        await refreshCrm()

        return response?.contact
          ? {
              ...response.contact,
              recordId:
                response.contact
                  .record_id,
              owner:
                response.contact
                  .owner_name,
            }
          : null
      },
      [refreshCrm],
    )

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  const addContact =
    useCallback(
      (values) => {
        const contact = {
          id: nextId('c'),
          recordId:
            nextId('r-'),
          source: 'Other',
          movedAt:
            todayIso(),
          lastContact:
            todayIso(),
          status: 'Active',
          ...values,
        }

        setContacts(
          (current) => [
            contact,
            ...current,
          ],
        )

        audit(
          contact.recordId,
          {
            type: 'Record updated',
            title:
              'Contact created directly',
            detail:
              'Added without coming through Leads.',
            actor:
              contact.owner,
          },
        )

        pushFeed({
          type: 'Contact created',
          description: `added a contact — ${contact.company}`,
          detail:
            contact.name,
          company:
            contact.company,
        })

        return contact
      },
      [audit, pushFeed],
    )

  const updateContact =
    useCallback(
      (id, values) => {
        let target = null

        setContacts(
          (current) =>
            current.map(
              (contact) => {
                if (
                  contact.id !==
                  id
                ) {
                  return contact
                }

                target =
                  contact

                return {
                  ...contact,
                  ...values,
                }
              },
            ),
        )

        if (target) {
          audit(
            target.recordId,
            {
              type: 'Record updated',
              title:
                'Contact details edited',
              detail: '',
              actor:
                values.owner ??
                target.owner,
            },
          )
        }
      },
      [audit],
    )

  const deleteContact =
    useCallback(
      (id) => {
        setContacts(
          (current) =>
            current.filter(
              (contact) =>
                contact.id !==
                id,
            ),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Deals
  // ---------------------------------------------------------------------------

  const moveContactToDeal =
    useCallback(
      async (
        contact,
        values,
      ) => {
        if (!contact)
          return null

        let availableProducts =
          products

        if (
          !availableProducts.length
        ) {
          const productResponse =
            await crmApi.products()

          availableProducts =
            unwrapResults(
              productResponse,
            )
        }

        const product =
          availableProducts.find(
            (item) =>
              item.name ===
              values.product,
          )

        const response =
          await api(
            `/contacts/${contact.id}/deals/`,
            {
              method: 'POST',
              body: JSON.stringify(
                {
                  product:
                    product?.id,
                  value_minor:
                    Math.round(
                      Number(
                        values.value ||
                          0,
                      ) * 100,
                    ),
                  expected_close_date:
                    values.closeDate,
                  notes:
                    values.notes ||
                    '',
                },
              ),
            },
          )

        await refreshCrm()

        const deal = {
          id: nextId('d'),
          name: `${values.product} — ${contact.company}`,
          contact:
            contact.company,
          recordId:
            contact.recordId,
          product:
            values.product,
          value:
            Number(
              values.value,
            ) || 0,
          stage:
            ENTRY_STAGE,
          closeDate:
            values.closeDate,
          owner:
            values.owner ??
            contact.owner,
          createdAt:
            todayIso(),
          notes:
            values.notes ??
            '',
        }

        setDeals(
          (current) => [
            deal,
            ...current,
          ],
        )

        setContacts(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                contact.id
                  ? {
                      ...item,
                      lastContact:
                        todayIso(),
                    }
                  : item,
            ),
        )

        audit(
          contact.recordId,
          {
            type: 'Deal created',
            title:
              deal.name,
            detail: `Created at ${ENTRY_STAGE} · ${deal.product} · ${money(deal.value)}.`,
            deal:
              deal.name,
            actor:
              deal.owner,
          },
        )

        pushFeed({
          type: 'Deal created',
          description: `moved ${contact.company} to Deals`,
          detail: `${deal.product} · ${money(deal.value)} · created at ${ENTRY_STAGE}.`,
          company:
            contact.company,
        })

        await refreshCrm()

        return {
          ...deal,
          id: String(
            response.id,
          ),
        }
      },
      [
        audit,
        pushFeed,
        refreshCrm,
        products,
      ],
    )

  const recordIdForDeal =
    useCallback(
      (deal) =>
        deal?.recordId ??
        contacts.find(
          (contact) =>
            contact.company ===
            deal?.contact,
        )?.recordId,
      [contacts],
    )

  const updateDeal =
    useCallback(
      (id, values) => {
        let target = null

        setDeals(
          (current) =>
            current.map(
              (deal) => {
                if (
                  deal.id !==
                  id
                ) {
                  return deal
                }

                target =
                  deal

                return {
                  ...deal,
                  ...values,
                  value:
                    Number(
                      values.value ??
                        deal.value,
                    ) || 0,
                }
              },
            ),
        )

        if (target) {
          audit(
            recordIdForDeal(
              target,
            ),
            {
              type: 'Record updated',
              title:
                `${target.name} edited`,
              detail: '',
              deal:
                target.name,
              actor:
                values.owner ??
                target.owner,
            },
          )
        }
      },
      [
        audit,
        recordIdForDeal,
      ],
    )

  const updateDealValue =
    useCallback(
      (
        id,
        nextValue,
      ) => {
        const deal =
          deals.find(
            (item) =>
              item.id ===
              id,
          )

        if (!deal)
          return null

        if (
          !OPEN_STAGES.includes(
            deal.stage,
          )
        ) {
          return null
        }

        const value =
          Number(
            nextValue,
          ) || 0

        if (
          value ===
          deal.value
        ) {
          return deal
        }

        setDeals(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                id
                  ? {
                      ...item,
                      value,
                    }
                  : item,
            ),
        )

        audit(
          recordIdForDeal(
            deal,
          ),
          {
            type: 'Value updated',
            title:
              `Value changed on ${deal.name}`,
            detail:
              `${money(deal.value)} → ${money(value)} during ${deal.stage}.`,
            deal:
              deal.name,
            actor:
              deal.owner,
          },
        )

        pushFeed({
          type: 'Value updated',
          description:
            `changed the value of ${deal.name}`,
          detail:
            `${money(deal.value)} → ${money(value)} during ${deal.stage}.`,
          company:
            deal.contact,
        })

        return {
          ...deal,
          value,
        }
      },
      [
        deals,
        audit,
        pushFeed,
        recordIdForDeal,
      ],
    )

  const moveDeal =
    useCallback(
      async (
        id,
        stage,
      ) => {
        let moved = null
        let from = null

        setDeals(
          (current) =>
            current.map(
              (deal) => {
                if (
                  deal.id !==
                    id ||
                  deal.stage ===
                    stage
                ) {
                  return deal
                }

                from =
                  deal.stage

                moved = {
                  ...deal,
                  stage,
                }

                return moved
              },
            ),
        )

        if (moved) {
          await api(
            `/deals/${id}/move/`,
            {
              method: 'POST',
              body: JSON.stringify(
                {
                  stage:
                    stage.toLowerCase(),
                  ...(stage ===
                  'Lost'
                    ? {
                        loss_reason:
                          'other',
                      }
                    : {}),
                },
              ),
            },
          )

          await refreshCrm()

          const won =
            stage === 'Won'
          const lost =
            stage === 'Lost'

          audit(
            recordIdForDeal(
              moved,
            ),
            {
              type: won
                ? 'Deal won'
                : lost
                  ? 'Deal lost'
                  : 'Stage changed',
              title:
                won || lost
                  ? `${moved.name} marked ${stage}`
                  : `${moved.name} moved to ${stage}`,
              detail:
                won || lost
                  ? `${money(moved.value)} · value locked.`
                  : `${from} → ${stage}.`,
              deal:
                moved.name,
              actor:
                moved.owner,
            },
          )

          pushFeed({
            type: won
              ? 'Deal won'
              : lost
                ? 'Deal lost'
                : 'Stage changed',
            description:
              `moved ${moved.name} to ${stage}`,
            detail:
              `${moved.contact} · ${money(moved.value)}`,
            company:
              moved.contact,
          })
        }

        return moved
      },
      [
        audit,
        pushFeed,
        recordIdForDeal,
        refreshCrm,
      ],
    )

  const deleteDeal =
    useCallback(
      (id) => {
        setDeals(
          (current) =>
            current.filter(
              (deal) =>
                deal.id !==
                id,
            ),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  const addTask =
    useCallback(
      async (values) => {
        const contact =
          contacts.find(
            (item) =>
              item.company ===
              values.contact,
          )

        await api(
          '/tasks/',
          {
            method: 'POST',
            body: JSON.stringify(
              {
                title:
                  values.title,
                record:
                  contact?.recordId ??
                  null,
                due_at: `${values.dueDate}T${
                  values.dueTime ||
                  '09:00'
                }:00Z`,
                priority: (
                  values.priority ||
                  'Medium'
                ).toLowerCase(),
                task_type:
                  values.type ||
                  'follow_up',
              },
            ),
          },
        )

        const task = {
          id: nextId('t'),
          completed:
            false,
          notes: '',
          ...values,
        }

        setTasks(
          (current) => [
            task,
            ...current,
          ],
        )

        await refreshCrm()

        return task
      },
      [
        contacts,
        refreshCrm,
      ],
    )

  const updateTask =
    useCallback(
      (id, values) => {
        setTasks(
          (current) =>
            current.map(
              (task) =>
                task.id ===
                id
                  ? {
                      ...task,
                      ...values,
                    }
                  : task,
            ),
        )
      },
      [],
    )

  const toggleTask =
    useCallback(
      async (id) => {
        let toggled = null

        setTasks(
          (current) =>
            current.map(
              (task) => {
                if (
                  task.id !==
                  id
                ) {
                  return task
                }

                toggled = {
                  ...task,
                  completed:
                    !task.completed,
                }

                return toggled
              },
            ),
        )

        if (toggled) {
          await api(
            `/tasks/${id}/complete/`,
            {
              method: 'POST',
            },
          )
        }

        if (
          toggled?.completed
        ) {
          pushFeed({
            type: 'Task completed',
            description:
              `completed a task — ${toggled.title}`,
            detail:
              toggled.contact,
            company:
              toggled.contact,
          })
        }

        await refreshCrm()

        return toggled
      },
      [
        pushFeed,
        refreshCrm,
      ],
    )

  const deleteTask =
    useCallback(
      (id) => {
        setTasks(
          (current) =>
            current.filter(
              (task) =>
                task.id !==
                id,
            ),
        )
      },
      [],
    )

  // ---------------------------------------------------------------------------
  // Derived figures
  // ---------------------------------------------------------------------------

  const companiesWithDeals =
    useMemo(
      () =>
        new Set(
          deals.map(
            (deal) =>
              deal.contact,
          ),
        ),
      [deals],
    )

  const stats = useMemo(
    () => {
      const openDeals =
        deals.filter(
          (deal) =>
            OPEN_STAGES.includes(
              deal.stage,
            ),
        )

      const wonDeals =
        deals.filter(
          (deal) =>
            deal.stage ===
            'Won',
        )

      const lostDeals =
        deals.filter(
          (deal) =>
            deal.stage ===
            'Lost',
        )

      const sum = (list) =>
        list.reduce(
          (
            total,
            deal,
          ) =>
            total +
            (Number(
              deal.value,
            ) || 0),
          0,
        )

      const withoutDeal =
        contacts.filter(
          (contact) =>
            !companiesWithDeals.has(
              contact.company,
            ),
        ).length

      return {
        totalLeads:
          leads.length,

        qualifiedLeads:
          leads.filter(
            (lead) =>
              lead.status ===
              'Qualified',
          ).length,

        unqualifiedLeads:
          leads.filter(
            (lead) =>
              lead.status ===
              'Not Qualified',
          ).length,

        totalContacts:
          contacts.length,

        contactsWithDeals:
          contacts.length -
          withoutDeal,

        contactsWithoutDeal:
          withoutDeal,

        totalDeals:
          deals.length,

        openDeals:
          openDeals.length,

        pipelineValue:
          sum(openDeals),

        wonDeals:
          wonDeals.length,

        wonValue:
          sum(wonDeals),

        lostDeals:
          lostDeals.length,

        lostValue:
          sum(lostDeals),

        closedDeals:
          deals.filter(
            (deal) =>
              CLOSED_STAGES.includes(
                deal.stage,
              ),
          ).length,

        openTasks:
          tasks.filter(
            (task) =>
              !task.completed,
          ).length,
      }
    },
    [
      leads,
      contacts,
      deals,
      tasks,
      companiesWithDeals,
    ],
  )

  return {
    // -------------------------------------------------------------------------
    // Records
    // -------------------------------------------------------------------------

    leads,
    users,
    sources,
    contacts,
    deals,
    tasks,

    // -------------------------------------------------------------------------
    // Product / Lead Master Data
    // -------------------------------------------------------------------------

    products,
    learningModes,
    courseDurations,

    // -------------------------------------------------------------------------
    // Logs
    // -------------------------------------------------------------------------

    activities,
    activityLog,
    auditLog,
    companiesWithDeals,

    // -------------------------------------------------------------------------
    // Timeline / Lead actions
    // -------------------------------------------------------------------------

    logActivity,
    loadLeadTimeline,
    reassignLead,
    qualifyLead,

    addLead,
    updateLead,
    deleteLead,
    moveLeadToContact,

    // -------------------------------------------------------------------------
    // Contacts
    // -------------------------------------------------------------------------

    addContact,
    updateContact,
    deleteContact,
    moveContactToDeal,

    // -------------------------------------------------------------------------
    // Deals
    // -------------------------------------------------------------------------

    updateDeal,
    updateDealValue,
    moveDeal,
    deleteDeal,

    // -------------------------------------------------------------------------
    // Product Catalogue
    // -------------------------------------------------------------------------

    createProduct,
    updateProduct,
    deleteProduct,

    // -------------------------------------------------------------------------
    // Learning Mode Catalogue
    // -------------------------------------------------------------------------

    createLearningMode,
    updateLearningMode,
    deleteLearningMode,

    // -------------------------------------------------------------------------
    // Course Duration Catalogue
    // -------------------------------------------------------------------------

    createCourseDuration,
    updateCourseDuration,
    deleteCourseDuration,

    // -------------------------------------------------------------------------
    // Tasks
    // -------------------------------------------------------------------------

    addTask,
    updateTask,
    toggleTask,
    deleteTask,

    // -------------------------------------------------------------------------
    // Derived
    // -------------------------------------------------------------------------

    stats,

    // -------------------------------------------------------------------------
    // Refresh
    // -------------------------------------------------------------------------

    refreshCrm,
  }
}