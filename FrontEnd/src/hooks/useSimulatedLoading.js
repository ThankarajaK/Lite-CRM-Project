import { useEffect, useState } from 'react'

/**
 * Prototype-only helper: shows skeleton placeholders for a moment when a
 * screen first mounts, so the demo feels like a real app loading data.
 * There is no network request behind it.
 */
export function useSimulatedLoading(delay = 450) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  return loading
}
