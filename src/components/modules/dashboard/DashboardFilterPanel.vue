<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { teamsApi } from '@/api/teams'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/stores/auth.store'
import AppSelect from '@/components/base/AppSelect.vue'

const props = defineProps({
  teamId: { type: [Number, String, null], default: null },
  agentId: { type: [Number, String, null], default: null },
  showTeamSelect: { type: Boolean, default: true },
  fixedTeamId: { type: [Number, String, null], default: null },
})
const emit = defineEmits(['update:teamId', 'update:agentId'])
const { t } = useI18n()
const auth = useAuthStore()

// Report-only roles (marketing) may not list users: no agent filter for them
const canListAgents = computed(() => auth.can('USERS_VIEW'))

const teams = ref([])
const agents = ref([])
const loadingTeams = ref(false)
const loadingAgents = ref(false)

const effectiveTeamId = computed(() => props.teamId || props.fixedTeamId || null)

const teamOptions = computed(() => [
  { value: '', label: t('dashboard.allTeams') },
  ...teams.value.map((tm) => ({ value: String(tm.id), label: tm.name })),
])

const agentOptions = computed(() => [
  { value: '', label: t('dashboard.allAgents') },
  ...agents.value.map((u) => ({ value: String(u.id), label: u.name })),
])

async function loadTeams() {
  if (!props.showTeamSelect) return
  loadingTeams.value = true
  try {
    const { data } = await teamsApi.list({ per_page: 100 })
    teams.value = data ?? []
  } finally {
    loadingTeams.value = false
  }
}

async function loadAgents(teamId) {
  if (!teamId || !canListAgents.value) {
    agents.value = []
    return
  }
  loadingAgents.value = true
  try {
    const { data } = await usersApi.list({ team_id: teamId, role: 'agent', per_page: 100 })
    agents.value = data ?? []
  } finally {
    loadingAgents.value = false
  }
}

watch(effectiveTeamId, (val) => loadAgents(val), { immediate: true })

onMounted(loadTeams)

function onTeamChange(v) {
  emit('update:teamId', v ? Number(v) : null)
  emit('update:agentId', null)
}

function onAgentChange(v) {
  emit('update:agentId', v ? Number(v) : null)
}
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <AppSelect
      v-if="showTeamSelect"
      :model-value="teamId ? String(teamId) : ''"
      :options="teamOptions"
      :disabled="loadingTeams"
      class="w-44"
      @update:model-value="onTeamChange"
    />
    <AppSelect
      v-if="effectiveTeamId && canListAgents"
      :model-value="agentId ? String(agentId) : ''"
      :options="agentOptions"
      :disabled="loadingAgents"
      class="w-44"
      @update:model-value="onAgentChange"
    />
    <span
      v-else-if="showTeamSelect && canListAgents"
      class="text-xs text-gray-400 italic"
    >{{ t('dashboard.selectTeamFirst') }}</span>
  </div>
</template>
