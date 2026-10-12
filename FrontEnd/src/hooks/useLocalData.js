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

function normalizeActivityType(type) {
  const key = String(type ?? '').toLowerCase().replace('_', '-')
  return {
    call: 'Call',
    email: 'Email',
    meeting: 'Meeting',
    note: 'Note',
    'follow-up': 'Follow-up',
  }[key] ?? type
}

/**
 * Load every page for resources that must be represented completely in the
 * client-side CRM state. The backend keeps normal pagination at 25 rows;
 * following the `next` links avoids silently dropping records from counts
 * and the Kanban board.
 */
async function loadAllPages(loadFirstPage) {
  const firstPage = await loadFirstPage()
  const items = [...unwrapResults(firstPage)]
  let next = firstPage?.next ?? null

  while (next) {
    const nextUrl = new URL(next)
    const response = await api(`/deals/${nextUrl.search}`)
    items.push(...unwrapResults(response))
    next = response?.next ?? null
  }

  return items
}

async function loadAllContactPages(loadFirstPage) {
  const firstPage = await loadFirstPage()
  const items = [...unwrapResults(firstPage)]
  let next = firstPage?.next ?? null

  while (next) {
    const nextUrl = new URL(next)
    const response = await api(`/contacts/${nextUrl.search}`)
    items.push(...unwrapResults(response))
    next = response?.next ?? null
  }

  return items
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
  const [activityPagination, setActivityPagination] = useState({})
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
      loadAllContactPages(() => crmApi.contacts()),
      loadAllPages(() => crmApi.deals()),
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
        industry: item.industry ?? '',
        location: item.location ?? '',
        owner: item.owner_name ?? '',
        ownerId: item.owner_id ?? null,
        source: item.source_name ?? '',
        productId: item.product ?? null,
        product_id: item.product ?? null,
        productName: item.product_name ?? '',
        learningModeId: item.learning_mode ?? null,
        learning_mode_id: item.learning_mode ?? null,
        learningModeName: item.learning_mode_name ?? '',
        courseDurationId: item.course_duration ?? null,
        course_duration_id: item.course_duration ?? null,
        courseDurationName: item.course_duration_name ?? '',
        townCity: item.town_city ?? '',
        town_city: item.town_city ?? '',
        status: item.status === 'qualified' ? 'Qualified' : item.status === 'not_qualified' ? 'Not Qualified' : (item.status ?? ''),
        disqualification_reason: item.disqualification_reason ?? '',
        movedAt: item.became_contact_at ?? null,
        lastContact: item.last_contact_at ?? null,
        notes: item.notes ?? '',
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
            contact?.name ??
            contact?.company ??
            'Contact'
          }`,
          contact:
            contact?.name ??
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
          closedAt:
            item.closed_at?.slice(
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
      async (recordId, page = 1) => {
        if (!recordId) {
          return {
            activities: [],
            history: [],
            activityMeta: { count: 0, page: 1, pageSize: 20, nextPage: null },
          }
        }

        const activityRequest = api(
          `/records/${recordId}/activities/?page=${page}&page_size=20`,
        )
        const historyRequest = page === 1
          ? api(`/records/${recordId}/history/`)
          : Promise.resolve(null)

        const [activityResponse, historyRows] = await Promise.all([
          activityRequest,
          historyRequest,
        ])

        const activityRows = unwrapResults(activityResponse)
        const activityItems =
          activityRows.map(
            (item) => ({
              id: item.id,
              type: normalizeActivityType(item.type),
              title:
                item.subject,
              detail:
                item.description,
              actor:
                item.author_name,
              timestamp:
                item.happened_at,
              deal:
                item.deal_name ?? '',
              authorId:
                item.author_id ?? null,
              edited:
                Boolean(item.edited),
              editedAt:
                item.edited_at ?? null,
              originalSubject:
                item.original_subject ?? null,
              originalDescription:
                item.original_description ?? null,
              voided:
                Boolean(item.voided),
              voidReason:
                item.void_reason ?? '',
              voidedAt:
                item.voided_at ?? null,
              voidedBy:
                item.voided_by_name ?? '',
              canEdit:
                Boolean(item.can_edit),
              canVoid:
                Boolean(item.can_void),
            }),
          )

        const previousActivities =
          page > 1 ? (activityLog[recordId] ?? []) : []
        const mergedActivities = [
          ...previousActivities,
          ...activityItems,
        ].filter((item, index, all) =>
          all.findIndex((candidate) => candidate.id === item.id) === index
        ).sort(byNewest)

        const activityMeta = {
          count: activityResponse?.count ?? mergedActivities.length,
          page: activityResponse?.page ?? page,
          pageSize: activityResponse?.page_size ?? 20,
          nextPage: activityResponse?.next ?? null,
        }

        const historyItems =
          (historyRows ?? []).map(
            (item) => ({
              id: item.id,
              type: item.action,
              title:
                item.action_label ||
                item.action.replaceAll('_', ' '),
              detail:
                item.detail_text || '',
              actor:
                item.actor_name || 'System',
              timestamp:
                item.created_at,
            }),
          )

        setActivityLog(
          (current) => ({
            ...current,
            [recordId]: mergedActivities,
          }),
        )

        setActivityPagination(
          (current) => ({
            ...current,
            [recordId]: activityMeta,
          }),
        )

        if (page === 1) {
          setAuditLog(
            (current) => ({
              ...current,
              [recordId]: historyItems,
            }),
          )
        }

        return {
          activities: mergedActivities,
          history: page === 1 ? historyItems : (auditLog[recordId] ?? []),
          activityMeta,
        }
      },
      [activityLog, auditLog],
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
              activityCount:
                response.activity_count ?? 0,
            }
          : null
      },
      [refreshCrm],
    )

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  const addContact = useCallback(async (values) => {
    const source = sources.find((item) =>
      item.name === values.source || String(item.id) === String(values.source)
    )
    const payload = {
      name: String(values.name ?? '').trim(),
      owner: values.ownerId || null,
      company: values.company?.trim() || null,
      email: values.email?.trim().toLowerCase() || null,
      phone: values.phone?.trim() || null,
      source: source?.id ?? null,
      product: values.productId || null,
      learning_mode: values.learningModeId || null,
      course_duration: values.courseDurationId || null,
      town_city: values.townCity?.trim() || null,
      status: values.status === 'Qualified' ? 'qualified' : values.status === 'Not Qualified' ? 'not_qualified' : null,
      disqualification_reason: values.disqualification_reason?.trim() || null,
      notes: values.notes?.trim() || null,
    }
    if (!payload.name) throw new Error('Contact name is required.')
    const response = await api('/contacts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    await refreshCrm()
    return response
  }, [sources, refreshCrm])

  const updateContact = useCallback(async (id, values) => {
    const source = sources.find((item) =>
      item.name === values.source || String(item.id) === String(values.source)
    )
    const payload = {
      name: String(values.name ?? '').trim(),
      owner: values.ownerId || null,
      company: values.company?.trim() || null,
      email: values.email?.trim().toLowerCase() || null,
      phone: values.phone?.trim() || null,
      source: source?.id ?? null,
      product: values.productId || null,
      learning_mode: values.learningModeId || null,
      course_duration: values.courseDurationId || null,
      town_city: values.townCity?.trim() || null,
      status: values.status === 'Qualified' ? 'qualified' : values.status === 'Not Qualified' ? 'not_qualified' : null,
      disqualification_reason: values.disqualification_reason?.trim() || null,
      notes: values.notes?.trim() || null,
    }
    if (!payload.name) throw new Error('Contact name is required.')
    const response = await api(`/contacts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    await refreshCrm()
    return response
  }, [sources, refreshCrm])

  const deleteContact = useCallback(async (id) => {
    await api(`/contacts/${id}/`, { method: 'DELETE' })
    await refreshCrm()
  }, [refreshCrm])

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

        // The deal POST has succeeded at this point. A refresh failure must not
        // prevent the caller from receiving the created deal and showing its
        // success notification.
        try {
          await refreshCrm()
        } catch (refreshError) {
          console.error('Deal was created, but CRM refresh failed:', refreshError)
        }

        const contactDisplayName =
          contact.company?.trim() ||
          contact.name?.trim() ||
          'Contact'

        const deal = {
          id: nextId('d'),
          name: `${values.product} — ${contactDisplayName}`,
          contact:
            contactDisplayName,
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


        pushFeed({
          type: 'Deal created',
          description: `moved ${contactDisplayName} to Deals`,
          detail: `${deal.product} · ${money(deal.value)} · created at ${ENTRY_STAGE}.`,
          company:
            contactDisplayName,
        })

        try {
          await refreshCrm()
        } catch (refreshError) {
          console.error('Deal was created, but CRM refresh failed:', refreshError)
        }

        return {
          ...deal,
          id: String(
            response.id,
          ),
        }
      },
      [
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
        }
      },
      [
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
        const currentDeal =
          deals.find(
            (deal) =>
              String(deal.id) ===
              String(id),
          )

        if (
          !currentDeal ||
          currentDeal.stage ===
            stage
        ) {
          return currentDeal ?? null
        }

        const moved = {
          ...currentDeal,
          stage,
        }

        // Update the UI immediately, while using the normalized ID so
        // string/number ID differences cannot prevent the move.
        setDeals(
          (current) =>
            current.map(
              (deal) =>
                String(deal.id) ===
                String(id)
                  ? moved
                  : deal,
            ),
        )

        try {
          // Persist the stage change in the backend.
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

          // Always re-hydrate from the backend after a successful move.
          // This makes the persisted database state the source of truth.
          await refreshCrm()

          const won =
            stage === 'Won'
          const lost =
            stage === 'Lost'

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

          return moved
        } catch (error) {
          // If persistence fails, restore the UI from the backend instead
          // of leaving an optimistic stage that disappears later.
          await refreshCrm()
          throw error
        }
      },
      [
        deals,
        pushFeed,
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

  // A deal belongs to the shared CRM record, not to a company/name string.
  const companiesWithDeals =
    useMemo(
      () =>
        new Set(
          deals.map((deal) => deal.recordId).filter(Boolean),
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
              contact.recordId,
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
    activityPagination,
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