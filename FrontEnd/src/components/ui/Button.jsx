import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/format'

const VARIANTS = {
  primary:
    'border border-transparent bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
  outline:
    'border border-brand-600 bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100',
  ghost:
    'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger:
    'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
  success:
    'border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800',
  subtle:
    'border border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
}

const SIZES = {
  sm: 'min-h-8 px-2.5 py-1 text-xs sm:text-sm',
  md: 'min-h-9 px-3.5 py-1.5 text-sm',
  lg: 'min-h-10 px-4 py-2 text-sm sm:text-base',
  icon: 'h-9 w-9 justify-center p-0',
  'icon-sm': 'h-8 w-8 justify-center p-0',
}

/**
 * The single button used everywhere in the app.
 *
 * Supported variants:
 * - primary, secondary, outline, ghost, danger, success, subtle
 *
 * Supported features:
 * - disabled, loading, responsive sizing, touch targets, accessibility
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
  loading = false,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={cn(
        'inline-flex min-w-0 max-w-full shrink-0 items-center justify-center rounded-lg',
        'gap-2 font-medium leading-5 whitespace-nowrap',
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
      {loading ? (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : Icon ? (
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

      {!loading && IconRight ? (
        <IconRight
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      ) : null}
    </button>
  )
}