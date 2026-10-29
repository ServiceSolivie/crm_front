<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhoneOff } from 'lucide-vue-next'
import { teamLeaderApi } from '@/api/teamLeader'
import { formatDateTime } from '@/utils/formatters'
import AppCard from '@/components/base/AppCard.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'
import CallButton from './CallButton.vue'

/**
 * Open team leads that nobody has called recently (team leader follow-up).
 */
const { t } = useI18n()

const days = ref(2)
const data = ref({ days: 2, summary: { total: 0, never_called: 0 }, items: [] })
const loading = ref(false)

const dayOptions = computed(() =>
  [1, 2, 3, 7, 14].map((d) => ({ value: d, label: t('calls.notCalled.days', { n: d }, d) })),
)

async function load() {
  loading.value = true
  try {
    data.value = await teamLeaderApi.notCalled(days.value)
  } catch {
    data.value = { days: days.value, summary: { total: 0, never_called: 0 }, items: [] }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(days, load)
</script>

<template>
  <AppCard>
    <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
      <div>
        <h2 class="text-base font-semibold text-gray-900">{{ t('calls.notCalled.title') }}</h2>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ t('calls.notCalled.summary', { total: data.summary.total, never: data.summary.never_called }) }}
        </p>
      </div>
      <div class="w-44">
        <AppSelect v-model="days" :options="dayOptions" />
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <AppSkeleton v-for="n in 4" :key="n" height="40px" />
    </div>

    <div v-else-if="data.items.length === 0" class="py-10 text-center">
      <PhoneOff class="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">{{ t('calls.notCalled.empty') }}</p>
    </div>

    <ul v-else class="divide-y divide-gray-50">
      <li v-for="lead in data.items" :key="lead.id" class="flex items-center gap-3 py-3">
        <RouterLink :to="`/leads/${lead.id}`" class="flex flex-1 items-center gap-3 min-w-0 hover:text-primary">
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ lead.name }}</p>
            <p class="text-xs text-gray-400">{{ lead.reference }} · {{ lead.phone }}</p>
          </div>
        </RouterLink>
        <LeadStatusBadge :status="lead.status" class="shrink-0" />
        <div v-if="lead.assigned_agent" class="hidden sm:flex items-center gap-1.5 w-36 shrink-0">
          <AppAvatar :name="lead.assigned_agent.name" size="xs" />
          <span class="text-xs text-gray-600 truncate">{{ lead.assigned_agent.name }}</span>
        </div>
        <p class="w-40 shrink-0 text-right text-xs" :class="lead.last_call_at ? 'text-gray-500' : 'text-danger font-medium'">
          <template v-if="lead.last_call_at">
            {{ t('calls.notCalled.lastCall', { days: lead.days_since_last_call }, lead.days_since_last_call) }}
            <span class="block text-gray-400">{{ formatDateTime(lead.last_call_at) }}</span>
          </template>
          <template v-else>{{ t('calls.notCalled.never') }}</template>
        </p>
        <CallButton :lead="lead" />
      </li>
    </ul>
  </AppCard>
</template>
