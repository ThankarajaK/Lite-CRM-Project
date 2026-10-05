import { cn, getAvatarColor, getInitials } from '../../utils/format'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

/**
 * Initials avatar with a colour derived from the name,
 * so the same user keeps a stable avatar colour.
 *
 * Used throughout LiteCRM for users, owners and contacts.
 */
export default function Avatar({
  name = '',
  size = 'md',
  className,
}) {
  const initials = getInitials(name)

  return (
    <span
      title={name || 'User'}
      aria-label={name || 'User'}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center',
        'overflow-hidden rounded-full',
        'font-semibold leading-none',
        'whitespace-nowrap',
        'ring-1 ring-inset ring-black/5',
        getAvatarColor(name),
        SIZES[size] ?? SIZES.md,
        className
      )}
    >
      <span className="truncate">
        {initials}
      </span>
    </span>
  )
}