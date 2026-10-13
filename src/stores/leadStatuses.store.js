import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { leadStatusesApi } from '@/api/leadStatuses'

/**
 * Custom lead statuses added from the CRM. Loaded once for the session
 * (every page showing a status needs them) and kept in step with the
 * settings page.
 */
export const useLeadStatusesStore = defineStore('leadStatuses', () => {
  const list = ref([])
  const loaded = ref(false)

  const loading = reactive({
    list: false,
    form: false,
    action: false,
  })

  const errors = ref(null)

  const byCode = computed(() => Object.fromEntries(list.value.map((s) => [s.code, s])))

  async function fetchList(force = false) {
    if ((loaded.value || loading.list) && !force) return
    loading.list = true
    errors.value = null
    try {
      const { data } = await leadStatusesApi.list()
      list.value = data
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
      const { data } = await leadStatusesApi.create(payload)
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
      const { data } = await leadStatusesApi.update(id, payload)
      const idx = list.value.findIndex((s) => String(s.id) === String(id))
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
      await leadStatusesApi.remove(id)
      list.value = list.value.filter((s) => String(s.id) !== String(id))
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  return {
    list,
    loaded,
    loading,
    errors,
    byCode,
    fetchList,
    create,
    update,
    remove,
  }
})
