import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ToastContainer from '../components/ui/Toast'

const ToastContext = createContext(null)

let toastId = 0

/**
 * Minimal toast system: `useToast()` returns a `toast` helper with
 * `.success()`, `.error()` and `.info()` variants. Toasts auto-dismiss.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (message, variant = 'success', description = '') => {
      toastId += 1
      const id = toastId
      setToasts((current) => [...current, { id, message, description, variant }])
      window.setTimeout(() => dismiss(id), 3600)
    },
    [dismiss]
  )

  const toast = useMemo(
    () => ({
      success: (message, description) => push(message, 'success', description),
      error: (message, description) => push(message, 'error', description),
      info: (message, description) => push(message, 'info', description),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return context
}
