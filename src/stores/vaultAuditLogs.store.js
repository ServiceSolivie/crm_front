import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { vaultAuditLogsApi } from '@/api/vaultAuditLogs'

export const useVaultAuditLogsStore = defineStore('vaultAuditLogs', () => {
  const list = ref([])
  const loaded = ref(false)

  const meta = ref({ total: 0, per_page: 25, current_page: 1, last_page: 1 })

  const filters = reactive({
    action: '',
    user_id: '',
    credential_id: '',
    from: '',
    to: '',
    page: 1,
    per_page: 25,
  })

  const loading = reactive({ list: false })
  const errors = ref(null)

  async function fetchList(force = false) {
    if (loaded.value && !force) return
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await vaultAuditLogsApi.list(_buildParams())
      list.value = data
      if (m) meta.value = m
      loaded.value = true
    } catch (e) {
      errors.value = e
    } finally {
      loading.list = false
    }
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
    loaded.value = false
    fetchList(true)
  }

  function _buildParams() {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  return {
    list,
    loaded,
    meta,
    filters,
    loading,
    errors,
    fetchList,
    setFilter,
  }
})
