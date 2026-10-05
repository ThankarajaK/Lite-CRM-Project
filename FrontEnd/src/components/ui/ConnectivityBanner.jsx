import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { crmApi } from '../../lib/api'

export default function ConnectivityBanner() {
  const [online, setOnline] = useState(true)
  const [checking, setChecking] = useState(false)

  async function heartbeat() {
    setChecking(true)

    try {
      await crmApi.me()
      setOnline(true)
    } catch (err) {
      if (!err.status || err.status >= 500) {
        setOnline(false)
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    heartbeat()

    const timer = setInterval(heartbeat, 30000)

    return () => clearInterval(timer)
  }, [])

  if (online) return null

  return (
    <div
      className="
        w-full
        border-b
        border-amber-200
        bg-amber-50
        px-3
        py-2.5
        sm:px-4
      "
      role="alert"
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-[1400px]
          flex-col
          gap-2
          sm:flex-row
          sm:items-center
          sm:gap-3
        "
      >
        <div className="flex min-w-0 items-start gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />

          <span className="min-w-0 text-sm leading-5 text-amber-900">
            Connection to LiteCRM is unavailable. Writes are not queued offline.
          </span>
        </div>

        <button
          type="button"
          onClick={heartbeat}
          disabled={checking}
          className="
            inline-flex
            min-h-8
            shrink-0
            items-center
            justify-center
            gap-1.5
            self-start
            rounded-md
            px-2
            text-sm
            font-medium
            text-amber-900
            transition-colors
            hover:bg-amber-100
            hover:underline
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-amber-500
            focus-visible:ring-offset-1
            disabled:cursor-not-allowed
            disabled:opacity-60
            sm:ml-auto
            sm:self-auto
          "
          aria-label={checking ? 'Checking connection' : 'Retry connection'}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {checking ? 'Checking...' : 'Retry'}
        </button>
      </div>
    </div>
  )
}