<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Mic,
  Sparkles,
  ChevronDown,
} from 'lucide-vue-next'
import { callsApi } from '@/api/calls'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime } from '@/utils/formatters'
import AppBadge from '@/components/base/AppBadge.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import CallMediaPanel from './CallMediaPanel.vue'

const props = defineProps({
  leadId: { type: [Number, String], required: true },
})

const { t } = useI18n()
const auth = useAuthStore()

const calls = ref([])
const meta = ref(null)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const filters = ref({ direction: '', status: '', agent_id: '' })
const expanded = ref(new Set())

// Agents only ever see their own calls, so the agent filter is for supervisors.
const canSeeOthers = computed(() => auth.can('CALLS_VIEW_ALL') || auth.can('CALLS_VIEW_TEAM'))

const directionOptions = computed(() => [
  { value: '', label: t('calls.allDirections') },
  { value: 'out', label: t('calls.direction.out') },
  { value: 'in', label: t('calls.direction.in') },
])

const statusOptions = computed(() => [
  { value: '', label: t('calls.allStatuses') },
  ...['completed', 'missed', 'no_answer', 'voicemail'].map((s) => ({ value: s, label: t(`calls.status.${s}`) })),
])

// Agents present in the loaded page, for the agent filter.
const agentOptions = ref([{ value: '', label: '' }])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { page: page.value, per_page: 15 }
    for (const [key, value] of Object.entries(filters.value)) {
      if (value) params[`filter[${key}]`] = value
    }
    const res = await callsApi.forLead(props.leadId, params)
    calls.value = res.data ?? []
    meta.value = res.meta ?? null
    for (const c of calls.value) {
      if (c.agent && !agentOptions.value.some((o) => o.value === c.agent.id)) {
        agentOptions.value.push({ value: c.agent.id, label: c.agent.name })
      }
    }
  } catch (e) {
    error.value = e?.message ?? t('calls.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  agentOptions.value[0].label = t('calls.allAgents')
  load()
})

watch(filters, () => {
  page.value = 1
  load()
}, { deep: true })

function goToPage(p) {
  page.value = p
  load()
}

function toggle(id) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function icon(call) {
  if (call.status === 'voicemail') return Voicemail
  if (call.status === 'missed' || call.status === 'no_answer') return PhoneMissed
  return call.direction === 'in' ? PhoneIncoming : PhoneOutgoing
}

function iconClass(call) {
  if (call.status === 'missed' || call.status === 'no_answer') return 'bg-danger-bg text-danger'
  if (call.status === 'voicemail') return 'bg-warning-bg text-warning'
  return 'bg-primary-light text-primary'
}

function statusVariant(status) {
  return {
    completed: 'success',
    missed: 'danger',
    no_answer: 'danger',
    voicemail: 'warning',
    ringing: 'info',
    answered: 'info',
    initiated: 'neutral',
  }[status] ?? 'neutral'
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <AppSelect v-model="filters.direction" :options="directionOptions" :placeholder="t('calls.allDirections')" />
      <AppSelect v-model="filters.status" :options="statusOptions" :placeholder="t('calls.allStatuses')" />
      <AppSelect
        v-if="canSeeOthers"
        v-model="filters.agent_id"
        :options="agentOptions"
        :placeholder="t('calls.allAgents')"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading && calls.length === 0" class="space-y-3">
      <AppSkeleton v-for="n in 3" :key="n" height="64px" class="rounded-xl" />
    </div>

    <p v-else-if="error" class="text-sm text-danger text-center py-6">{{ error }}</p>

    <!-- Empty -->
    <div v-else-if="calls.length === 0" class="text-center py-10">
      <PhoneOutgoing class="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-500">{{ t('calls.empty') }}</p>
      <p v-if="!canSeeOthers" class="text-xs text-gray-400 mt-1">{{ t('calls.ownOnlyHint') }}</p>
    </div>

    <!-- List -->
    <ul v-else class="space-y-2">
      <li v-for="call in calls" :key="call.id" class="rounded-xl border border-gray-100 bg-white">
        <button
          type="button"
          class="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
          @click="toggle(call.id)"
        >
          <div :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconClass(call)]">
            <component :is="icon(call)" class="w-4 h-4" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-900">
                {{ t(`calls.direction.${call.direction ?? 'out'}`) }}
              </span>
              <AppBadge :variant="statusVariant(call.status)" :label="t(`calls.status.${call.status}`)" />
              <Mic v-if="call.has_recording && call.can_listen" class="w-3.5 h-3.5 text-gray-400" :title="t('calls.hasRecording')" />
              <Sparkles v-if="call.has_summary && call.can_listen" class="w-3.5 h-3.5 text-primary" :title="t('calls.hasSummary')" />
            </div>
            <p class="text-xs text-gray-500 mt-0.5 truncate">
              {{ formatDateTime(call.started_at) }}
              · {{ call.agent?.name ?? t('calls.unknownAgent') }}
              · {{ call.contact_number ?? '—' }}
            </p>
          </div>

          <div class="text-right shrink-0">
            <p class="text-sm font-medium text-gray-900">{{ formatDuration(call.talk_seconds) }}</p>
            <p class="text-xs text-gray-400">{{ t('calls.talkTime') }}</p>
          </div>
          <ChevronDown :class="['w-4 h-4 text-gray-400 transition-transform', expanded.has(call.id) ? 'rotate-180' : '']" />
        </button>

        <!-- Details -->
        <div v-if="expanded.has(call.id)" class="border-t border-gray-100 px-4 py-3 space-y-3 text-sm">
          <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <dt class="text-xs text-gray-400">{{ t('calls.from') }}</dt>
              <dd class="text-gray-800">{{ call.from_number ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-400">{{ t('calls.to') }}</dt>
              <dd class="text-gray-800">{{ call.to_number ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-400">{{ t('calls.totalDuration') }}</dt>
              <dd class="text-gray-800">{{ formatDuration(call.duration_seconds) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-400">{{ t('calls.endedAt') }}</dt>
              <dd class="text-gray-800">{{ formatDateTime(call.ended_at) }}</dd>
            </div>
          </dl>

          <div v-if="call.can_listen && call.ai_summary" class="rounded-lg bg-primary-light/40 p-3">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <Sparkles class="w-3.5 h-3.5" /> {{ t('calls.aiSummary') }}
            </p>
            <p class="text-gray-800 whitespace-pre-line">{{ call.ai_summary }}</p>
          </div>
          <p v-else-if="call.can_listen && call.status === 'completed'" class="text-xs text-gray-400">
            {{ t('calls.summaryUnavailable') }}
          </p>

          <CallMediaPanel :call="call" />

          <p v-if="call.note" class="text-gray-700"><span class="text-xs text-gray-400">{{ t('calls.note') }} :</span> {{ call.note }}</p>
        </div>
      </li>
    </ul>

    <AppPagination
      v-if="meta && meta.last_page > 1"
      :current-page="meta.current_page"
      :last-page="meta.last_page"
      :total="meta.total"
      :from="meta.from ?? 0"
      :to="meta.to ?? 0"
      :per-page="meta.per_page ?? 15"
      :per-page-options="[15]"
      @page-change="goToPage"
    />
  </div>
</template>
