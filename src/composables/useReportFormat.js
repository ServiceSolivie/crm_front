import { useI18n } from 'vue-i18n'

/** Locale-aware number / percentage / money formatting for the report pages. */
export function useReportFormat() {
  const { locale } = useI18n()
  const loc = () => (locale.value === 'fr' ? 'fr-FR' : 'en-GB')

  function num(v) {
    if (v === null || v === undefined || v === '') return '—'
    return new Intl.NumberFormat(loc()).format(v)
  }

  function pct(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '—'
    return new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(v) + ' %'
  }

  function money(v) {
    if (v === null || v === undefined || v === '') return '—'
    return new Intl.NumberFormat(loc(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  }

  function dateTime(v) {
    if (!v) return '—'
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(loc(), { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function date(v) {
    if (!v) return '—'
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(loc(), { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  return { num, pct, money, dateTime, date }
}
