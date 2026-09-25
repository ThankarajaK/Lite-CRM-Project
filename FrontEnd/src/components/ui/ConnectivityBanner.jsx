import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { crmApi } from '../../lib/api'

export default function ConnectivityBanner() {
  const [online, setOnline] = useState(true)
  const [checking, setChecking] = useState(false)
  async function heartbeat() {
    setChecking(true)
    try { await crmApi.me(); setOnline(true) } catch (err) { if (!err.status || err.status >= 500) setOnline(false) }
    finally { setChecking(false) }
  }
  useEffect(() => { heartbeat(); const timer = setInterval(heartbeat, 30000); return () => clearInterval(timer) }, [])
  if (online) return null
  return <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"><div className="mx-auto flex max-w-[1400px] items-center gap-2"><AlertTriangle className="h-4 w-4" /><span>Connection to LiteCRM is unavailable. Writes are not queued offline.</span><button type="button" onClick={heartbeat} disabled={checking} className="ml-auto inline-flex items-center gap-1 font-medium hover:underline"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div></div>
}
