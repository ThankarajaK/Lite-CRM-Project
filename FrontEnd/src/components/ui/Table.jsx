import { Children, Fragment, isValidElement } from 'react'
import { cn } from '../../utils/format'

function flattenChildren(children) {
  const result = []
  Children.forEach(children, (child) => {
    if (child == null || typeof child === 'boolean') return
    if (isValidElement(child) && child.type === Fragment) {
      result.push(...flattenChildren(child.props.children))
      return
    }
    result.push(child)
  })
  return result
}

function extractRows(children) {
  let headers = []
  let rows = []

  flattenChildren(children).forEach((child) => {
    if (!isValidElement(child)) return

    if (child.type === THead) {
      flattenChildren(child.props.children).forEach((headRow) => {
        if (!isValidElement(headRow) || headRow.type !== TR) return
        headers = flattenChildren(headRow.props.children).map((cell) =>
          isValidElement(cell) ? cell.props.children : cell
        )
      })
    }

    if (child.type === TBody) {
      rows = flattenChildren(child.props.children).filter(
        (row) => isValidElement(row) && row.type === TR
      )
    }
  })

  return { headers, rows }
}

/**
 * Shared CRM table.
 *
 * Desktop/tablet keep the normal accessible table.
 * On narrow screens the same React row/cell data is presented as cards,
 * so records remain readable without horizontal page scrolling.
 */
export default function Table({ children, className }) {
  const { headers, rows } = extractRows(children)

  return (
    <>
      <div className="hidden w-full min-w-0 overflow-x-auto md:block scrollbar-slim">
        <table
          className={cn(
            'w-full min-w-[720px] border-collapse text-left',
            className
          )}
        >
          {children}
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.length ? (
          rows.map((row, rowIndex) => {
            const cells = flattenChildren(row.props.children).filter(
              (cell) => isValidElement(cell)
            )

            return (
              <article
                key={row.key ?? rowIndex}
                onClick={row.props.onClick}
                className={cn(
                  'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-card',
                  'transition-all',
                  row.props.onClick &&
                    'cursor-pointer hover:border-slate-300 hover:shadow-card-hover active:scale-[0.995]',
                  row.props.className
                )}
              >
                {cells.map((cell, cellIndex) => {
                  const label = headers[cellIndex]
                  const isActionCell =
                    cell.props.className?.includes('text-right') ||
                    cell.props.className?.includes('justify-end')

                  return (
                    <div
                      key={cell.key ?? cellIndex}
                      className={cn(
                        'min-w-0 py-2 first:pt-0 last:pb-0',
                        cellIndex > 0 && 'border-t border-slate-100',
                        isActionCell && 'flex justify-end pt-3'
                      )}
                    >
                      {!isActionCell && label != null ? (
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {label}
                        </div>
                      ) : null}
                      <div className="min-w-0 break-words text-sm text-slate-700">
                        {cell.props.children}
                      </div>
                    </div>
                  )
                })}
              </article>
            )
          })
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No records to display.
          </div>
        )}
      </div>
    </>
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
    <td
      className={cn(
        'px-4 py-3 align-middle text-sm text-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}

export function MobileCardList({ children, className }) {
  return (
    <div className={cn('space-y-3 p-3 md:hidden', className)}>
      {children}
    </div>
  )
}

export function MobileCard({ children, className, onClick, ...props }) {
  return (
    <article
      onClick={onClick}
      className={cn(
        'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-all',
        onClick &&
          'cursor-pointer hover:border-slate-300 hover:shadow-card-hover active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </article>
  )
}
