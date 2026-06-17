import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { leadImportsApi } from '@/api/leadImports'

export const useLeadImportsStore = defineStore('leadImports', () => {
  const list = ref([])
  const current = ref(null)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    status: '',
    page: 1,
    per_page: 15,
  })

  const loading = reactive({
    list: false,
    detail: false,
    upload: false,
  })

  const errors = ref(null)
  const uploadProgress = ref(0)
  let _listGen = 0

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await leadImportsApi.list(_buildParams())
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
      const { data } = await leadImportsApi.get(id)
      current.value = data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.detail = false
    }
  }

  async function upload(file) {
    loading.upload = true
    uploadProgress.value = 0
    errors.value = null
    try {
      const { data } = await leadImportsApi.upload(file)
      list.value.unshift(data)
      return data
    } catch (e) {
      errors.value = e
      console.log('errors from the upload ', e)
      throw e
    } finally {
      loading.upload = false
    }
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
    meta,
    filters,
    loading,
    errors,
    uploadProgress,
    fetchList,
    fetchOne,
    upload,
    setFilter,
  }
})
