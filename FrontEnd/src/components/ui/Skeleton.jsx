import { cn } from '../../utils/format'

/**
 * Grey placeholder block used while content is loading.
 *
 * Keeps the same public API so existing screens can continue using:
 * <Skeleton />
 * <TableSkeleton />
 * <CardSkeleton />
 */
export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80',
        className
      )}
    />
  )
}

/**
 * Placeholder rows matching the shape of a data table.
 *
 * Responsive behavior:
 * - Prevents the skeleton from becoming wider than its container.
 * - Allows columns to shrink on smaller screens.
 * - Keeps the first column slightly wider for names/titles.
 */
export function TableSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div
      className="
        divide-y
        divide-slate-100
        overflow-hidden
      "
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="
            flex
            min-w-0
            items-center
            gap-3
            px-4
            py-3.5
            sm:gap-4
          "
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn(
                'h-4 min-w-0 flex-1',
                columnIndex === 0
                  ? 'max-w-[180px] min-w-[90px]'
                  : 'max-w-none'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Placeholder grid matching the dashboard KPI row.
 *
 * Responsive:
 * - 1 column on mobile
 * - 2 columns on small screens
 * - 4 columns on large screens
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div
      className="
        grid
        grid-cols-1
        gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      "
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="
            min-w-0
            rounded-xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-card
            sm:p-5
          "
        >
          <Skeleton className="h-4 w-24 max-w-full" />
          <Skeleton className="mt-4 h-8 w-20 max-w-full" />
          <Skeleton className="mt-3 h-3 w-32 max-w-full" />
        </div>
      ))}
    </div>
  )
}