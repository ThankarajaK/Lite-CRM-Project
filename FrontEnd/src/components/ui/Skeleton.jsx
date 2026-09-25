import { cn } from '../../utils/format'

/** Grey placeholder block used while a screen is "loading". */
export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/80', className)} />
}

/** Placeholder rows matching the shape of a data table. */
export function TableSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4 flex-1', columnIndex === 0 && 'max-w-[180px]')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Placeholder grid matching the dashboard KPI row. */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
