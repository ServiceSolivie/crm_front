import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { leadsApi } from '@/api/leads'
import { paymentsApi } from '@/api/payments'
import { documentsApi } from '@/api/documents'

export const useLeadsStore = defineStore('leads', () => {
  const list = ref([])
  const current = ref(null)
  const notes = ref([])
  const statusHistory = ref([])
  const assignmentHistory = ref([])
  const leadAppointments = ref([])
  const payments = ref([])
  const dossier = ref(null)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = reactive({
    search: '',
    status: '',
    insurance_type: '',
    source_id: '',
    assigned_to: '',
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
    notes: false,
    history: false,
    appointments: false,
    payments: false,
    dossier: false,
    action: false,
  })

  const errors = ref(null)
  let _listGen = 0  // incremented on every fetchList call; stale responses are dropped

  const activeFiltersCount = computed(() => {
    const { search, status, insurance_type, source_id, assigned_to, from, to } = filters
    return [search, status, insurance_type, source_id, assigned_to, from, to].filter(Boolean).length
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
      const idx = list.value.findIndex((l) => l.id === id)
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
      list.value = list.value.filter((l) => l.id !== id)
      if (current.value?.id === id) current.value = null
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
      if (current.value?.id === id) current.value = data
      const idx = list.value.findIndex((l) => l.id === id)
      if (idx !== -1) list.value[idx] = data
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
    }
  }

  async function fetchNotes(leadId) {
    loading.notes = true
    try {
      const { data } = await leadsApi.notes.list(leadId)
      notes.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.notes = false
    }
  }

  async function addNote(leadId, note) {
    loading.notes = true
    try {
      const { data } = await leadsApi.notes.create(leadId, note)
      notes.value.unshift(data)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.notes = false
    }
  }

  async function fetchStatusHistory(leadId) {
    loading.history = true
    try {
      const { data } = await leadsApi.statusHistory(leadId)
      statusHistory.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.history = false
    }
  }

  async function fetchAssignmentHistory(leadId) {
    loading.history = true
    try {
      const { data } = await leadsApi.assignmentHistory(leadId)
      assignmentHistory.value = data
    } catch (e) {
      errors.value = e
    } finally {
      loading.history = false
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

  async function addPayment(leadId, payload) {
    loading.payments = true
    try {
      const { data } = await paymentsApi.create(leadId, payload)
      payments.value.unshift(data)
      await fetchOne(leadId)
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.payments = false
    }
  }

  async function removePayment(leadId, paymentId) {
    loading.action = true
    try {
      await paymentsApi.remove(leadId, paymentId)
      payments.value = payments.value.filter((p) => p.id !== paymentId)
      await fetchOne(leadId)
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.action = false
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

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
    fetchList()
  }

  function resetFilters() {
    Object.assign(filters, {
      search: '',
      status: '',
      insurance_type: '',
      source_id: '',
      assigned_to: '',
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
      if (v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  return {
    list,
    current,
    notes,
    statusHistory,
    assignmentHistory,
    leadAppointments,
    payments,
    dossier,
    meta,
    filters,
    loading,
    errors,
    activeFiltersCount,
    fetchList,
    fetchOne,
    create,
    update,
    remove,
    assign,
    updateStatus,
    fetchNotes,
    addNote,
    fetchStatusHistory,
    fetchAssignmentHistory,
    fetchLeadAppointments,
    createLeadAppointment,
    fetchPayments,
    addPayment,
    removePayment,
    setClientType,
    fetchDossier,
    uploadDocument,
    removeDocument,
    downloadDocument,
    setFilter,
    resetFilters,
  }
})
