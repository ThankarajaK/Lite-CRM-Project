import { cn, getAvatarColor, getInitials } from '../../utils/format'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

/** Initials avatar with a colour derived from the name, so it stays stable. */
export default function Avatar({ name = '', size = 'md', className }) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        getAvatarColor(name),
        SIZES[size],
        className
      )}
    >
      {getInitials(name)}
    </span>
  )
}
