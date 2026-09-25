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

export default function StatusBadge({ status, dot = true, className }) {
  if (!status) return null
  return (
    <Badge tone={STATUS_TONES[status] ?? 'gray'} dot={dot} className={className}>
      {status}
    </Badge>
  )
}

export { STATUS_TONES }
