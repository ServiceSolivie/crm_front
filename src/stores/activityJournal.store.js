import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { activityJournalApi } from '@/api/activityJournal'

const DEFAULT_FILTERS = () => ({
  search: '',
  category: '', // one chip at a time; '' = all
  state: [],
  event: [],
  actor_type: '',
  problems: false,
  lead_id: '',
  from: '',
  to: '',
  page: 1,
  per_page: 20,
})

/**
 * Activity journal: the list of operations, the counters of the category
 * chips, and the logs of the operations the user opened (loaded on demand).
 */
export const useActivityJournalStore = defineStore('activityJournal', () => {
  const list = ref([])
  const meta = ref({ total: 0, per_page: 20, current_page: 1, last_page: 1 })
  const summary = ref({ total: 0, problems: 0, categories: {}, events: [] })
  const filters = reactive(DEFAULT_FILTERS())

  // Opened operations: id -> { loading, error, logs }
  const opened = reactive({})

  const loading = reactive({ list: false })
  const errors = ref(null)
  let _listGen = 0

  function _params({ withCategory = true, withPaging = true } = {}) {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (!withCategory && k === 'category') return
      if (!withPaging && (k === 'page' || k === 'per_page')) return
      if (k === 'problems') {
        if (v) p.problems = 1
        return
      }
      if (Array.isArray(v) ? v.length : v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const [page, counters] = await Promise.all([
        activityJournalApi.list(_params()),
        activityJournalApi.summary(_params({ withCategory: false, withPaging: false })),
      ])
      if (gen !== _listGen) return
      list.value = page.data
      if (page.meta) meta.value = page.meta
      summary.value = counters.data

      // Keep the opened ones open, with fresh logs
      Object.keys(opened).forEach((id) => {
        if (list.value.some((o) => String(o.id) === String(id))) loadLogs(id)
        else delete opened[id]
      })
    } catch (e) {
      if (gen === _listGen) errors.value = e
    } finally {
      if (gen === _listGen) loading.list = false
    }
  }

  async function loadLogs(id) {
    if (!opened[id]) opened[id] = { loading: true, error: false, logs: [] }
    else opened[id].loading = true
    try {
      const res = await activityJournalApi.show(id)
      if (opened[id]) Object.assign(opened[id], { loading: false, error: false, logs: res.data.logs ?? [] })
    } catch {
      if (opened[id]) Object.assign(opened[id], { loading: false, error: true })
    }
  }

  function toggle(id) {
    if (opened[id]) delete opened[id]
    else loadLogs(id)
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
    // The event list depends on the category: drop the ones that no longer apply
    if (key === 'category' && value) {
      const allowed = new Set(summary.value.events.filter((e) => e.category === value).map((e) => e.value))
      filters.event = filters.event.filter((e) => allowed.has(e))
    }
    fetchList()
  }

  // Back to no filter (keeps the page size)
  function resetFilters(extra = {}) {
    Object.assign(filters, { ...DEFAULT_FILTERS(), per_page: filters.per_page, ...extra })
    fetchList()
  }

  return { list, meta, summary, filters, opened, loading, errors, fetchList, loadLogs, toggle, setFilter, resetFilters }
})
