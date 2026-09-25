import { cn } from '../../utils/format'

/**
 * CSS-only tooltip for icon-only buttons.
 * Shows on hover and on keyboard focus, no JS state needed.
 */
export default function Tooltip({ label, children, side = 'top', className }) {
  const position =
    side === 'bottom'
      ? 'top-full mt-1.5 left-1/2 -translate-x-1/2'
      : side === 'left'
        ? 'right-full mr-1.5 top-1/2 -translate-y-1/2'
        : side === 'right'
          ? 'left-full ml-1.5 top-1/2 -translate-y-1/2'
          : 'bottom-full mb-1.5 left-1/2 -translate-x-1/2'

  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-40 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1',
          'text-xs font-medium text-white opacity-0 shadow-pop transition-opacity duration-100',
          'group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          position
        )}
      >
        {label}
      </span>
    </span>
  )
}
