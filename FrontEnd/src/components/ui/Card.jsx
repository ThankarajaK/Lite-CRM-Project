import { cn } from '../../utils/format'

/**
 * White surface with a subtle border — the base of every panel in the app.
 *
 * Responsive behavior:
 * - Prevents horizontal overflow
 * - Keeps content width constrained to the card
 * - Preserves the existing Card API
 */
export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 border-b border-slate-200 px-4 py-4',
        'sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5',
        className
      )}
    >
      {/* Title + subtitle */}
      <div className="min-w-0 flex-1">
        <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-slate-900">
          {title}
        </h3>

        {subtitle ? (
          <p className="mt-1 max-w-full break-words text-sm leading-5 text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Optional action */}
      {action ? (
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export function CardBody({ className, children }) {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full p-4 sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardFooter({ className, children }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col-reverse gap-2.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-5',
        className
      )}
    >
      {children}
    </div>
  )
}