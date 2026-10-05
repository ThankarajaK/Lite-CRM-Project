import { Inbox } from 'lucide-react'
import { cn } from '../../utils/format'

/**
 * Empty state used when:
 * - A filtered list has no matching records
 * - A section has no records yet
 *
 * Responsive:
 * - Comfortable spacing on desktop
 * - Reduced vertical padding on smaller screens
 * - Long titles/messages wrap without causing horizontal overflow
 * - Actions can wrap naturally on mobile
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message = 'Try adjusting your search or filters.',
  action,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col items-center justify-center text-center',
        compact
          ? 'px-4 py-8 sm:py-10'
          : 'px-5 py-12 sm:px-6 sm:py-16'
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <span
        className="
          flex
          h-11
          w-11
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-slate-100
          text-slate-400
          sm:h-12
          sm:w-12
        "
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>

      {/* Title */}
      <h3
        className="
          mt-4
          max-w-full
          text-sm
          font-semibold
          leading-5
          text-slate-900
        "
      >
        {title}
      </h3>

      {/* Message */}
      {message ? (
        <p
          className="
            mt-1
            max-w-sm
            text-sm
            leading-5
            text-slate-500
          "
        >
          {message}
        </p>
      ) : null}

      {/* Optional action */}
      {action ? (
        <div
          className="
            mt-4
            flex
            max-w-full
            flex-wrap
            items-center
            justify-center
            gap-2
          "
        >
          {action}
        </div>
      ) : null}
    </div>
  )
}