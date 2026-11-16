import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { insuranceTypesApi, leadPagesApi } from '@/api/insuranceTypes'

/**
 * Insurance types and lead pages. Loaded once for the session (labels,
 * forms, filters and the menu need them) and kept in step with the
 * settings page.
 */
export const useInsuranceTypesStore = defineStore('insuranceTypes', () => {
  const types = ref([])
  const pages = ref([])
  const loaded = ref(false)

  const loading = reactive({ list: false, form: false, action: false })

  const byCode = computed(() => Object.fromEntries(types.value.map((t) => [t.code, t])))

  async function fetchAll(force = false) {
    if ((loaded.value || loading.list) && !force) return
    loading.list = true
    try {
      const [t, p] = await Promise.all([insuranceTypesApi.list(), leadPagesApi.list()])
      types.value = t.data
      pages.value = p.data
      loaded.value = true
    } finally {
      loading.list = false
    }
  }

  function replace(listRef, item) {
    const idx = listRef.value.findIndex((x) => String(x.id) === String(item.id))
    if (idx === -1) listRef.value.push(item)
    else listRef.value[idx] = item
  }

  async function saveType(id, payload) {
    loading.form = true
    try {
      const { data } = id ? await insuranceTypesApi.update(id, payload) : await insuranceTypesApi.create(payload)
      replace(types, data)
      return data
    } finally {
      loading.form = false
    }
  }

  async function removeType(id) {
    loading.action = true
    try {
      await insuranceTypesApi.remove(id)
      types.value = types.value.filter((t) => String(t.id) !== String(id))
    } finally {
      loading.action = false
    }
  }

  async function savePage(id, payload) {
    loading.form = true
    try {
      const { data } = id ? await leadPagesApi.update(id, payload) : await leadPagesApi.create(payload)
      replace(pages, data)
      return data
    } finally {
      loading.form = false
    }
  }

  // Its types go back to « Leads » on the server: mirror that here
  async function removePage(id) {
    loading.action = true
    try {
      await leadPagesApi.remove(id)
      pages.value = pages.value.filter((p) => String(p.id) !== String(id))
      types.value = types.value.map((t) => (String(t.lead_page_id) === String(id) ? { ...t, lead_page_id: null } : t))
    } finally {
      loading.action = false
    }
  }

  return { types, pages, loaded, loading, byCode, fetchAll, saveType, removeType, savePage, removePage }
})
