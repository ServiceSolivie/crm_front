import { ref } from 'vue'
import { defineStore } from 'pinia'
import { gestionApi } from '@/api/gestion'

export const useGestionDashboardStore = defineStore('gestionDashboard', () => {
  const stats = ref(null)
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      stats.value = await gestionApi.dashboard()
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, fetchDashboard }
})
