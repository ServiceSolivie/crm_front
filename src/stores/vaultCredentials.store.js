import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { vaultCredentialsApi } from '@/api/vaultCredentials'

export const useVaultCredentialsStore = defineStore('vaultCredentials', () => {
  const list = ref([])
  const current = ref(null)
  const loaded = ref(false)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    partner_id: '',
    is_active: '',
    page: 1,
    per_page: 15,
  })

  const loading = reactive({
    list: false,
    form: false,
    action: false,
  })

  const errors = ref(null)

  async function fetchList(force = false) {
    if (loaded.value && !force) return
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await vaultCredentialsApi.list(_buildParams())
      list.value = data
      if (m) meta.value = m
      loaded.value = true
    } catch (e) {
      errors.value = e
    } finally {
      loading.list = false
    }
  }

  async function fetchOne(id) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await vaultCredentialsApi.get(id)
      current.value = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function create(payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await vaultCredentialsApi.create(payload)
      list.value.push(data)
      meta.value.total++
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function update(id, payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await vaultCredentialsApi.update(id, payload)
      const idx = list.value.findIndex((c) => c.id === id)
      if (idx !== -1) list.value[idx] = data
      current.value = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function remove(id) {
    loading.action = true
    try {
      await vaultCredentialsApi.remove(id)
      list.value = list.value.filter((c) => c.id !== id)
      meta.value.total--
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
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
    current,
    loaded,
    meta,
    filters,
    loading,
    errors,
    fetchList,
    fetchOne,
    create,
    update,
    remove,
    setFilter,
  }
})
