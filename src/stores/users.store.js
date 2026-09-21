import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { usersApi } from '@/api/users'

export const useUsersStore = defineStore('users', () => {
  const list = ref([])
  const current = ref(null)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    role: '',
    is_active: '',
    team_id: '',
    page: 1,
    per_page: 15,
  })

  const loading = reactive({
    list: false,
    detail: false,
    form: false,
    action: false,
  })

  const errors = ref(null)
  let _listGen = 0

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await usersApi.list(_buildParams())
      if (gen !== _listGen) return
      list.value = data
      if (m) meta.value = m
    } catch (e) {
      if (gen === _listGen) errors.value = e
    } finally {
      if (gen === _listGen) loading.list = false
    }
  }

  async function fetchOne(id) {
    loading.detail = true
    errors.value = null
    try {
      const { data } = await usersApi.get(id)
      current.value = data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.detail = false
    }
  }

  async function create(payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await usersApi.create(payload)
      list.value.unshift(data)
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
      const { data } = await usersApi.update(id, payload)
      current.value = data
      const idx = list.value.findIndex((u) => String(u.id) === String(id))
      if (idx !== -1) list.value[idx] = data
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
      await usersApi.remove(id)
      list.value = list.value.filter((u) => String(u.id) !== String(id))
      if (String(current.value?.id) === String(id)) current.value = null
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function assignRole(id, role) {
    loading.action = true
    try {
      const { data } = await usersApi.assignRole(id, role)
      if (String(current.value?.id) === String(id)) current.value = data
      const idx = list.value.findIndex((u) => String(u.id) === String(id))
      if (idx !== -1) list.value[idx] = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function toggleStatus(id, isActive) {
    loading.action = true
    try {
      const { data } = await usersApi.toggleStatus(id, isActive)
      if (String(current.value?.id) === String(id)) current.value = data
      const idx = list.value.findIndex((u) => String(u.id) === String(id))
      if (idx !== -1) list.value[idx] = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function resetPassword(id, payload) {
    loading.action = true
    try {
      const { data } = await usersApi.resetPassword(id, payload)
      if (String(current.value?.id) === String(id)) current.value = data
      const idx = list.value.findIndex((u) => String(u.id) === String(id))
      if (idx !== -1) list.value[idx] = data
      return data
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
    fetchList()
  }

  function resetFilters() {
    Object.assign(filters, { search: '', role: '', is_active: '', team_id: '', page: 1 })
    fetchList()
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
    meta,
    filters,
    loading,
    errors,
    fetchList,
    fetchOne,
    create,
    update,
    remove,
    assignRole,
    toggleStatus,
    resetPassword,
    setFilter,
    resetFilters,
  }
})
