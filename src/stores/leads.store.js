import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { leadsApi } from '@/api/leads'
import { paymentsApi } from '@/api/payments'
import { documentsApi } from '@/api/documents'
import { gestionApi } from '@/api/gestion'

export const useLeadsStore = defineStore('leads', () => {
  const list = ref([])
  const current = ref(null)
  const leadAppointments = ref([])
  const payments = ref([])
  const dossier = ref(null)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  // status / insurance_type / source_id hold arrays (multi-select chips)
  const filters = reactive({
    search: '',
    status: [],
    stage: '',
    insurance_type: [],
    source_id: [],
    assigned_to: '',
    unassigned: '',
    is_doublon: '',
    due: '',
    dvc_status: [],
    payment_status: [],
    from: '',
    to: '',
    page: 1,
    per_page: 15,
    sort_by: 'created_at',
    sort_dir: 'desc',
  })

  const loading = reactive({
    list: false,
    detail: false,
    form: false,
    submitting: false,
    appointments: false,
    payments: false,
    dossier: false,
    action: false,
  })

  const errors = ref(null)
  const counts = ref(null) // { all, mine, unassigned, doublons, due_today }
  let _listGen = 0  // incremented on every fetchList call; stale responses are dropped

  const activeFiltersCount = computed(() => {
    const { search, status, stage, insurance_type, source_id, assigned_to, from, to } = filters
    return [search, status, stage, insurance_type, source_id, assigned_to, from, to]
      .filter((v) => (Array.isArray(v) ? v.length : Boolean(v))).length
  })

  async function fetchList() {
    const gen = ++_listGen
    loading.list = true
    errors.value = null
    try {
      const { data, meta: m } = await leadsApi.list(_buildParams())
      if (gen !== _listGen) return  // a newer request already fired; discard this response
      list.value = data
      if (m) meta.value = m
    } catch (e) {
      if (gen === _listGen) errors.value = e
    } finally {
      if (gen === _listGen) loading.list = false
    }
  }

  async function fetchCounts() {
    try {
      counts.value = (await leadsApi.counts()).data
    } catch {
      // the tabs still work without their counts
    }
  }

  /** One action on several leads (POST /leads/bulk) → { done, failed, results } */
  async function bulk(payload) {
    loading.action = true
    try {
      return (await leadsApi.bulk(payload)).data
    } finally {
      loading.action = false
    }
  }

  async function fetchOne(id) {
    loading.detail = true
    errors.value = null
    try {
      const { data } = await leadsApi.get(id)
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
      const { data } = await leadsApi.create(payload)
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
      const { data } = await leadsApi.update(id, payload)
      current.value = data
      const idx = list.value.findIndex((l) => String(l.id) === String(id))
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
      await leadsApi.remove(id)
      list.value = list.value.filter((l) => String(l.id) !== String(id))
      if (String(current.value?.id) === String(id)) current.value = null
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function assign(id, assignedTo) {
    loading.action = true
    try {
      const { data } = await leadsApi.assign(id, assignedTo)
      const numId = Number(id)
      if (current.value?.id === numId) current.value = { ...current.value, ...data }
      const idx = list.value.findIndex((l) => l.id === numId)
      if (idx !== -1) list.value.splice(idx, 1, { ...list.value[idx], ...data })
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function updateStatus(id, payload) {
    loading.action = true
    try {
      const { data } = await leadsApi.updateStatus(id, payload)
      // Route params are strings, ids from the API numbers: compare as strings.
      // Merge rather than replace: the status response omits some fields
      // (last_flag, next_action, counts) that the page still needs.
      if (current.value && String(current.value.id) === String(id)) current.value = { ...current.value, ...data }
      const idx = list.value.findIndex((l) => String(l.id) === String(id))
      if (idx !== -1) list.value[idx] = { ...list.value[idx], ...data }
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function addNote(leadId, note) {
    loading.submitting = true
    try {
      const { data } = await leadsApi.notes.create(leadId, note)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.submitting = false
    }
  }

  async function logCall(leadId, payload) {
    loading.submitting = true
    try {
      const { data } = await leadsApi.calls.create(leadId, payload)
      if (current.value?.id === Number(leadId)) {
        current.value = { ...current.value, calls_count: (current.value.calls_count ?? 0) + 1 }
      }
      const idx = list.value.findIndex((l) => l.id === Number(leadId))
      if (idx !== -1) {
        list.value.splice(idx, 1, { ...list.value[idx], calls_count: (list.value[idx].calls_count ?? 0) + 1 })
      }
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.submitting = false
    }
  }

  async function fetchLeadAppointments(leadId) {
    loading.appointments = true
    try {
      const { data } = await leadsApi.appointments.list(leadId)
      leadAppointments.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.appointments = false
    }
  }

  async function createLeadAppointment(leadId, payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await leadsApi.appointments.create(leadId, payload)
      leadAppointments.value.unshift(data)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function fetchPayments(leadId) {
    loading.payments = true
    try {
      const { data } = await paymentsApi.list(leadId)
      payments.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.payments = false
    }
  }

  async function setClientType(leadId, clientType) {
    loading.dossier = true
    try {
      const { data } = await documentsApi.setClientType(leadId, clientType)
      current.value = data
      const idx = list.value.findIndex((l) => l.id === leadId)
      if (idx !== -1) list.value[idx] = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.dossier = false
    }
  }

  async function fetchDossier(leadId) {
    loading.dossier = true
    try {
      const { data } = await documentsApi.getDossier(leadId)
      dossier.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.dossier = false
    }
  }

  async function uploadDocument(leadId, formData) {
    loading.dossier = true
    try {
      await documentsApi.upload(leadId, formData)
      await fetchDossier(leadId)
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.dossier = false
    }
  }

  async function removeDocument(leadId, documentId) {
    loading.action = true
    try {
      await documentsApi.remove(leadId, documentId)
      await fetchDossier(leadId)
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function downloadDocument(leadId, documentId, filename) {
    try {
      const response = await documentsApi.download(leadId, documentId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      errors.value = e
      throw e
    }
  }

  async function crossSell(leadId, payload) {
    loading.action = true
    try {
      const { data } = await leadsApi.crossSell(leadId, payload)
      list.value.unshift(data)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function flagIssue(leadId, payload) {
    loading.action = true
    try {
      const { data } = await gestionApi.flagIssue(leadId, payload)
      const numId = Number(leadId)
      if (current.value?.id === numId) current.value = data
      const idx = list.value.findIndex((l) => l.id === numId)
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
    Object.assign(filters, {
      search: '',
      status: [],
      stage: '',
      insurance_type: [],
      source_id: [],
      assigned_to: '',
      unassigned: '',
      is_doublon: '',
      due: '',
      dvc_status: [],
      payment_status: [],
      from: '',
      to: '',
      page: 1,
      sort_by: 'created_at',
      sort_dir: 'desc',
    })
    fetchList()
  }

  function _buildParams() {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (Array.isArray(v) ? v.length : v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  return {
    list,
    current,
    leadAppointments,
    payments,
    dossier,
    meta,
    filters,
    loading,
    errors,
    counts,
    activeFiltersCount,
    fetchList,
    fetchCounts,
    bulk,
    fetchOne,
    create,
    update,
    remove,
    assign,
    crossSell,
    updateStatus,
    addNote,
    logCall,
    fetchLeadAppointments,
    createLeadAppointment,
    fetchPayments,
    setClientType,
    flagIssue,
    fetchDossier,
    uploadDocument,
    removeDocument,
    downloadDocument,
    setFilter,
    resetFilters,
  }
})
