/**
 * Small formatting helpers shared across the prototype.
 * Everything here is pure presentation — no data fetching, no side effects.
 */

/** Format a number as Indian Rupees, e.g. 8500 -> "₹8,500". */
export function formatCurrency(value, { compact = false } = {}) {
  const amount = Number(value) || 0
  if (compact && Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
  }
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

/** "2026-09-28" -> "Sep 28, 2026" */
export function formatDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "2026-09-28" -> "Sep 28" (used on compact cards) */
export function formatShortDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Strip the time portion so two dates can be compared by day. */
function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Whole-day difference between a date and today (negative = in the past). */
export function daysFromToday(value) {
  const target = startOfDay(value)
  const today = startOfDay(new Date())
  return Math.round((target - today) / 86400000)
}

export function isToday(value) {
  return daysFromToday(value) === 0
}

export function isOverdue(value) {
  return daysFromToday(value) < 0
}

/**
 * Human-friendly due date: "Today, 3:00 PM", "Tomorrow", "Yesterday", "Sep 24".
 * `time` is an optional "15:00" style string stored alongside the date.
 */
export function formatDueDate(value, time) {
  const diff = daysFromToday(value)
  const clock = time ? `, ${formatTime(time)}` : ''
  if (diff === 0) return `Today${clock}`
  if (diff === 1) return `Tomorrow${clock}`
  if (diff === -1) return `Yesterday${clock}`
  return `${formatShortDate(value)}${clock}`
}

/** "15:00" -> "3:00 PM" */
export function formatTime(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes ?? 0).padStart(2, '0')} ${period}`
}

/** ISO timestamp -> "2h ago", "3d ago", "just now". */
export function formatRelativeTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

/** "John Smith" -> "JS" */
export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Deterministic avatar colour so the same person is always the same colour. */
const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

export function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % 997
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/** Join conditional class names: cn('a', false && 'b', 'c') -> "a c" */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
