import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '../../utils/format'

const VARIANTS = {
  success: { icon: CheckCircle2, ring: 'text-emerald-600', bar: 'bg-emerald-500' },
  error: { icon: XCircle, ring: 'text-red-600', bar: 'bg-red-500' },
  info: { icon: Info, ring: 'text-brand-600', bar: 'bg-brand-500' },
}

/**
 * Stack of toast notifications, rendered once by `ToastProvider`.
 * Trigger them with `useToast().success('Lead created successfully')`.
 */
export default function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((toast) => {
        const variant = VARIANTS[toast.variant] ?? VARIANTS.info
        const Icon = variant.icon
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-pop animate-slide-up"
          >
            <span className={cn('mt-0.5 shrink-0', variant.ring)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{toast.message}</p>
              {toast.description ? (
                <p className="mt-0.5 text-sm text-slate-500">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
