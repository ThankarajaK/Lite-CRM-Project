import { cn } from '../../utils/format'

/**
 * CSS-only tooltip.
 *
 * Shows on:
 * - Mouse hover
 * - Keyboard focus
 *
 * No JavaScript state is required.
 *
 * `side` supports:
 * - top
 * - bottom
 * - left
 * - right
 */
export default function Tooltip({
  label,
  children,
  side = 'top',
  className,
}) {
  const position =
    side === 'bottom'
      ? 'left-1/2 top-full mt-1.5 -translate-x-1/2'
      : side === 'left'
        ? 'right-full top-1/2 mr-1.5 -translate-y-1/2'
        : side === 'right'
          ? 'left-full top-1/2 ml-1.5 -translate-y-1/2'
          : 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'

  return (
    <span
      className={cn(
        'group/tt relative inline-flex min-w-0',
        className
      )}
    >
      {children}

      {label ? (
        <span
          role="tooltip"
          className={cn(
            `
              pointer-events-none
              absolute
              z-40
              max-w-[min(18rem,calc(100vw-1.5rem))]
              overflow-hidden
              rounded-md
              bg-slate-900
              px-2
              py-1
              text-xs
              font-medium
              leading-4
              text-white
              opacity-0
              shadow-pop
              transition-opacity
              duration-100
            `,
            'whitespace-normal break-words',
            'group-hover/tt:opacity-100',
            'group-focus-within/tt:opacity-100',
            position
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}