import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Button from '../components/ui/Button'
import { crmApi } from '../lib/api'

export default function Login({ onAuthenticated }) {
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      // -----------------------------------------
      // LOGIN
      // -----------------------------------------
      if (mode === 'login') {
        if (!identifier.trim() || !password) {
          throw new Error(
            'Email/mobile number and password are required.'
          )
        }

        const user = await crmApi.login(identifier, password)

        /*
         * Keep the existing authentication flow.
         * onAuthenticated updates the application auth state.
         */
        onAuthenticated(user)

        /*
         * After successful authentication,
         * always take the user to the Dashboard.
         *
         * Dashboard route:
         * /
         */
        navigate('/', { replace: true })

        return
      }

      // -----------------------------------------
      // REQUEST PASSWORD RESET
      // -----------------------------------------
      if (mode === 'request') {
        await crmApi.requestPasswordReset(identifier)

        setMode('confirm')

        setMessage(
          'If an account matches, a one-time code has been sent.'
        )

        return
      }

      // -----------------------------------------
      // CONFIRM PASSWORD RESET
      // -----------------------------------------
      if (mode === 'confirm') {
        if (!code.trim()) {
          throw new Error('One-time code is required.')
        }

        if (!newPassword) {
          throw new Error('New password is required.')
        }

        if (newPassword !== confirmPassword) {
          throw new Error(
            'New password and confirm password must match.'
          )
        }

        await crmApi.confirmPasswordReset(
          identifier,
          code,
          newPassword
        )

        setMode('login')
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setCode('')

        setMessage(
          'Password reset successfully. You can sign in now.'
        )
      }
    } catch (err) {
      setError(
        err?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* -----------------------------------------
            HEADER
        ----------------------------------------- */}
        <div className="mb-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">
            L
          </div>

          <h1 className="text-xl font-semibold text-slate-900">
            LiteCRM
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Secure CRM workspace
          </p>
        </div>

        {/* -----------------------------------------
            ERROR
        ----------------------------------------- */}
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* -----------------------------------------
            SUCCESS MESSAGE
        ----------------------------------------- */}
        {message ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {/* -----------------------------------------
            EMAIL / MOBILE
        ----------------------------------------- */}
        {mode !== 'confirm' ? (
          <>
            <label className="field-label">
              Email or mobile number
            </label>

            <input
              className="field-input"
              value={identifier}
              onChange={(e) =>
                setIdentifier(e.target.value)
              }
              placeholder="name@gmail.com or +91 9876543210"
              autoComplete="username"
              required
            />
          </>
        ) : null}

        {/* -----------------------------------------
            LOGIN PASSWORD
        ----------------------------------------- */}
        {mode === 'login' ? (
          <div className="mt-4">
            <label className="field-label">
              Password
            </label>

            <div className="relative">
              <input
                type={
                  showPassword ? 'text' : 'password'
                }
                className="field-input pr-10"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode('request')
                setError('')
                setMessage('')
              }}
              className="mt-3 text-sm font-medium text-brand-600"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        {/* -----------------------------------------
            PASSWORD RESET REQUEST
        ----------------------------------------- */}
        {mode === 'request' ? (
          <p className="mt-4 text-sm text-slate-500">
            Enter your registered email or Indian mobile
            number. We will respond generically whether the
            account exists.
          </p>
        ) : null}

        {/* -----------------------------------------
            PASSWORD RESET CONFIRM
        ----------------------------------------- */}
        {mode === 'confirm' ? (
          <div className="mt-4 space-y-4">
            {/* OTP */}
            <div>
              <label className="field-label">
                One-time code
              </label>

              <input
                className="field-input"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value)
                }
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>

            {/* NEW PASSWORD */}
            <div>
              <label className="field-label">
                New password
              </label>

              <div className="relative">
                <input
                  type={
                    showNew ? 'text' : 'password'
                  }
                  className="field-input pr-10"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showNew
                      ? 'Hide new password'
                      : 'Show new password'
                  }
                  onClick={() =>
                    setShowNew((value) => !value)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="field-label">
                Confirm password
              </label>

              <div className="relative">
                <input
                  type={
                    showConfirm
                      ? 'text'
                      : 'password'
                  }
                  className="field-input pr-10"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showConfirm
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  onClick={() =>
                    setShowConfirm(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* -----------------------------------------
            SUBMIT
        ----------------------------------------- */}
        <Button
          type="submit"
          disabled={saving}
          className="mt-6 w-full"
        >
          {saving
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'request'
                ? 'Send reset code'
                : 'Reset password'}
        </Button>

        {/* -----------------------------------------
            BACK TO LOGIN
        ----------------------------------------- */}
        {mode !== 'login' ? (
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
              setMessage('')
              setCode('')
              setNewPassword('')
              setConfirmPassword('')
            }}
            className="mt-3 w-full text-sm text-slate-500 hover:text-slate-800"
          >
            Back to sign in
          </button>
        ) : null}
      </form>
    </div>
  )
}