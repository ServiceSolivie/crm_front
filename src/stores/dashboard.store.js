import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { dashboardApi } from '@/api/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const kpis = ref(null)
  const statistics = ref(null)
  const aggregations = ref(null)
  const charts = ref(null)
  const revenue = ref(null)

  const filters = reactive({ days: 30, from: null, to: null })

  const loading = reactive({
    kpis: false,
    statistics: false,
    aggregations: false,
    charts: false,
    revenue: false,
  })

  function _params() {
    if (filters.from && filters.to) return { from: filters.from, to: filters.to }
    return { days: filters.days ?? 30 }
  }

  async function fetchKpis() {
    loading.kpis = true
    try {
      kpis.value = await dashboardApi.kpis(_params())
    } finally {
      loading.kpis = false
    }
  }

  async function fetchStatistics() {
    loading.statistics = true
    try {
      statistics.value = await dashboardApi.statistics(_params())
    } finally {
      loading.statistics = false
    }
  }

  async function fetchAggregations() {
    loading.aggregations = true
    try {
      aggregations.value = await dashboardApi.aggregations(_params())
    } finally {
      loading.aggregations = false
    }
  }

  async function fetchCharts() {
    loading.charts = true
    try {
      charts.value = await dashboardApi.charts(_params())
    } finally {
      loading.charts = false
    }
  }

  async function fetchRevenue() {
    loading.revenue = true
    try {
      revenue.value = await dashboardApi.revenue(_params())
    } catch {
      revenue.value = null
    } finally {
      loading.revenue = false
    }
  }

  async function fetchAll() {
    await Promise.all([fetchKpis(), fetchStatistics(), fetchAggregations(), fetchCharts(), fetchRevenue()])
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key === 'days') {
      filters.from = null
      filters.to = null
    } else if (key === 'from' || key === 'to') {
      filters.days = null
    }
    fetchAll()
  }

  return {
    kpis,
    statistics,
    aggregations,
    charts,
    revenue,
    filters,
    loading,
    fetchAll,
    fetchKpis,
    fetchStatistics,
    fetchAggregations,
    fetchCharts,
    fetchRevenue,
    setFilter,
  }
})
