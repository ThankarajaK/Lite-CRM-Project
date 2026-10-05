import { X } from 'lucide-react'
import {
  useEscapeKey,
  useFocusTrap,
  useLockBodyScroll,
} from '../../hooks/useDismissable'
import { cn } from '../../utils/format'

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

/**
 * Centred modal dialog.
 *
 * Responsive behavior:
 * - Mobile: bottom sheet with rounded top corners.
 * - Desktop: centred modal.
 * - Content scrolls independently.
 * - Escape closes the modal.
 * - Backdrop click closes the modal.
 * - Tab focus remains inside the modal.
 * - Page scrolling is locked while open.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
}) {
  useEscapeKey(open, onClose)
  useLockBodyScroll(open)

  const containerRef = useFocusTrap(open)

  if (!open) return null

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-end
        justify-center
        sm:items-center
      "
    >
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

      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          `
            relative
            z-10
            flex
            max-h-[92vh]
            w-full
            min-w-0
            flex-col
            overflow-hidden
            bg-white
            shadow-pop
            animate-slide-up
          `,
          'rounded-t-2xl sm:rounded-xl',
          'pb-[env(safe-area-inset-bottom)] sm:pb-0',
          'sm:max-w-[calc(100vw-2rem)]',
          WIDTHS[size]
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
            <h2
              className="
                min-w-0
                text-base
                font-semibold
                leading-5
                text-slate-900
              "
            >
              {title}
            </h2>

            {description ? (
              <p
                className="
                  mt-1
                  max-w-full
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
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
              active:bg-slate-200
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
            px-4
            py-4
            sm:px-5
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