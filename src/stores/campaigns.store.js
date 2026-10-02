import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { campaignsApi } from '@/api/campaigns'

export const useCampaignsStore = defineStore('campaigns', () => {
  const list = ref([])
  const loading = reactive({ list: false, form: false })
  const errors = ref(null)
  async function fetchList() {
    loading.list = true
    errors.value = null
    try {
      list.value = (await campaignsApi.list({ per_page: 100 })).data
    } catch (error) {
      errors.value = error
    } finally {
      loading.list = false
    }
  }
  async function create(payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await campaignsApi.create(payload)
      list.value.push(data)
      return data
    } catch (error) {
      errors.value = error
      throw error
    } finally {
      loading.form = false
    }
  }
  async function update(id, payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await campaignsApi.update(id, payload)
      const index = list.value.findIndex((campaign) => String(campaign.id) === String(id))
      if (index >= 0) list.value.splice(index, 1, data)
      return data
    } catch (error) {
      errors.value = error
      throw error
    } finally {
      loading.form = false
    }
  }
  async function remove(id) {
    try {
      await campaignsApi.remove(id)
      list.value = list.value.filter((campaign) => String(campaign.id) !== String(id))
    } catch (error) {
      errors.value = error
      throw error
    }
  }
  return { list, loading, errors, fetchList, create, update, remove }
})
