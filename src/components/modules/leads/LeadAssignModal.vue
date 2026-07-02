<script setup>
import { ref, watch, computed } from 'vue'
import { Search } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { usersApi } from '@/api/users'
import { teamLeaderApi } from '@/api/teamLeader'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps({
  open: { type: Boolean, default: false },
  currentAssigneeId: { type: [Number, String, null], default: null },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'assign'])

const auth = useAuthStore()
const search = ref('')
const agents = ref([])
const loadingAgents = ref(false)
const selected = ref(null)

watch(
  () => props.open,
  async (val) => {
    if (val) {
      selected.value = props.currentAssigneeId
      await loadAgents()
    }
  },
)

async function loadAgents() {
  loadingAgents.value = true
  try {
    if (auth.hasRole('team_leader')) {
      const data = await teamLeaderApi.agents()
      agents.value = data.map((a) => ({ id: a.id, name: a.name, email: a.email, roles: a.roles }))
    } else {
      const { data } = await usersApi.list({ role: 'agent', per_page: 100 })
      agents.value = data.filter((u) => u.roles.includes('agent'))
    }
  } finally {
    loadingAgents.value = false
  }
}

const filtered = computed(() => {
  if (!search.value) return agents.value
  const q = search.value.toLowerCase()
  return agents.value.filter(
    (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
  )
})

function confirm() {
  if (selected.value !== null) {
    const agent = agents.value.find((a) => a.id === selected.value)
    emit('assign', selected.value, agent ?? null)
  }
}
</script>

<template>
  <AppModal :open="open" title="Assign Lead" size="sm" @close="emit('close')">
    <!-- Search -->
    <div class="relative mb-4">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        v-model="search"
        type="text"
        placeholder="Search agents…"
        class="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-gray-50 text-sm
               focus:outline-none focus:border-primary focus:bg-white"
      />
    </div>

    <!-- Agent list -->
    <div class="space-y-1 max-h-64 overflow-y-auto -mx-1 px-1">
      <div
        v-if="loadingAgents"
        v-for="n in 4"
        :key="n"
        class="h-12 rounded-lg bg-gray-100 animate-pulse"
      />
      <button
        v-else
        v-for="agent in filtered"
        :key="agent.id"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
          selected === agent.id
            ? 'bg-primary-light border border-primary/30'
            : 'hover:bg-gray-50 border border-transparent',
        ]"
        @click="selected = agent.id"
      >
        <AppAvatar :name="agent.name" size="sm" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">{{ agent.name }}</p>
          <p class="text-xs text-gray-500 truncate">{{ agent.email }}</p>
        </div>
        <div
          v-if="selected === agent.id"
          class="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0"
        >
          <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </button>

      <p v-if="!loadingAgents && filtered.length === 0" class="text-center py-6 text-sm text-gray-400">
        No agents found
      </p>
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">Cancel</AppButton>
      <AppButton :loading="loading" :disabled="selected === null" @click="confirm">
        Assign
      </AppButton>
    </template>
  </AppModal>
</template>
