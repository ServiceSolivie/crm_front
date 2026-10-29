/**
 * Readable display of a stored phone number, showing the number that is dialled:
 *   0692737813                 → 06 92 73 78 13      (national, dialled as is)
 *   33612345678 / +33612345678 → +33 6 12 34 56 78
 *   596696027020               → +596 696 02 70 20   (overseas France)
 * Only these known shapes are regrouped; anything else is shown as stored.
 * Display only: the stored value never changes.
 */

const OVERSEAS_CODES = ['590', '594', '596', '262']

const pairs = (digits) => digits.match(/.{1,2}/g).join(' ')

/**
 * The number to call, as stored (same rule as the API): "00…" and numbers
 * stored with their country code get the "+", a national number stays as is.
 */
export function dialNumber(raw) {
  const stored = String(raw ?? '').trim()
  const digits = stored.replace(/\D/g, '')
  if (!digits) return ''
  if (stored.startsWith('+')) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  return digits.startsWith('0') ? digits : `+${digits}`
}

export function formatPhone(raw) {
  if (!raw) return ''
  const stored = String(raw).trim()
  const dialled = dialNumber(stored)

  // National format: 06 92 73 78 13
  if (/^0\d{9}$/.test(dialled)) return pairs(dialled)

  const digits = dialled.slice(1)

  // Overseas France with its country code: +596 696 02 70 20
  const code = OVERSEAS_CODES.find((c) => digits.startsWith(c) && digits.length === c.length + 9)
  if (code) {
    const local = digits.slice(code.length)
    return `+${code} ${local.slice(0, 3)} ${pairs(local.slice(3))}`
  }

  // Metropolitan France with its country code: +33 6 12 34 56 78
  if (/^33\d{9}$/.test(digits)) return `+33 ${digits[2]} ${pairs(digits.slice(3))}`

  return stored
}
