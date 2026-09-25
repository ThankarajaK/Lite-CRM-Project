import { useEffect, useState } from 'react'
import {
  Building2,
  Globe2,
  Shield,
  Monitor,
  LogOut,
  Eye,
  EyeOff,
  RefreshCw,
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


// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {label}
        </p>

        <p className="mt-0.5 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}


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


function getUserRole(user) {
  if (!user) return ''

  if (typeof user.role === 'string') {
    return user.role
  }

  if (user.role?.name) {
    return user.role.name
  }

  return ''
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




// -----------------------------------------------------------------------------
// Settings Page
// -----------------------------------------------------------------------------

export default function Settings() {
  const toast = useToast()
  const { user } = useData()

  const displayName =
    getUserDisplayName(user)

  const roleName =
    getUserRole(user)


  const [profile, setProfile] =
    useState({
      name: displayName,
      email:
        user?.email ||
        user?.username ||
        '',
      role: roleName,
      company: 'LiteCRM',
      timezone: 'Asia/Kolkata',
      currency: 'USD',
    })


  const [passwords, setPasswords] =
    useState({
      current: '',
      next: '',
      confirm: '',
    })


  const [showCurrent, setShowCurrent] =
    useState(false)

  const [showNext, setShowNext] =
    useState(false)

  const [showConfirm, setShowConfirm] =
    useState(false)


  const [sessions, setSessions] =
    useState([])

  const [sessionsLoading, setSessionsLoading] =
    useState(false)

  const [passwordSaving, setPasswordSaving] =
    useState(false)

  const [sessionSaving, setSessionSaving] =
    useState(false)


  const [prefs, setPrefs] =
    useState({
      emailDigest: true,
      dealAlerts: true,
      taskReminders: false,
    })


  useEffect(() => {
    setProfile((current) => ({
      ...current,
      name: displayName,
      email:
        user?.email ||
        user?.username ||
        '',
      role: roleName,
    }))
  }, [
    displayName,
    roleName,
    user,
  ])


  useEffect(() => {
    loadSessions()
  }, [])


  async function loadSessions() {
    setSessionsLoading(true)

    try {
      const response =
        await crmApi.sessions()

      if (Array.isArray(response)) {
        setSessions(response)
      } else if (
        Array.isArray(response?.results)
      ) {
        setSessions(
          response.results
        )
      } else {
        setSessions([])
      }
    } catch (error) {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }


  async function changePassword() {
    if (!passwords.current) {
      toast.error(
        'Password change failed',
        'Please enter your current password.'
      )

      return
    }


    if (!passwords.next) {
      toast.error(
        'Password change failed',
        'Please enter a new password.'
      )

      return
    }


    const passwordError =
      validatePassword(passwords.next)

    if (passwordError) {
      toast.error(
        'Password change failed',
        passwordError
      )

      return
    }


    if (
      passwords.next !==
      passwords.confirm
    ) {
      toast.error(
        'Password change failed',
        'New password and confirm password must match.'
      )

      return
    }


    if (
      passwords.current ===
      passwords.next
    ) {
      toast.error(
        'Password change failed',
        'New password must be different from your current password.'
      )

      return
    }


    setPasswordSaving(true)

    try {
      await crmApi.changePassword(
        passwords.current,
        passwords.next
      )

      toast.success(
        'Password changed',
        'Your password was changed successfully.'
      )

      setPasswords({
        current: '',
        next: '',
        confirm: '',
      })

      setShowCurrent(false)
      setShowNext(false)
      setShowConfirm(false)

      await loadSessions()
    } catch (error) {
      toast.error(
        'Password change failed',
        error?.message ||
          'Unable to change your password.'
      )
    } finally {
      setPasswordSaving(false)
    }
  }


  async function revokeAll() {
    setSessionSaving(true)

    try {
      await crmApi.revokeAllSessions()

      toast.success(
        'Sessions signed out',
        'All other active sessions have been signed out.'
      )

      await loadSessions()
    } catch (error) {
      toast.error(
        'Could not sign out',
        error?.message ||
          'Unable to sign out active sessions.'
      )
    } finally {
      setSessionSaving(false)
    }
  }


  function saveProfile() {
    toast.success(
      'Settings saved',
      'Profile preferences are currently stored locally in this screen.'
    )
  }


  function cancelProfileChanges() {
    setProfile({
      name: displayName,
      email:
        user?.email ||
        user?.username ||
        '',
      role: roleName,
      company: 'LiteCRM',
      timezone: 'Asia/Kolkata',
      currency: 'USD',
    })
  }


  return (
    <div className="space-y-5">

      <PageHeader
        title="Settings"
        subtitle="Workspace and account preferences"
      />


      {/* =========================================================
          SECURITY
      ========================================================= */}

      <Card>

        <CardHeader
          title="Security"
          subtitle="Manage your password and active sessions"
        />


        <div className="grid gap-6 p-5 lg:grid-cols-2">

          {/* CHANGE PASSWORD */}

          <div className="space-y-4">

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Change password
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Use a strong password to protect your account.
              </p>
            </div>


            <Field
              label="Current password"
              htmlFor="current-password"
            >
              <div className="relative">

                <Input
                  id="current-password"
                  type={
                    showCurrent
                      ? 'text'
                      : 'password'
                  }
                  value={passwords.current}
                  autoComplete="current-password"
                  onChange={(event) =>
                    setPasswords(
                      (current) => ({
                        ...current,
                        current:
                          event.target.value,
                      })
                    )
                  }
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrent(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showCurrent
                      ? 'Hide current password'
                      : 'Show current password'
                  }
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>
            </Field>


            <Field
              label="New password"
              htmlFor="new-password"
            >
              <div className="relative">

                <Input
                  id="new-password"
                  type={
                    showNext
                      ? 'text'
                      : 'password'
                  }
                  value={passwords.next}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswords(
                      (current) => ({
                        ...current,
                        next:
                          event.target.value,
                      })
                    )
                  }
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNext(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showNext
                      ? 'Hide new password'
                      : 'Show new password'
                  }
                >
                  {showNext ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>
            </Field>


            <Field
              label="Confirm password"
              htmlFor="confirm-password"
            >
              <div className="relative">

                <Input
                  id="confirm-password"
                  type={
                    showConfirm
                      ? 'text'
                      : 'password'
                  }
                  value={passwords.confirm}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswords(
                      (current) => ({
                        ...current,
                        confirm:
                          event.target.value,
                      })
                    )
                  }
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirm(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showConfirm
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>
            </Field>


            <div className="rounded-lg bg-slate-50 p-3">

              <p className="text-xs font-medium text-slate-700">
                Password requirements
              </p>

              <ul className="mt-2 space-y-1 text-xs text-slate-500">

                <li>
                  • Minimum 8 characters
                </li>

                <li>
                  • At least one uppercase character
                </li>

                <li>
                  • At least one special character
                </li>

              </ul>

            </div>


            <Button
              type="button"
              onClick={changePassword}
              disabled={
                passwordSaving ||
                !passwords.current ||
                !passwords.next ||
                !passwords.confirm
              }
            >
              {passwordSaving
                ? 'Changing…'
                : 'Change password'}
            </Button>

          </div>


          {/* ACTIVE SESSIONS */}

          <div>

            <div className="mb-3 flex items-center justify-between gap-3">

              <div>

                <h3 className="text-sm font-semibold text-slate-900">
                  Active sessions
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Devices currently signed in to your account.
                </p>

              </div>


              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadSessions}
                disabled={sessionsLoading}
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${
                    sessionsLoading
                      ? 'animate-spin'
                      : ''
                  }`}
                />

                Refresh
              </Button>

            </div>


            {sessionsLoading ? (
              <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                Loading active sessions…
              </div>
            ) : sessions.length > 0 ? (

              <ul className="space-y-2">

                {sessions.map((session) => (

                  <li
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >

                    <Monitor className="h-4 w-4 shrink-0 text-slate-400" />

                    <div className="min-w-0 flex-1">

                      <p className="text-sm text-slate-900">

                        {session.browser ||
                          'Browser'}

                        {session.current && (
                          <span className="ml-1 text-brand-600">
                            · Current
                          </span>
                        )}

                      </p>


                      <p className="text-xs text-slate-500">
                        {session.ip_address ||
                          'Unknown IP'}
                      </p>


                      {session.last_seen_at && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Last seen{' '}
                          {session.last_seen_at}
                        </p>
                      )}

                    </div>

                  </li>

                ))}

              </ul>

            ) : (

              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center">

                <Monitor className="mx-auto h-6 w-6 text-slate-300" />

                <p className="mt-2 text-sm text-slate-500">
                  No active session information available.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Click Refresh to check again.
                </p>

              </div>

            )}


            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-4"
              disabled={sessionSaving}
              onClick={revokeAll}
            >
              <LogOut className="mr-1 h-4 w-4" />

              {sessionSaving
                ? 'Signing out…'
                : 'Sign out of all devices'}
            </Button>

          </div>

        </div>

      </Card>

      {/* =========================================================
          PROFILE + WORKSPACE
      ========================================================= */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* PROFILE */}

        <Card className="lg:col-span-2">

          <CardHeader
            title="Profile"
            subtitle="How you appear to your team"
          />


          <div className="space-y-5 p-5">

            <div className="flex items-center gap-4">

              <Avatar
                name={
                  profile.name ||
                  profile.email
                }
                size="xl"
              />

              <div className="min-w-0">

                <p className="truncate text-sm font-medium text-slate-900">
                  {profile.name ||
                    'User'}
                </p>

                <p className="text-sm text-slate-500">
                  {profile.role ||
                    'No role assigned'}
                </p>

              </div>

            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <Field
                label="Full name"
                htmlFor="profile-name"
              >
                <Input
                  id="profile-name"
                  value={profile.name}
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,
                        name:
                          event.target.value,
                      })
                    )
                  }
                />
              </Field>


              <Field
                label="Email"
                htmlFor="profile-email"
              >
                <Input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  readOnly
                />
              </Field>


              <Field
                label="Role"
                htmlFor="profile-role"
              >
                <Input
                  id="profile-role"
                  value={profile.role}
                  readOnly
                />
              </Field>


              <Field
                label="Company"
                htmlFor="profile-company"
              >
                <Input
                  id="profile-company"
                  value={profile.company}
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,
                        company:
                          event.target.value,
                      })
                    )
                  }
                />
              </Field>


              <Field
                label="Time zone"
                htmlFor="profile-timezone"
              >
                <Select
                  id="profile-timezone"
                  value={profile.timezone}
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,
                        timezone:
                          event.target.value,
                      })
                    )
                  }
                  options={[
                    'Asia/Kolkata',
                    'Europe/Stockholm',
                    'Europe/London',
                    'America/New_York',
                  ]}
                />
              </Field>


              <Field
                label="Currency"
                htmlFor="profile-currency"
              >
                <Select
                  id="profile-currency"
                  value={profile.currency}
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,
                        currency:
                          event.target.value,
                      })
                    )
                  }
                  options={[
                    'USD',
                    'EUR',
                    'GBP',
                    'INR',
                    'SEK',
                  ]}
                />
              </Field>

            </div>


            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">

              <Button
                type="button"
                variant="secondary"
                onClick={cancelProfileChanges}
              >
                Cancel
              </Button>


              <Button
                type="button"
                onClick={saveProfile}
              >
                Save changes
              </Button>

            </div>

          </div>

        </Card>


        {/* WORKSPACE */}

        <Card>

          <CardHeader title="Workspace" />

          <div className="divide-y divide-slate-100 px-5">

            <div className="flex items-center gap-3 py-4">

              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />

              <div className="min-w-0">

                <p className="truncate text-sm text-slate-900">
                  {profile.company}
                </p>

                <p className="text-xs text-slate-500">
                  Workspace name
                </p>

              </div>

            </div>


            <div className="flex items-center gap-3 py-4">

              <Globe2 className="h-4 w-4 shrink-0 text-slate-400" />

              <div className="min-w-0">

                <p className="truncate text-sm text-slate-900">
                  {profile.timezone}
                </p>

                <p className="text-xs text-slate-500">
                  Default time zone
                </p>

              </div>

            </div>


            <div className="flex items-center gap-3 py-4">

              <Shield className="h-4 w-4 shrink-0 text-slate-400" />

              <div className="min-w-0 flex-1">

                <p className="text-sm text-slate-900">
                  Plan
                </p>

                <p className="text-xs text-slate-500">
                  LiteCRM workspace
                </p>

              </div>

              <Badge tone="blue">
                Demo
              </Badge>

            </div>

          </div>

        </Card>

      </div>


      {/* =========================================================
          NOTIFICATIONS
      ========================================================= */}

      <Card>

        <CardHeader
          title="Notifications"
          subtitle="Choose which workspace notifications you want to receive"
        />


        <div className="divide-y divide-slate-100 px-5 pb-2">

          <Toggle
            label="Weekly email digest"
            description="A summary of pipeline movement."
            checked={prefs.emailDigest}
            onChange={(value) =>
              setPrefs((current) => ({
                ...current,
                emailDigest: value,
              }))
            }
          />


          <Toggle
            label="Deal alerts"
            description="When a deal moves stage."
            checked={prefs.dealAlerts}
            onChange={(value) =>
              setPrefs((current) => ({
                ...current,
                dealAlerts: value,
              }))
            }
          />


          <Toggle
            label="Task reminders"
            description="Before a task falls due."
            checked={prefs.taskReminders}
            onChange={(value) =>
              setPrefs((current) => ({
                ...current,
                taskReminders: value,
              }))
            }
          />

        </div>

      </Card>

    </div>
  )
}