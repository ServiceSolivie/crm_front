import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { reportsApi } from '@/api/reports'

export const useReportsStore = defineStore('reports', () => {
  const leadsData = ref([])
  const appointmentsData = ref([])
  const teamsData = ref([])
  const agentsData = ref([])
  const conversionData = ref([])
  const revenueData = ref([])
  const revenueSummary = ref(null)

  const meta = ref({ total: 0, per_page: 25, current_page: 1, last_page: 1 })

  const filters = reactive({
    from: '',
    to: '',
    group_by: 'source',
    payment_status: null,
    page: 1,
    per_page: 25,
  })

  const loading = reactive({
    leads: false,
    appointments: false,
    teams: false,
    agents: false,
    conversion: false,
    revenue: false,
  })

  const errors = ref(null)

  const activeFiltersCount = computed(() => [filters.from, filters.to, filters.payment_status].filter(Boolean).length)

  async function fetchLeads() {
    loading.leads = true
    errors.value = null
    try {
      const { data, meta: m } = await reportsApi.leads(_buildParams())
      leadsData.value = data
      if (m) meta.value = m
    } catch (e) {
      errors.value = e
    } finally {
      loading.leads = false
    }
  }

  async function fetchAppointments() {
    loading.appointments = true
    errors.value = null
    try {
      const { data, meta: m } = await reportsApi.appointments(_buildParams())
      appointmentsData.value = data
      if (m) meta.value = m
    } catch (e) {
      errors.value = e
    } finally {
      loading.appointments = false
    }
  }

  async function fetchTeams() {
    loading.teams = true
    errors.value = null
    try {
      const { data, meta: m } = await reportsApi.teams(_buildParams())
      teamsData.value = data
      if (m) meta.value = m
    } catch (e) {
      errors.value = e
    } finally {
      loading.teams = false
    }
  }

  async function fetchAgents() {
    loading.agents = true
    errors.value = null
    try {
      const { data, meta: m } = await reportsApi.agents(_buildParams())
      agentsData.value = data
      if (m) meta.value = m
    } catch (e) {
      errors.value = e
    } finally {
      loading.agents = false
    }
  }

  async function fetchConversion() {
    loading.conversion = true
    errors.value = null
    try {
      const { data, meta: m } = await reportsApi.conversion(_buildParams())
      conversionData.value = data
      if (m) meta.value = m
    } catch (e) {
      errors.value = e
    } finally {
      loading.conversion = false
    }
  }

  async function fetchRevenue() {
    loading.revenue = true
    errors.value = null
    try {
      const [listRes, summaryRes] = await Promise.all([
        reportsApi.revenue(_buildParams()),
        reportsApi.revenueSummary(_buildParams()),
      ])
      revenueData.value = listRes.data
      revenueSummary.value = summaryRes.data ?? summaryRes
      if (listRes.meta) meta.value = listRes.meta
    } catch (e) {
      errors.value = e
    } finally {
      loading.revenue = false
    }
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'page') filters.page = 1
  }

  function resetFilters() {
    Object.assign(filters, {
      from: '',
      to: '',
      group_by: 'source',
      payment_status: null,
      page: 1,
      per_page: 25,
    })
  }

  function _buildParams() {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) p[k] = v
    })
    return p
  }

  function exportCsv(data, columns, filename) {
    const header = columns.map((c) => c.label).join(',')
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key] ?? ''
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        })
        .join(','),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    leadsData,
    appointmentsData,
    teamsData,
    agentsData,
    conversionData,
    revenueData,
    revenueSummary,
    meta,
    filters,
    loading,
    errors,
    activeFiltersCount,
    fetchLeads,
    fetchAppointments,
    fetchTeams,
    fetchAgents,
    fetchConversion,
    fetchRevenue,
    setFilter,
    resetFilters,
    exportCsv,
  }
})
