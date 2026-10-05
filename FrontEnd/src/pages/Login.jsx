import { useState } from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Button from '../components/ui/Button'
import { crmApi } from '../lib/api'

export default function Login({ onAuthenticated }) {
  const navigate = useNavigate()
  const location = useLocation()

  // ---------------------------------------------------------------------------
  // Modes
  // ---------------------------------------------------------------------------
  // login  = normal login
  // request = enter email and request OTP
  // verify = enter OTP
  // reset  = enter new password after successful OTP verification
  // ---------------------------------------------------------------------------
  const [mode, setMode] = useState('login')

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ---------------------------------------------------------------------------
  // Password visibility
  // ---------------------------------------------------------------------------
  const [showPassword, setShowPassword] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ---------------------------------------------------------------------------
  // UI state
  // ---------------------------------------------------------------------------
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // ---------------------------------------------------------------------------
  // Deep-link destination
  // ---------------------------------------------------------------------------
  function getPostLoginDestination() {
    // 1. React Router state
    const stateFrom = location.state?.from

    if (typeof stateFrom === 'string') {
      return stateFrom
    }

    if (
      stateFrom &&
      typeof stateFrom.pathname === 'string'
    ) {
      const search = stateFrom.search || ''
      const hash = stateFrom.hash || ''

      return `${stateFrom.pathname}${search}${hash}`
    }

    // 2. sessionStorage
    try {
      const storedDestination =
        sessionStorage.getItem(
          'litecrm_post_login_redirect',
        )

      if (storedDestination) {
        sessionStorage.removeItem(
          'litecrm_post_login_redirect',
        )

        return storedDestination
      }
    } catch {
      // Ignore sessionStorage errors.
    }

    // 3. Current browser URL
    if (
      location.pathname &&
      location.pathname !== '/login'
    ) {
      const search = location.search || ''
      const hash = location.hash || ''

      return `${location.pathname}${search}${hash}`
    }

    // 4. Dashboard fallback
    return '/'
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function submit(event) {
    event.preventDefault()

    setError('')
    setMessage('')
    setSaving(true)

    try {
      // -----------------------------------------------------------------------
      // NORMAL LOGIN
      // -----------------------------------------------------------------------
      if (mode === 'login') {
        if (!identifier.trim() || !password) {
          throw new Error(
            'Email/mobile number and password are required.',
          )
        }

        const user = await crmApi.login(
          identifier.trim(),
          password,
        )

        // Update application authentication state.
        onAuthenticated(user)

        // Return to the URL the user originally requested.
        const destination =
          getPostLoginDestination()

        navigate(destination, {
          replace: true,
        })

        return
      }

      // -----------------------------------------------------------------------
      // PASSWORD RESET - REQUEST OTP
      // -----------------------------------------------------------------------
      if (mode === 'request') {
        if (!identifier.trim()) {
          throw new Error(
            'Email address is required.',
          )
        }

        // Only email is accepted for password reset.
        const email = identifier.trim()

        const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailPattern.test(email)) {
          throw new Error(
            'Please enter a valid email address.',
          )
        }

        await crmApi.requestPasswordReset(email)

        setMode('verify')

        setMessage(
          'If an account matches, a one-time code has been sent to your email.',
        )

        return
      }

      // -----------------------------------------------------------------------
      // PASSWORD RESET - VERIFY OTP
      // -----------------------------------------------------------------------
      if (mode === 'verify') {
        const otp = code.trim()

        if (!otp) {
          throw new Error(
            'One-time code is required.',
          )
        }

        if (!/^\d{6}$/.test(otp)) {
          throw new Error(
            'Please enter the 6-digit one-time code.',
          )
        }

        await crmApi.verifyPasswordResetCode(
          identifier.trim(),
          otp,
        )

        setMode('reset')

        setMessage(
          'Code verified successfully. You can now create a new password.',
        )

        return
      }

      // -----------------------------------------------------------------------
      // PASSWORD RESET - CREATE NEW PASSWORD
      // -----------------------------------------------------------------------
      if (mode === 'reset') {
        if (!newPassword) {
          throw new Error(
            'New password is required.',
          )
        }

        if (!confirmPassword) {
          throw new Error(
            'Confirm password is required.',
          )
        }

        if (newPassword !== confirmPassword) {
          throw new Error(
            'New password and confirm password must match.',
          )
        }

        await crmApi.confirmPasswordReset(
          identifier.trim(),
          code.trim(),
          newPassword,
        )

        // Return to normal login after successful reset.
        setMode('login')
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setCode('')
        setShowNew(false)
        setShowConfirm(false)

        setMessage(
          'Password reset successfully. You can sign in now.',
        )

        return
      }
    } catch (err) {
      // -----------------------------------------------------------------------
      // OTP verification errors
      // -----------------------------------------------------------------------
      if (mode === 'verify') {
        if (
          err?.status === 400 ||
          err?.status === 401 ||
          err?.status === 404
        ) {
          setError(
            'Invalid OTP. Please enter the correct 6-digit code.',
          )
        } else {
          setError(
            err?.message ||
              'Unable to verify the OTP. Please try again.',
          )
        }

        return
      }

      // -----------------------------------------------------------------------
      // Password reset request errors
      // -----------------------------------------------------------------------
      if (mode === 'request') {
        setError(
          err?.message ||
            'Unable to send the reset code. Please try again.',
        )

        return
      }

      // -----------------------------------------------------------------------
      // Password reset errors
      // -----------------------------------------------------------------------
      if (mode === 'reset') {
        setError(
          err?.message ||
            'Unable to reset the password. Please try again.',
        )

        return
      }

      // -----------------------------------------------------------------------
      // Normal login lockout
      // -----------------------------------------------------------------------
      if (err?.status === 423) {
        setError(
          'Your account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.',
        )

        return
      }

      // -----------------------------------------------------------------------
      // Normal login invalid credentials
      // -----------------------------------------------------------------------
      if (err?.status === 401) {
        setError(
          'Invalid email/mobile number or password.',
        )

        return
      }

      // -----------------------------------------------------------------------
      // General error
      // -----------------------------------------------------------------------
      setError(
        err?.message ||
          'Something went wrong. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Reset everything and go back to login
  // ---------------------------------------------------------------------------
  function backToLogin() {
    setMode('login')
    setError('')
    setMessage('')
    setIdentifier('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setPassword('')
    setShowPassword(false)
    setShowNew(false)
    setShowConfirm(false)
  }

  // ---------------------------------------------------------------------------
  // Start forgot-password flow
  // ---------------------------------------------------------------------------
  function startForgotPassword() {
    setMode('request')
    setError('')
    setMessage('')
    setIdentifier('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div
      className="
        relative
        flex
        min-h-screen
        w-full
        items-center
        justify-center
        overflow-x-hidden
        overflow-y-auto
        bg-gradient-to-br
        from-blue-700
        via-blue-600
        to-blue-500
        px-4
        py-8
        sm:px-6
        lg:px-8
      "
    >
      {/* -----------------------------------------------------------------------
          TOP LEFT BRAND
      ----------------------------------------------------------------------- */}
      <div
        className="
          absolute
          left-5
          top-5
          z-10
          flex
          items-center
          gap-3
          sm:left-8
          sm:top-7
          lg:left-10
          lg:top-8
        "
      >
        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-white
            text-xl
            font-bold
            text-blue-600
            shadow-sm
            sm:h-14
            sm:w-14
          "
        >
          L
        </div>

        <div>
          <div
            className="
              text-lg
              font-bold
              leading-tight
              tracking-tight
              text-white
              sm:text-xl
            "
          >
            LiteCRM
          </div>

          <div
            className="
              mt-0.5
              text-xs
              font-medium
              text-blue-100
              sm:text-sm
            "
          >
            Sales workspace
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          LOGIN / RESET CARD
      ----------------------------------------------------------------------- */}
      <form
        onSubmit={submit}
        className="
          relative
          z-10
          my-12
          w-full
          max-w-[640px]
          rounded-[28px]
          border
          border-white/60
          bg-white
          px-6
          py-8
          shadow-[0_25px_70px_rgba(15,23,42,0.18)]
          sm:px-10
          sm:py-10
          lg:px-12
          lg:py-11
        "
      >
        {/* -------------------------------------------------------------------
            HEADER
        ------------------------------------------------------------------- */}
        <div className="mb-8">
          {/* Lock icon / visual */}
          <div
            className="
              mb-6
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-blue-50
              text-blue-600
              sm:h-[72px]
              sm:w-[72px]
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-8 w-8 sm:h-9 sm:w-9"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="10"
                width="16"
                height="10"
                rx="2"
              />
              <path
                d="M8 10V7a4 4 0 0 1 8 0v3"
              />
              <circle
                cx="12"
                cy="15"
                r="1"
              />
            </svg>
          </div>

          {/* Title */}
          <h1
            className="
              text-3xl
              font-bold
              leading-tight
              tracking-tight
              text-slate-950
              sm:text-4xl
              lg:text-[42px]
            "
          >
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'request'
                ? 'Reset your password'
                : mode === 'verify'
                  ? 'Verify your email'
                  : 'Create a new password'}
          </h1>

          {/* Subtitle */}
          <p
            className="
              mt-3
              max-w-xl
              text-base
              leading-7
              text-slate-500
              sm:text-lg
            "
          >
            {mode === 'login'
              ? 'Sign in to continue to your LiteCRM workspace.'
              : mode === 'request'
                ? 'Enter your registered email address to receive a verification code.'
                : mode === 'verify'
                  ? 'Enter the 6-digit code sent to your registered email address.'
                  : 'Choose a new password for your LiteCRM account.'}
          </p>
        </div>

        {/* -------------------------------------------------------------------
            ERROR MESSAGE
        ------------------------------------------------------------------- */}
        {error ? (
          <div
            className="
              mb-5
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              leading-6
              text-red-700
            "
          >
            {error}
          </div>
        ) : null}

        {/* -------------------------------------------------------------------
            SUCCESS MESSAGE
        ------------------------------------------------------------------- */}
        {message ? (
          <div
            className="
              mb-5
              rounded-xl
              border
              border-green-200
              bg-green-50
              px-4
              py-3
              text-sm
              leading-6
              text-green-700
            "
          >
            {message}
          </div>
        ) : null}

        {/* -------------------------------------------------------------------
            EMAIL / MOBILE
        ------------------------------------------------------------------- */}
        {mode === 'login' || mode === 'request' ? (
          <div>
            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-slate-700
                sm:text-base
              "
            >
              {mode === 'request'
                ? 'Email address'
                : 'Email or mobile number'}
            </label>

            <input
              className="
                h-14
                w-full
                rounded-xl
                border
                border-slate-300
                bg-white
                px-4
                text-base
                text-slate-900
                outline-none
                transition
                placeholder:text-slate-400
                hover:border-slate-400
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
              type={
                mode === 'request'
                  ? 'email'
                  : 'text'
              }
              value={identifier}
              onChange={(e) =>
                setIdentifier(e.target.value)
              }
              placeholder={
                mode === 'request'
                  ? 'name@gmail.com'
                  : 'name@gmail.com or +91 9876543210'
              }
              autoComplete={
                mode === 'request'
                  ? 'email'
                  : 'username'
              }
              required
            />
          </div>
        ) : null}

        {/* -------------------------------------------------------------------
            NORMAL LOGIN PASSWORD
        ------------------------------------------------------------------- */}
        {mode === 'login' ? (
          <div className="mt-6">
            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-slate-700
                sm:text-base
              "
            >
              Password
            </label>

            <div className="relative">
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                className="
                  h-14
                  w-full
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-4
                  pr-12
                  text-base
                  text-slate-900
                  outline-none
                  transition
                  placeholder:text-slate-400
                  hover:border-slate-400
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
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
                  setShowPassword(
                    (value) => !value,
                  )
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  flex
                  h-9
                  w-9
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-50
                  hover:text-slate-600
                "
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Forgot password */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={startForgotPassword}
                className="
                  text-sm
                  font-semibold
                  text-blue-600
                  transition
                  hover:text-blue-700
                  hover:underline
                  sm:text-base
                "
              >
                Forgot password?
              </button>
            </div>
          </div>
        ) : null}

        {/* -------------------------------------------------------------------
            PASSWORD RESET REQUEST
        ------------------------------------------------------------------- */}
        {mode === 'request' ? (
          <p
            className="
              mt-4
              text-sm
              leading-6
              text-slate-500
            "
          >
            Enter your registered email address.
            We will send a one-time code to your
            email.
          </p>
        ) : null}

        {/* -------------------------------------------------------------------
            OTP VERIFICATION
        ------------------------------------------------------------------- */}
        {mode === 'verify' ? (
          <div className="mt-6">
            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-slate-700
                sm:text-base
              "
            >
              One-time code
            </label>

            <input
              className="
                h-14
                w-full
                rounded-xl
                border
                border-slate-300
                bg-white
                px-4
                text-base
                tracking-[0.25em]
                text-slate-900
                outline-none
                transition
                placeholder:text-slate-400
                placeholder:tracking-normal
                hover:border-slate-400
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
              value={code}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6)

                setCode(value)
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit code"
              autoComplete="one-time-code"
              required
            />

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-500
              "
            >
              Enter the 6-digit code sent to your
              registered email address.
            </p>
          </div>
        ) : null}

        {/* -------------------------------------------------------------------
            NEW PASSWORD
        ------------------------------------------------------------------- */}
        {mode === 'reset' ? (
          <div className="mt-6 space-y-5">
            {/* New password */}
            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                  sm:text-base
                "
              >
                New password
              </label>

              <div className="relative">
                <input
                  type={
                    showNew
                      ? 'text'
                      : 'password'
                  }
                  className="
                    h-14
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-4
                    pr-12
                    text-base
                    text-slate-900
                    outline-none
                    transition
                    hover:border-slate-400
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value,
                    )
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
                    setShowNew(
                      (value) => !value,
                    )
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    flex
                    h-9
                    w-9
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    transition
                    hover:bg-slate-50
                    hover:text-slate-600
                  "
                >
                  {showNew ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                  sm:text-base
                "
              >
                Confirm password
              </label>

              <div className="relative">
                <input
                  type={
                    showConfirm
                      ? 'text'
                      : 'password'
                  }
                  className="
                    h-14
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-4
                    pr-12
                    text-base
                    text-slate-900
                    outline-none
                    transition
                    hover:border-slate-400
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value,
                    )
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
                      (value) => !value,
                    )
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    flex
                    h-9
                    w-9
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    transition
                    hover:bg-slate-50
                    hover:text-slate-600
                  "
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* -------------------------------------------------------------------
            SUBMIT BUTTON
        ------------------------------------------------------------------- */}
        <Button
          type="submit"
          disabled={saving}
          className="
            mt-7
            h-14
            w-full
            rounded-xl
            text-base
            font-semibold
            shadow-sm
            transition
            sm:text-lg
          "
        >
          {saving
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'request'
                ? 'Send reset code'
                : mode === 'verify'
                  ? 'Verify code'
                  : 'Reset password'}
        </Button>

        {/* -------------------------------------------------------------------
            BACK TO LOGIN
        ------------------------------------------------------------------- */}
        {mode !== 'login' ? (
          <button
            type="button"
            onClick={backToLogin}
            className="
              mt-4
              w-full
              text-center
              text-sm
              font-medium
              text-slate-500
              transition
              hover:text-slate-800
            "
          >
            Back to sign in
          </button>
        ) : null}
      </form>

      {/* -----------------------------------------------------------------------
          BOTTOM CENTER FOOTER
      ----------------------------------------------------------------------- */}
      <div
        className="
          absolute
          bottom-4
          left-0
          right-0
          z-10
          text-center
          text-sm
          font-medium
          text-blue-100
          sm:bottom-5
        "
      >
        Secure CRM workspace
      </div>
    </div>
  )
}

