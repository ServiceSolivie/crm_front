/**
 * Format an ISO date string to a human-readable date.
 * @param {string|null} value
 * @param {Intl.DateTimeFormatOptions} options
 */
export function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

/**
 * Format an ISO datetime string to date + time.
 */
export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a monetary amount with currency symbol.
 * @param {number|string|null} value
 * @param {string} currency
 */
export function formatCurrency(value, currency = 'EUR') {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value)
}

/**
 * Format a number with locale separators.
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format a percentage value.
 * @param {number|null} value - raw float, e.g. 24.3
 * @param {number} decimals
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

/**
 * Return relative time string (e.g. "2 hours ago").
 */
export function formatRelative(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date)) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

/**
 * Truncate a string to maxLength characters.
 */
export function truncate(str, maxLength = 80) {
  if (!str) return ''
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

/**
 * Return initials from a full name (up to 2 chars).
 */
export function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
