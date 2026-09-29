import { Search, X } from 'lucide-react'
import { cn } from '../../utils/format'

/**
 * Controlled search input with a clear button.
 *
 * Responsive behavior:
 * - Uses the available width of its parent
 * - Prevents horizontal overflow
 * - Keeps the search and clear icons properly aligned
 * - Maintains the existing controlled-input API
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'relative min-w-0 w-full max-w-full',
        className
      )}
    >
      {/* Search icon */}
      <Search
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          h-4
          w-4
          -translate-y-1/2
          text-slate-400
        "
        aria-hidden="true"
      />

      {/* Search input */}
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="
          field-input
          h-10
          w-full
          min-w-0
          max-w-full
          pl-9
          pr-10
          text-sm
          [&::-webkit-search-cancel-button]:appearance-none
        "
        {...props}
      />

      {/* Clear button */}
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="
            absolute
            right-2
            top-1/2
            flex
            h-7
            w-7
            -translate-y-1/2
            items-center
            justify-center
            rounded-md
            text-slate-400
            transition-colors
            hover:bg-slate-100
            hover:text-slate-600
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-brand-500
            focus-visible:ring-offset-1
          "
        >
          <X
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  )
}