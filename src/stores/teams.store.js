import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { teamsApi } from '@/api/teams'

export const useTeamsStore = defineStore('teams', () => {
  const list = ref([])
  const current = ref(null)
  const members = ref([])
  const stats = ref(null)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    page: 1,
    per_page: 15,
  })

  const loading = reactive({
    list: false,
    detail: false,
    form: false,
    members: false,
    action: false,
  })

  const errors = ref(null)
  let _listGen = 0

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await teamsApi.list(_buildParams())
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
      const { data } = await teamsApi.get(id)
      current.value = data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.detail = false
    }
  }

  async function fetchStats(id) {
    try {
      const { data } = await teamsApi.statistics(id)
      stats.value = data
    } catch (e) {
      errors.value = e
    }
  }

  async function create(payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await teamsApi.create(payload)
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
      const { data } = await teamsApi.update(id, payload)
      current.value = data
      const idx = list.value.findIndex((t) => String(t.id) === String(id))
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
      await teamsApi.remove(id)
      list.value = list.value.filter((t) => String(t.id) !== String(id))
      if (String(current.value?.id) === String(id)) current.value = null
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function fetchMembers(teamId) {
    loading.members = true
    try {
      const { data } = await teamsApi.members.list(teamId)
      members.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.members = false
    }
  }

  async function addMember(teamId, userId) {
    loading.members = true
    try {
      const { data } = await teamsApi.members.add(teamId, userId)
      members.value.push(data)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.members = false
    }
  }

  async function removeMember(teamId, userId) {
    await teamsApi.members.remove(teamId, userId)
    members.value = members.value.filter((m) => m.id !== userId)
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
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
    members,
    stats,
    meta,
    filters,
    loading,
    errors,
    fetchList,
    fetchOne,
    fetchStats,
    create,
    update,
    remove,
    fetchMembers,
    addMember,
    removeMember,
    setFilter,
  }
})
