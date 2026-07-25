import { i18n } from '@/i18n'

/**
 * Convert a UTC ISO string from the backend into the local-wall-clock
 * string a <input type="datetime-local"> expects (YYYY-MM-DDTHH:mm).
 */
export function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Convert a <input type="datetime-local"> value (local wall-clock,
 * timezone-less) into a proper UTC ISO string for the API.
 */
export function fromDatetimeLocalValue(localValue) {
  if (!localValue) return ''
  const date = new Date(localValue) // no tz suffix => JS parses as local time
  if (isNaN(date)) return ''
  return date.toISOString()
}

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
  const t = i18n.global.t
  if (minutes < 1) return t('common.justNow')
  if (minutes < 60) return t('common.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('common.daysAgo', { count: days })
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
