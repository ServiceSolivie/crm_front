import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { appointmentsApi } from '@/api/appointments'

export const useAppointmentsStore = defineStore('appointments', () => {
  const list = ref([])
  const current = ref(null)
  const stats = ref(null)
  const reminders = ref([])

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    status: '',
    lead_id: '',
    assigned_to: '',
    from: '',
    to: '',
    page: 1,
    per_page: 15,
    sort_by: 'scheduled_at',
    sort_dir: 'asc',
  })

  const loading = reactive({
    list: false,
    detail: false,
    form: false,
    reminders: false,
    stats: false,
    action: false,
  })

  const errors = ref(null)
  let _listGen = 0

  const activeFiltersCount = computed(() => {
    const { search, status, lead_id, assigned_to, from, to } = filters
    return [search, status, lead_id, assigned_to, from, to].filter(Boolean).length
  })

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await appointmentsApi.list(_buildParams())
      if (gen !== _listGen) return
      list.value = data
      if (m) meta.value = m
    } catch (e) {
      if (gen === _listGen) errors.value = e
    } finally {
      if (gen === _listGen) loading.list = false
    }
  }

  async function fetchStats() {
    loading.stats = true
    try {
      const { data } = await appointmentsApi.statistics()
      stats.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.stats = false
    }
  }

  async function fetchOne(id) {
    loading.detail = true
    errors.value = null
    try {
      const { data } = await appointmentsApi.get(id)
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
      const { data } = await appointmentsApi.create(payload)
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
      const { data } = await appointmentsApi.update(id, payload)
      current.value = data
      const idx = list.value.findIndex((a) => String(a.id) === String(id))
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
      await appointmentsApi.remove(id)
      list.value = list.value.filter((a) => String(a.id) !== String(id))
      if (String(current.value?.id) === String(id)) current.value = null
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function reschedule(id, scheduledAt) {
    loading.action = true
    try {
      const { data } = await appointmentsApi.reschedule(id, scheduledAt)
      if (String(current.value?.id) === String(id)) current.value = data
      const idx = list.value.findIndex((a) => String(a.id) === String(id))
      if (idx !== -1) list.value[idx] = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function updateStatus(id, status) {
    loading.action = true
    try {
      const { data } = await appointmentsApi.updateStatus(id, status)
      if (String(current.value?.id) === String(id)) current.value = data
      const idx = list.value.findIndex((a) => String(a.id) === String(id))
      if (idx !== -1) list.value[idx] = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function fetchReminders(appointmentId) {
    loading.reminders = true
    try {
      const { data } = await appointmentsApi.reminders.list(appointmentId)
      reminders.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.reminders = false
    }
  }

  async function addReminder(appointmentId, payload) {
    loading.reminders = true
    try {
      const { data } = await appointmentsApi.reminders.create(appointmentId, payload)
      reminders.value.push(data)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.reminders = false
    }
  }

  async function removeReminder(appointmentId, reminderId) {
    await appointmentsApi.reminders.remove(appointmentId, reminderId)
    reminders.value = reminders.value.filter((r) => r.id !== reminderId)
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
    fetchList()
  }

  function resetFilters() {
    Object.assign(filters, {
      search: '',
      status: '',
      lead_id: '',
      assigned_to: '',
      from: '',
      to: '',
      page: 1,
      sort_by: 'scheduled_at',
      sort_dir: 'asc',
    })
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
    stats,
    reminders,
    meta,
    filters,
    loading,
    errors,
    activeFiltersCount,
    fetchList,
    fetchStats,
    fetchOne,
    create,
    update,
    remove,
    reschedule,
    updateStatus,
    fetchReminders,
    addReminder,
    removeReminder,
    setFilter,
    resetFilters,
  }
})
