import { cn } from '../../utils/format'

/**
 * Thin wrappers around a normal <table> so every list screen looks the same.
 * The outer wrapper scrolls horizontally, which is how tables stay usable
 * on small screens.
 *
 * <Table>
 *   <THead><TR><TH>Name</TH></TR></THead>
 *   <TBody><TR><TD>John</TD></TR></TBody>
 * </Table>
 */
export default function Table({ children, className }) {
  return (
    <div className="scrollbar-slim w-full overflow-x-auto">
      <table className={cn('w-full min-w-[720px] border-collapse text-left', className)}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }) {
  return <thead className="bg-slate-50">{children}</thead>
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TR({ children, className, onClick, ...props }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-slate-50',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TH({ children, className, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TD({ children, className, ...props }) {
  return (
    <td className={cn('px-4 py-3 align-middle text-sm text-slate-700', className)} {...props}>
      {children}
    </td>
  )
}
