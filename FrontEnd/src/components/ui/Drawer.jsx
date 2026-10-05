import { X } from 'lucide-react'
import {
  useEscapeKey,
  useFocusTrap,
  useLockBodyScroll,
} from '../../hooks/useDismissable'
import { cn } from '../../utils/format'

/**
 * Right-hand slide-over panel used for lead and contact detail views.
 *
 * Responsive behavior:
 * - Desktop: right-side drawer with configurable width.
 * - Mobile: full-width sheet.
 * - Content scrolls independently from the header and footer.
 * - Preserves focus trapping, Escape handling and body scroll locking.
 */
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  header,
  footer,
  children,
  width = 'md',
}) {
  useEscapeKey(open, onClose)
  useLockBodyScroll(open)

  const containerRef = useFocusTrap(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="
          absolute
          inset-0
          bg-slate-900/40
          animate-fade-in
        "
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          `
            absolute
            inset-y-0
            right-0
            flex
            w-full
            min-w-0
            flex-col
            overflow-hidden
            bg-white
            shadow-pop
            animate-slide-in-right
          `,
          'pb-[env(safe-area-inset-bottom)] sm:pb-0',
          width === 'lg'
            ? 'sm:max-w-2xl'
            : 'sm:max-w-md'
        )}
      >
        {/* Header */}
        <div
          className="
            flex
            shrink-0
            items-start
            justify-between
            gap-3
            border-b
            border-slate-200
            px-4
            py-4
            sm:gap-4
            sm:px-5
          "
        >
          <div className="min-w-0 flex-1">
            {header ?? (
              <>
                <h2
                  className="
                    min-w-0
                    truncate
                    text-base
                    font-semibold
                    leading-5
                    text-slate-900
                  "
                >
                  {title}
                </h2>

                {subtitle ? (
                  <p
                    className="
                      mt-1
                      max-w-full
                      truncate
                      text-sm
                      leading-5
                      text-slate-500
                    "
                  >
                    {subtitle}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="
              -mr-1
              -mt-1
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition-colors
              hover:bg-slate-100
              hover:text-slate-600
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-brand-500
              focus-visible:ring-offset-2
            "
          >
            <X
              className="h-5 w-5"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="
            min-h-0
            min-w-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
          "
        >
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div
            className="
              flex
              shrink-0
              flex-col-reverse
              gap-2
              border-t
              border-slate-200
              bg-slate-50
              px-4
              py-3
              sm:flex-row
              sm:items-center
              sm:justify-end
              sm:px-5
            "
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}