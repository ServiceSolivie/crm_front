import { CreditCard, Undo2, RadioTower, LogIn, UserCog, Server, User, Bot, Smartphone } from 'lucide-vue-next'
import { formatCurrency, formatDateTime } from '@/utils/formatters'

/**
 * How the activity journal shows its categories, states and details.
 * One place, so the chips, the rows and the logs always agree.
 */

// Category -> icon and colours of its tile. Order = order of the chips.
export const CATEGORIES = {
  payment: { icon: CreditCard, tile: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-700' },
  refund: { icon: Undo2, tile: 'bg-violet-100 text-violet-700', text: 'text-violet-700' },
  google_ads: { icon: RadioTower, tile: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' },
  auth: { icon: LogIn, tile: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
  user: { icon: UserCog, tile: 'bg-pink-100 text-pink-700', text: 'text-pink-700' },
  system: { icon: Server, tile: 'bg-sky-100 text-sky-700', text: 'text-sky-700' },
}

// State of an operation -> badge variant, and the edge of rows needing attention
export const STATE_VARIANT = { success: 'success', pending: 'info', warning: 'warning', failure: 'danger', neutral: 'neutral' }
export const STATE_EDGE = { failure: 'border-l-danger', warning: 'border-l-warning' }

// Level of a log -> its dot
export const LEVEL_DOT = { success: 'bg-success', info: 'bg-gray-400', warning: 'bg-warning', failure: 'bg-danger' }

// Who did it, when it is not a named user
export const ACTOR_ICON = { user: User, system: Bot, client: Smartphone, google_ads: RadioTower }

const MONEY_KEYS = ['amount', 'previous_total', 'new_total']
// Shown apart (or not at all) in the details of a log
const HIDDEN_KEYS = ['currency']

/**
 * The details of a log as [{ key, value }], ready to print: amounts in
 * euros, dates in the user's format, durations in seconds, lists joined.
 */
export function detailRows(properties) {
  return Object.entries(properties ?? {})
    .filter(([key, value]) => !HIDDEN_KEYS.includes(key) && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: formatDetail(key, value, properties) }))
}

function formatDetail(key, value, properties) {
  if (MONEY_KEYS.includes(key)) return formatCurrency(value, properties.currency ?? 'EUR')
  if (key === 'duration_ms') return `${(Number(value) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`
  if (key.endsWith('_at')) return formatDateTime(value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
