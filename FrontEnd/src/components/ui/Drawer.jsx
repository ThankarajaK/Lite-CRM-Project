import { X } from 'lucide-react'
import { useEscapeKey, useFocusTrap, useLockBodyScroll } from '../../hooks/useDismissable'
import { cn } from '../../utils/format'

/**
 * Right-hand slide-over panel used for lead and contact detail views.
 * On mobile it becomes a full-width sheet.
 */
export default function Drawer({ open, onClose, title, subtitle, header, footer, children, width = 'md' }) {
  useEscapeKey(open, onClose)
  useLockBodyScroll(open)
  const containerRef = useFocusTrap(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-pop animate-slide-in-right',
          width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            {header ?? (
              <>
                <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
                {subtitle ? <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p> : null}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
