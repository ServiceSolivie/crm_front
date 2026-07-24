import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { contractsApi } from '@/api/contracts'

export const useContractsStore = defineStore('contracts', () => {
  const list = ref([])
  const templates = ref([])

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    template_key: '',
    page: 1,
    per_page: 15,
  })

  const loading = reactive({
    list: false,
    templates: false,
    prefill: false,
    generate: false,
    action: false,
  })

  const errors = ref(null)
  let _listGen = 0

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await contractsApi.list(_buildParams())
      if (gen !== _listGen) return
      list.value = data
      if (m) meta.value = m
    } catch (e) {
      if (gen === _listGen) errors.value = e
    } finally {
      if (gen === _listGen) loading.list = false
    }
  }

  async function fetchTemplates() {
    if (templates.value.length) return templates.value
    loading.templates = true
    try {
      const { data } = await contractsApi.templates()
      templates.value = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.templates = false
    }
  }

  async function fetchPrefill(templateKey, leadId) {
    loading.prefill = true
    try {
      const { data } = await contractsApi.prefill(templateKey, leadId)
      return data.values ?? {}
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.prefill = false
    }
  }

  async function generate(payload) {
    loading.generate = true
    errors.value = null
    try {
      const { data } = await contractsApi.generate(payload)
      list.value.unshift(data)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.generate = false
    }
  }

  async function downloadBlob(id) {
    const response = await contractsApi.download(id)
    return new Blob([response.data], { type: 'application/pdf' })
  }

  async function download(id, filename) {
    const blob = await downloadBlob(id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  async function remove(id) {
    loading.action = true
    try {
      await contractsApi.remove(id)
      list.value = list.value.filter((c) => c.id !== id)
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

  function _buildParams() {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  return {
    list,
    templates,
    meta,
    filters,
    loading,
    errors,
    fetchList,
    fetchTemplates,
    fetchPrefill,
    generate,
    downloadBlob,
    download,
    remove,
    setFilter,
  }
})
