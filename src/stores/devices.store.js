import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { devicesApi } from '@/api/devices'

/**
 * Approved machines: the list the super admin manages and the switch that
 * turns the restriction on (off / prepare / on).
 */
export const useDevicesStore = defineStore('devices', () => {
  const list = ref([])
  const settings = ref(null)

  const loading = reactive({
    list: false,
    action: false,
    mode: false,
  })

  const errors = ref(null)

  const pendingCount = computed(() => settings.value?.counts?.pending ?? 0)

  async function fetchSettings() {
    try {
      const { data } = await devicesApi.settings()
      settings.value = data
    } catch (e) {
      errors.value = e
    }
  }

  async function fetchList() {
    loading.list = true
    errors.value = null
    try {
      const [{ data }] = await Promise.all([devicesApi.list(), fetchSettings()])
      list.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.list = false
    }
  }

  async function setMode(mode) {
    loading.mode = true
    try {
      const { data } = await devicesApi.setMode(mode)
      settings.value = data
      return data
    } finally {
      loading.mode = false
    }
  }

  // Every action answers the machine as it now stands: put it back in the list
  async function _act(call) {
    loading.action = true
    try {
      const { data } = await call()
      const idx = list.value.findIndex((d) => d.id === data.id)
      if (idx !== -1) list.value[idx] = data
      await fetchSettings()
      return data
    } finally {
      loading.action = false
    }
  }

  const approve = (id) => _act(() => devicesApi.approve(id))
  const revoke = (id) => _act(() => devicesApi.revoke(id))
  const rename = (id, label) => _act(() => devicesApi.rename(id, label))

  async function remove(id) {
    loading.action = true
    try {
      await devicesApi.remove(id)
      list.value = list.value.filter((d) => d.id !== id)
      await fetchSettings()
    } finally {
      loading.action = false
    }
  }

  return {
    list,
    settings,
    loading,
    errors,
    pendingCount,
    fetchSettings,
    fetchList,
    setMode,
    approve,
    revoke,
    rename,
    remove,
  }
})
