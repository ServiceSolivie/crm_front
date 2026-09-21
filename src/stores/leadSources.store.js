import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { leadSourcesApi } from '@/api/leadSources'

export const useLeadSourcesStore = defineStore('leadSources', () => {
  const list = ref([])
  const current = ref(null)
  const loaded = ref(false)

  const meta = ref({ total: 0, per_page: 50, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    page: 1,
    per_page: 50,
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
      const { data, meta: m } = await leadSourcesApi.list(_buildParams())
      list.value = data
      if (m) meta.value = m
      loaded.value = true
    } catch (e) {
      errors.value = e
    } finally {
      loading.list = false
    }
  }

  async function create(payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await leadSourcesApi.create(payload)
      list.value.push(data)
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
      const { data } = await leadSourcesApi.update(id, payload)
      const idx = list.value.findIndex((s) => String(s.id) === String(id))
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
      await leadSourcesApi.remove(id)
      list.value = list.value.filter((s) => String(s.id) !== String(id))
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

  const options = () => list.value.map((s) => ({ label: s.name, value: s.id }))

  return {
    list,
    current,
    loaded,
    meta,
    filters,
    loading,
    errors,
    options,
    fetchList,
    create,
    update,
    remove,
    setFilter,
  }
})
