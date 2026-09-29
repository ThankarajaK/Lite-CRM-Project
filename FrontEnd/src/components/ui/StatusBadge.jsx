import Badge from './Badge'

/** Maps every CRM status/stage/priority word to a consistent colour. */
const STATUS_TONES = {
  // Lead statuses
  Qualified: 'green',
  'Not Qualified': 'gray',

  // Deal stages
  Contacted: 'blue',
  Proposal: 'violet',
  Negotiation: 'amber',
  Won: 'green',
  Lost: 'red',

  // Contact pipeline state
  'In pipeline': 'blue',
  'No deal yet': 'amber',

  // Task priorities
  High: 'red',
  Medium: 'amber',
  Low: 'gray',

  // Task status
  Completed: 'green',
  Pending: 'blue',
  Overdue: 'red',

  // Contact status
  Active: 'green',
  'At risk': 'amber',
  Inactive: 'gray',
}

/**
 * Shared status badge used throughout LiteCRM.
 *
 * Responsive behavior:
 * - Prevents badge content from shrinking
 * - Keeps status labels on one line
 * - Allows additional className overrides
 * - Preserves the existing tone and dot behavior
 */
export default function StatusBadge({
  status,
  dot = true,
  className,
}) {
  if (!status) return null

  const tone = STATUS_TONES[status] ?? 'gray'

  return (
    <Badge
      tone={tone}
      dot={dot}
      className={className}
    >
      <span className="whitespace-nowrap">
        {status}
      </span>
    </Badge>
  )
}

export { STATUS_TONES }