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

export async function downloadFile(path, options = {}) {
  const headers = {
    ...(csrfToken() ? { 'X-CSRFToken': csrfToken() } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail = body.detail || 'The download could not be completed.'
    const error = new Error(detail)
    error.status = response.status
    error.data = body
    throw error
  }

  return response.blob()
}


export async function createExport(report, format = 'csv', filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const response = await fetch(`${API_BASE_URL}/exports/${params.toString() ? `?${params}` : ''}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken() ? { 'X-CSRFToken': csrfToken() } : {}),
    },
    body: JSON.stringify({ report, format }),
  })
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok) {
    const body = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {}
    throw new Error(body.detail || 'Export failed. Check your export permission and try again.')
  }
  if (response.status === 202 || contentType.includes('application/json')) return response.json()
  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] || `litecrm-${report}-${new Date().toISOString().slice(0, 10)}.${format}`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return { downloaded: true, filename }
}

export const crmApi = {
  workspaceAudit: (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)) })
    return api(`/audit/${params.toString() ? `?${params}` : ''}`)
  },
  exportWorkspaceAudit: (filters = {}) => {
    const params = new URLSearchParams({ ...filters, export: 'csv' })
    return downloadFile(`/audit/?${params.toString()}`)
  },
  businessConfiguration: () => api('/business-configuration/'),
  saveBusinessConfiguration: (data) => api('/business-configuration/', { method: 'PUT', body: JSON.stringify(data) }),
  createBusinessListItem: (data) => api('/business-configuration/', { method: 'POST', body: JSON.stringify(data) }),
  updateBusinessListItem: (id, data) => api(`/business-configuration/items/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBusinessListItem: (id) => api(`/business-configuration/items/${id}/`, { method: 'DELETE' }),
  createExport: (report, format = 'csv', filters = {}) => createExport(report, format, filters),

  // Live, permission-scoped EPIC 10 pipeline and conversion reports.
  pipelineConversionReports: (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    })
    const query = params.toString()
    return api(`/reports/pipeline-conversion/${query ? `?${query}` : ''}`)
  },

  // Permission-scoped EPIC 10 / US-10.3 salesperson performance report.
  salespersonPerformanceReports: (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    })
    const query = params.toString()
    return api(`/reports/salesperson-performance/${query ? `?${query}` : ''}`)
  },

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

  // ---------------------------------------------------------------------------
  // Forgot Password
  // ---------------------------------------------------------------------------

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

  // Verify OTP only.
  // This does NOT change the password.
  verifyPasswordResetCode: async (
    identifier,
    code,
  ) => {
    await api('/auth/csrf/')

    return api(
      '/auth/password-reset/verify/',
      {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          code,
        }),
      },
    )
  },

  // Change password only after OTP has been verified.
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

    importLeadPreview: (formData) =>
  api('/leads/import-preview/', {
    method: 'POST',
    body: formData,
    headers: {},
  }),

  importLeads: (formData) =>
    api('/leads/import/', {
      method: 'POST',
      body: formData,
      headers: {},
    }),

  downloadLeadImportTemplate: (format = 'xlsx') =>
    downloadFile(`/leads/import-template/`),

  downloadLeadImportReport: (batchId) =>
    downloadFile(`/leads/import-report/${batchId}/`),

  reverseLeadImport: (batchId) =>
    api(`/leads/import-reverse/${batchId}/`, {
      method: 'POST',
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
    options = {},
  ) =>
    api(`/users/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: isActive,
        ...options,
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

  roleMatrix: () =>
    api('/roles/matrix/'),

  saveRoleMatrix: (data) =>
    api('/roles/matrix/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

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

  deleteTask: (
    id,
  ) =>
    api(`/tasks/${id}/`, {
      method: 'DELETE',
    }),
}