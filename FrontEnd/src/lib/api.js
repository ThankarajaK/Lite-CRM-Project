const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

function csrfToken() {
  return document.cookie
    .split('; ')
    .find((value) => value.startsWith('csrftoken='))
    ?.split('=')[1]
}

export async function api(path, options = {}) {
  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData

  const headers = {
    ...(csrfToken()
      ? { 'X-CSRFToken': csrfToken() }
      : {}),
    ...(options.headers || {}),
  }

  if (
    !isFormData &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] =
      'application/json'
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      credentials: 'include',
      ...options,
      headers,
    },
  )

  if (response.status === 204) {
    return null
  }

  const body = await response
    .json()
    .catch(() => ({}))

  if (!response.ok) {
    const detail =
      body.detail ||
      Object.entries(body)
        .map(
          ([key, value]) =>
            `${key}: ${
              Array.isArray(value)
                ? value.join(', ')
                : value
            }`,
        )
        .join(' · ')

    const error = new Error(
      detail ||
        'The request could not be completed.',
    )

    error.status = response.status
    error.data = body

    throw error
  }

  return body
}

export const crmApi = {
  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  csrf: () =>
    api('/auth/csrf/'),

  me: () =>
    api('/auth/me/'),

  login: async (
    username,
    password,
  ) => {
    await api('/auth/csrf/')

    return api('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
      }),
    })
  },

  logout: () =>
    api('/auth/logout/', {
      method: 'POST',
    }),

  changePassword: (
    currentPassword,
    newPassword,
  ) =>
    api('/auth/password/change/', {
      method: 'POST',
      body: JSON.stringify({
        current_password:
          currentPassword,
        new_password: newPassword,
      }),
    }),

  requestPasswordReset: async (
    identifier,
  ) => {
    await api('/auth/csrf/')

    return api(
      '/auth/password/reset/request/',
      {
        method: 'POST',
        body: JSON.stringify({
          identifier,
        }),
      },
    )
  },

  confirmPasswordReset: (
    identifier,
    code,
    newPassword,
  ) =>
    api(
      '/auth/password/reset/confirm/',
      {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          code,
          new_password:
            newPassword,
        }),
      },
    ),

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------

  sessions: () =>
    api('/auth/sessions/'),

  revokeAllSessions: () =>
    api(
      '/auth/sessions/revoke-all/',
      {
        method: 'POST',
      },
    ),

  // ---------------------------------------------------------------------------
  // Leads
  // ---------------------------------------------------------------------------

  leads: (params = {}) => {
    const query =
      new URLSearchParams(params)

    return api(
      `/leads/${
        query.toString()
          ? `?${query}`
          : ''
      }`,
    )
  },

  getLead: (id) =>
    api(`/leads/${id}/`),

  createLead: (data) =>
    api('/leads/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLead: (id, data) =>
    api(`/leads/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteLead: (id) =>
    api(`/leads/${id}/`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // Lead Master Data
  // ---------------------------------------------------------------------------

  learningModes: (params = {}) => {
    const query =
      new URLSearchParams(params)

    return api(
      `/learning-modes/${
        query.toString()
          ? `?${query}`
          : ''
      }`,
    )
  },

  getLearningMode: (id) =>
    api(`/learning-modes/${id}/`),

  createLearningMode: (
    data,
  ) =>
    api('/learning-modes/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLearningMode: (
    id,
    data,
  ) =>
    api(
      `/learning-modes/${id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    ),

  deleteLearningMode: (id) =>
    api(
      `/learning-modes/${id}/`,
      {
        method: 'DELETE',
      },
    ),

  courseDurations: (
    params = {},
  ) => {
    const query =
      new URLSearchParams(params)

    return api(
      `/course-durations/${
        query.toString()
          ? `?${query}`
          : ''
      }`,
    )
  },

  getCourseDuration: (id) =>
    api(`/course-durations/${id}/`),

  createCourseDuration: (
    data,
  ) =>
    api('/course-durations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCourseDuration: (
    id,
    data,
  ) =>
    api(
      `/course-durations/${id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    ),

  deleteCourseDuration: (
    id,
  ) =>
    api(
      `/course-durations/${id}/`,
      {
        method: 'DELETE',
      },
    ),

  // ---------------------------------------------------------------------------
  // Users - Admin User Management
  // ---------------------------------------------------------------------------

  users: () =>
    api('/users/'),

  getUser: (id) =>
    api(`/users/${id}/`),

  createUser: (data) =>
    api('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id, data) =>
    api(`/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changeUserRole: (
    id,
    role,
  ) =>
    api(`/users/${id}/role/`, {
      method: 'PATCH',
      body: JSON.stringify({
        role,
      }),
    }),

  changeUserStatus: (
    id,
    isActive,
  ) =>
    api(`/users/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: isActive,
      }),
    }),

  changeUserPassword: (
    id,
    newPassword,
  ) =>
    api(
      `/users/${id}/password/`,
      {
        method: 'POST',
        body: JSON.stringify({
          new_password:
            newPassword,
        }),
      },
    ),

  roles: () =>
    api('/roles/'),

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  contacts: () =>
    api('/contacts/'),

  getContact: (id) =>
    api(`/contacts/${id}/`),

  createContact: (data) =>
    api('/contacts/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateContact: (
    id,
    data,
  ) =>
    api(`/contacts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteContact: (id) =>
    api(`/contacts/${id}/`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // Deals
  // ---------------------------------------------------------------------------

  deals: () =>
    api('/deals/'),

  getDeal: (id) =>
    api(`/deals/${id}/`),

  createDeal: (data) =>
    api('/deals/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDeal: (
    id,
    data,
  ) =>
    api(`/deals/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteDeal: (id) =>
    api(`/deals/${id}/`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // Sources
  // ---------------------------------------------------------------------------

  sources: () =>
    api('/sources/'),

  createSource: (data) =>
    api('/sources/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteSource: (id) =>
    api(`/sources/${id}/`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // Products / Catalogue
  // ---------------------------------------------------------------------------

  products: () =>
    api('/products/'),

  getProduct: (id) =>
    api(`/products/${id}/`),

  createProduct: (data) =>
    api('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (
    id,
    data,
  ) =>
    api(`/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id) =>
    api(`/products/${id}/`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  tasks: (view = '') =>
    api(
      `/tasks/${
        view
          ? `?view=${view}`
          : ''
      }`,
    ),

  getTask: (id) =>
    api(`/tasks/${id}/`),

  createTask: (data) =>
    api('/tasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (
    id,
    data,
  ) =>
    api(`/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTask: (id) =>
    api(`/tasks/${id}/`, {
      method: 'DELETE',
    }),
}