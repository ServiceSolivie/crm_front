import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { paymentsApi } from '@/api/payments'

const DEFAULT_FILTERS = () => ({
  search: '',
  status: [],
  created_by: '',
  from: '',
  to: '',
  sort: '',
  page: 1,
  per_page: 15,
})

/**
 * Payments page: the payment links (Hyperswitch sessions) of every lead
 * the user can see, read from the CRM.
 */
export const usePaymentsStore = defineStore('payments', () => {
  const list = ref([])
  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive(DEFAULT_FILTERS())

  const loading = reactive({ list: false })
  const errors = ref(null)
  let _listGen = 0

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await paymentsApi.sessions.all(_buildParams())
      if (gen !== _listGen) return
      list.value = data
      if (m) meta.value = m
    } catch (e) {
      if (gen === _listGen) errors.value = e
    } finally {
      if (gen === _listGen) loading.list = false
    }
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
    fetchList()
  }

  // Back to no filter (keeps the page size)
  function resetFilters() {
    Object.assign(filters, { ...DEFAULT_FILTERS(), per_page: filters.per_page })
    fetchList()
  }

  function _buildParams() {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (Array.isArray(v) ? v.length : v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  return { list, meta, filters, loading, errors, fetchList, setFilter, resetFilters }
})
