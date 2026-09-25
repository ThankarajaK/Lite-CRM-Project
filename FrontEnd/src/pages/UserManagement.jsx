import { useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
} from 'lucide-react'

import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import { Field, Input, Select } from '../components/ui/FormField'

import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import { crmApi } from '../lib/api'

function getUserDisplayName(user) {
  if (!user) return ''

  if (user.name) return user.name

  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (fullName) return fullName

  return user.username || user.email || ''
}



function getRoleKey(user) {
  if (!user) return ''

  if (typeof user.role === 'string') {
    return user.role
  }

  if (user.role?.key) {
    return user.role.key
  }

  if (user.role?.name) {
    return user.role.name
  }

  return user.role_key || user.role_name || ''
}


function isAdminUser(user) {
  const role = getRoleKey(user)
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  return role === 'admin' || role === 'administrator'
}


function validatePassword(password) {
  if (!password) {
    return 'New password is required.'
  }

  if (password.length < 8) {
    return 'Password must contain at least 8 characters.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase character.'
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.'
  }

  return ''
}


function normalizeListResponse(response) {
  if (Array.isArray(response)) return response

  if (Array.isArray(response?.results)) {
    return response.results
  }

  return []
}


const EMPTY_USER_FORM = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  mobile: '',
  role: 'salesperson',
  password: '',
}


export default function UserManagement() {
  const { user: currentUser } = useData()
  const toast = useToast()

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [showPasswordFor, setShowPasswordFor] = useState(null)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false)

  const [passwordValue, setPasswordValue] = useState('')

  const [form, setForm] = useState(EMPTY_USER_FORM)


  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        crmApi.users(),
        crmApi.roles(),
      ])

      setUsers(normalizeListResponse(usersResponse))
      setRoles(normalizeListResponse(rolesResponse))
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Unable to load users.'
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (isAdminUser(currentUser)) {
      loadUsers()
    } else {
      setLoading(false)
    }
  }, [currentUser])


  const roleOptions = roles.length
    ? roles.map((role) => ({
        value: role.key || role.name,
        label: role.name || role.key,
      }))
    : [
        {
          value: 'admin',
          label: 'Admin',
        },
        {
          value: 'sales_manager',
          label: 'Sales Manager',
        },
        {
          value: 'salesperson',
          label: 'Salesperson',
        },
      ]


  function resetForm() {
    setForm({
      ...EMPTY_USER_FORM,
    })

    setEditingUser(null)
    setShowForm(false)

    setShowPasswordFor(null)
    setShowAdminPassword(false)
    setShowTemporaryPassword(false)

    setPasswordValue('')
  }


  function startCreate() {
    setEditingUser(null)

    setForm({
      ...EMPTY_USER_FORM,
    })

    setShowForm(true)

    setShowPasswordFor(null)
    setShowAdminPassword(false)
    setShowTemporaryPassword(false)

    setPasswordValue('')
  }


  function startEdit(target) {
    setShowPasswordFor(null)
    setShowAdminPassword(false)
    setShowTemporaryPassword(false)
    setPasswordValue('')

    setEditingUser(target)

    setForm({
      username: target.username || '',
      email: target.email || '',
      first_name: target.first_name || '',
      last_name: target.last_name || '',
      mobile: target.mobile || '',
      role: getRoleKey(target) || 'salesperson',
      password: '',
    })

    setShowForm(true)
  }


  async function saveUser() {
    if (!form.email.trim()) {
      toast.error(
        'User could not be saved',
        'Email is required.'
      )

      return
    }

    if (!editingUser && !form.username.trim()) {
      toast.error(
        'User could not be created',
        'Username is required.'
      )

      return
    }

    if (!editingUser && !form.password) {
      toast.error(
        'User could not be created',
        'Password is required.'
      )

      return
    }

    if (!editingUser) {
      const passwordError = validatePassword(form.password)

      if (passwordError) {
        toast.error(
          'User could not be created',
          passwordError
        )

        return
      }
    }

    setSaving(true)

    try {
      if (editingUser) {
        await crmApi.updateUser(
          editingUser.id,
          {
            email: form.email.trim(),
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            mobile: form.mobile.trim(),
          }
        )

        if (
          form.role !==
          getRoleKey(editingUser)
        ) {
          await crmApi.changeUserRole(
            editingUser.id,
            form.role
          )
        }

        toast.success(
          'User updated',
          'The user details were updated successfully.'
        )
      } else {
        await crmApi.createUser({
          username: form.username.trim(),
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          mobile: form.mobile.trim(),
          role: form.role,
          password: form.password,
        })

        toast.success(
          'User created',
          'The new user was created successfully.'
        )
      }

      resetForm()
      await loadUsers()
    } catch (requestError) {
      toast.error(
        editingUser
          ? 'User update failed'
          : 'User creation failed',
        requestError?.message ||
          'Unable to save the user.'
      )
    } finally {
      setSaving(false)
    }
  }


  async function toggleStatus(target) {
    if (target.id === currentUser?.id) {
      toast.error(
        'Action not allowed',
        'You cannot deactivate your own account.'
      )

      return
    }

    setActionId(target.id)

    try {
      await crmApi.changeUserStatus(
        target.id,
        !target.is_active
      )

      toast.success(
        target.is_active
          ? 'User deactivated'
          : 'User activated',
        `${getUserDisplayName(target)} is now ${
          target.is_active
            ? 'inactive'
            : 'active'
        }.`
      )

      await loadUsers()
    } catch (requestError) {
      toast.error(
        'Status update failed',
        requestError?.message ||
          'Unable to update the user status.'
      )
    } finally {
      setActionId(null)
    }
  }


  async function savePassword(target) {
    const passwordError =
      validatePassword(passwordValue)

    if (passwordError) {
      toast.error(
        'Password update failed',
        passwordError
      )

      return
    }

    setActionId(target.id)

    try {
      await crmApi.changeUserPassword(
        target.id,
        passwordValue
      )

      toast.success(
        'Password changed',
        `The password for ${getUserDisplayName(
          target
        )} was changed successfully.`
      )

      setPasswordValue('')
      setShowPasswordFor(null)
      setShowAdminPassword(false)
    } catch (requestError) {
      toast.error(
        'Password update failed',
        requestError?.message ||
          "Unable to change the user's password."
      )
    } finally {
      setActionId(null)
    }
  }


  if (!isAdminUser(currentUser)) {
    return null
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create and manage Admin, Sales Manager and Salesperson accounts"
      />

      <Card>
      <CardHeader
        title="User Management"
        subtitle="Create and manage Admin, Sales Manager and Salesperson accounts"
      />

      <div className="p-5">

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />

              <h3 className="text-sm font-semibold text-slate-900">
                Workspace users
              </h3>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Only administrators can create users, change roles,
              manage access, and reset another user's password.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={startCreate}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Create user
          </Button>
        </div>


        {showForm && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingUser
                    ? 'Edit user'
                    : 'Create user'}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {editingUser
                    ? 'Update the account details and role.'
                    : 'Create a new CRM user and assign a role.'}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <Field
                label="Username"
                htmlFor="managed-username"
              >
                <Input
                  id="managed-username"
                  value={form.username}
                  disabled={Boolean(editingUser)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username:
                        event.target.value,
                    }))
                  }
                  placeholder="Username"
                />
              </Field>


              <Field
                label="Email"
                htmlFor="managed-email"
              >
                <Input
                  id="managed-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email:
                        event.target.value,
                    }))
                  }
                  placeholder="name@gmail.com"
                />
              </Field>


              <Field
                label="Mobile"
                htmlFor="managed-mobile"
              >
                <Input
                  id="managed-mobile"
                  value={form.mobile}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mobile:
                        event.target.value,
                    }))
                  }
                  placeholder="+91 9876543210"
                />
              </Field>


              <Field
                label="First name"
                htmlFor="managed-first-name"
              >
                <Input
                  id="managed-first-name"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      first_name:
                        event.target.value,
                    }))
                  }
                />
              </Field>


              <Field
                label="Last name"
                htmlFor="managed-last-name"
              >
                <Input
                  id="managed-last-name"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      last_name:
                        event.target.value,
                    }))
                  }
                />
              </Field>


              <Field
                label="Role"
                htmlFor="managed-role"
              >
                <Select
                  id="managed-role"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role:
                        event.target.value,
                    }))
                  }
                  options={roleOptions}
                />
              </Field>


              {!editingUser && (
                <Field
                  label="Temporary password"
                  htmlFor="managed-password"
                >
                  <div className="relative">
                    <Input
                      id="managed-password"
                      type={
                        showTemporaryPassword
                          ? 'text'
                          : 'password'
                      }
                      value={form.password}
                      autoComplete="new-password"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password:
                            event.target.value,
                        }))
                      }
                      placeholder="Minimum 8 characters"
                      className="pr-10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowTemporaryPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                      aria-label={
                        showTemporaryPassword
                          ? 'Hide temporary password'
                          : 'Show temporary password'
                      }
                    >
                      {showTemporaryPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>
              )}

            </div>


            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={saveUser}
                disabled={saving}
              >
                {saving
                  ? 'Saving…'
                  : editingUser
                    ? 'Save user'
                    : 'Create user'}
              </Button>
            </div>

          </div>
        )}


        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}

            <button
              type="button"
              onClick={loadUsers}
              className="ml-2 font-medium underline"
            >
              Try again
            </button>
          </div>
        )}


        {loading ? (
          <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <Users className="mx-auto h-7 w-7 text-slate-300" />

            <p className="mt-2 text-sm text-slate-500">
              No users were found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">

            <table className="min-w-full divide-y divide-slate-200 text-sm">

              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    User
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Contact
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Role
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>


              <tbody className="divide-y divide-slate-100 bg-white">

                {users.map((target) => {
                  const targetRole =
                    getRoleKey(target)

                  const busy =
                    actionId === target.id

                  const isCurrentUser =
                    target.id === currentUser?.id

                  const passwordPanelOpen =
                    showPasswordFor === target.id

                  return (
                    <tr key={target.id}>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={getUserDisplayName(target)}
                            size="sm"
                          />

                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {getUserDisplayName(target)}

                              {isCurrentUser && (
                                <span className="ml-1 text-xs font-normal text-brand-600">
                                  (You)
                                </span>
                              )}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {target.username ||
                                'No username'}
                            </p>
                          </div>
                        </div>
                      </td>


                      <td className="px-4 py-3">
                        <p className="text-slate-700">
                          {target.email || '—'}
                        </p>

                        <p className="text-xs text-slate-400">
                          {target.mobile ||
                            'No mobile'}
                        </p>
                      </td>


                      <td className="px-4 py-3">
                        <Badge tone="blue">
                          {target.role_name ||
                            target.role?.name ||
                            targetRole ||
                            'No role'}
                        </Badge>
                      </td>


                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            target.is_active
                              ? 'green'
                              : 'slate'
                          }
                        >
                          {target.is_active
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>
                      </td>


                      <td className="px-4 py-3">

                        <div className="flex flex-wrap justify-end gap-2">

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              startEdit(target)
                            }
                            disabled={busy}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>


                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const opening =
                                showPasswordFor !==
                                target.id

                              setShowPasswordFor(
                                opening
                                  ? target.id
                                  : null
                              )

                              setPasswordValue('')
                              setShowAdminPassword(false)

                              if (opening) {
                                setShowForm(false)
                                setEditingUser(null)
                              }
                            }}
                            disabled={busy}
                          >
                            <KeyRound className="mr-1 h-3.5 w-3.5" />
                            Password
                          </Button>


                          <Button
                            type="button"
                            variant={
                              target.is_active
                                ? 'danger'
                                : 'secondary'
                            }
                            size="sm"
                            onClick={() =>
                              toggleStatus(target)
                            }
                            disabled={
                              busy ||
                              isCurrentUser
                            }
                          >
                            {target.is_active ? (
                              <UserX className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="mr-1 h-3.5 w-3.5" />
                            )}

                            {target.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                          </Button>

                        </div>


                        {passwordPanelOpen && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">

                              <div className="min-w-0 flex-1">

                                <Field
                                  label="New password"
                                  htmlFor={`admin-password-${target.id}`}
                                >
                                  <div className="relative">

                                    <Input
                                      id={`admin-password-${target.id}`}
                                      type={
                                        showAdminPassword
                                          ? 'text'
                                          : 'password'
                                      }
                                      value={passwordValue}
                                      autoComplete="new-password"
                                      onChange={(event) =>
                                        setPasswordValue(
                                          event.target.value
                                        )
                                      }
                                      placeholder="Minimum 8 characters"
                                      className="pr-10"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowAdminPassword(
                                          (value) =>
                                            !value
                                        )
                                      }
                                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                                      aria-label={
                                        showAdminPassword
                                          ? 'Hide new password'
                                          : 'Show new password'
                                      }
                                    >
                                      {showAdminPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>

                                  </div>
                                </Field>

                              </div>


                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  savePassword(target)
                                }
                                disabled={
                                  busy ||
                                  !passwordValue
                                }
                              >
                                {busy
                                  ? 'Saving…'
                                  : 'Set password'}
                              </Button>

                            </div>


                            <p className="mt-2 text-xs text-slate-500">
                              Minimum 8 characters,
                              including at least one
                              uppercase character and
                              one special character.
                            </p>

                          </div>
                        )}

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>
    </Card>
      </div>
    )
}


