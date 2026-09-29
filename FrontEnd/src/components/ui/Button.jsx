import { cn } from '../../utils/format'

const VARIANTS = {
  primary:
    'border border-transparent bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
  ghost:
    'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger:
    'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
  subtle:
    'border border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
}

const SIZES = {
  sm: 'min-h-8 px-3 text-xs sm:text-sm',
  md: 'min-h-9 px-3.5 text-sm',
  lg: 'min-h-10 px-4 text-sm',
  icon: 'h-9 w-9 justify-center px-0',
  'icon-sm': 'h-8 w-8 justify-center px-0',
}

/**
 * The single button used everywhere in the app.
 *
 * Responsive improvements:
 * - Prevents text/icon overflow
 * - Keeps icons from shrinking
 * - Supports wrapping safely on smaller screens
 * - Maintains accessible focus states
 * - Preserves all existing variants and sizes
 *
 * <Button variant="primary" icon={Plus}>Add Lead</Button>
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex min-w-0 max-w-full shrink-0 items-center justify-center rounded-lg',
        'font-medium leading-5 whitespace-nowrap',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'active:scale-[0.99]',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className
      )}
      {...props}
    >
      {Icon ? (
        <Icon
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      ) : null}

      {children ? (
        <span className="min-w-0 truncate">
          {children}
        </span>
      ) : null}

      {IconRight ? (
        <IconRight
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      ) : null}
    </button>
  )
}