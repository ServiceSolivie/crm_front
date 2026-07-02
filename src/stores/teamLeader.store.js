import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { teamLeaderApi } from '@/api/teamLeader'

export const useTeamLeaderStore = defineStore('teamLeader', () => {
  const agents = ref([])
  const followUps = ref({ summary: { overdue: 0, warning: 0, due_today: 0, total: 0 }, items: [] })

  const loading = reactive({
    agents: false,
    followUps: false,
  })

  async function fetchAgents() {
    loading.agents = true
    try {
      agents.value = await teamLeaderApi.agents()
    } finally {
      loading.agents = false
    }
  }

  async function fetchFollowUps() {
    loading.followUps = true
    try {
      followUps.value = await teamLeaderApi.followUps()
    } finally {
      loading.followUps = false
    }
  }

  return { agents, followUps, loading, fetchAgents, fetchFollowUps }
})
