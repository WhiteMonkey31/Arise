/**
 * Formatting helpers used across the app.
 */

/**
 * Returns a human-readable countdown or date label for a deadline.
 * e.g. "3 days left", "Due today", "Overdue", "Jun 25"
 */
export function formatDeadline(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target - today) / 86_400_000)

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return '1 day left'
  if (diffDays <= 7) return `${diffDays} days left`
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Returns true if the deadline is within `thresholdDays` days.
 */
export function isUrgent(dateStr, thresholdDays = 4) {
  if (!dateStr) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / 86_400_000) <= thresholdDays
}

/**
 * Relative timestamp: "2 hours ago", "yesterday", "Jun 5"
 */
export function formatRelative(isoStr) {
  if (!isoStr) return '—'
  const date = new Date(isoStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Currency formatter: 1500000 → "$1,500,000"
 */
export function formatCurrency(value) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Round a float score to N decimal places.
 */
export function roundScore(value, decimals = 1) {
  if (value == null) return 0
  return parseFloat(value.toFixed(decimals))
}

/**
 * Convert a 0-1 float to a % string: 0.754 → "75.4%"
 */
export function toPercent(value, decimals = 1) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}
