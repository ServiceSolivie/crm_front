<script setup>
import { onMounted } from 'vue'
import { Download, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { formatPercent, formatNumber } from '@/utils/formatters'

const { t } = useI18n()
const store = useReportsStore()

const CSV_COLUMNS = [
  { key: 'name', label: 'Agent' },
  { key: 'leads_count', label: 'Leads' },
  { key: 'won_count', label: 'Won' },
  { key: 'conversion_rate', label: 'Conversion %' },
  { key: 'appointments_count', label: 'Appointments' },
]

onMounted(() => store.fetchAgents())
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('reports.agents') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ t('reports.performanceByAgent') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="store.exportCsv(store.agentsData, CSV_COLUMNS, 'agents-report.csv')">
          <template #icon><Download class="w-4 h-4" /></template>
          {{ t('reports.exportCsv') }}
        </AppButton>
      </div>
    </div>

    <!-- Date range controls -->
    <AppCard padding="sm">
      <div class="flex items-center gap-2 flex-wrap justify-between">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm text-gray-500">{{ t('reports.dateRange') }}</span>
          <AppInput
            :model-value="store.filters.from"
            type="date"
            class="w-36"
            @update:model-value="(v) => { store.setFilter('from', v); store.fetchAgents() }"
          />
          <span class="text-gray-400 text-sm">–</span>
          <AppInput
            :model-value="store.filters.to"
            type="date"
            class="w-36"
            @update:model-value="(v) => { store.setFilter('to', v); store.fetchAgents() }"
          />
        </div>
        <AppButton
          v-if="store.activeFiltersCount"
          variant="danger"
          size="sm"
          @click="store.resetFilters(); store.fetchAgents()"
        >
          <template #icon><X class="w-3.5 h-3.5" /></template>
          {{ t('common.clear') }}
        </AppButton>
      </div>
    </AppCard>

    <div v-if="store.loading.agents" class="space-y-3">
      <AppCard v-for="n in 6" :key="n" padding="sm">
        <div class="flex items-center gap-4">
          <AppSkeleton width="36px" height="36px" class="rounded-full shrink-0" />
          <AppSkeleton height="16px" width="30%" class="flex-1" />
          <div class="flex gap-6">
            <AppSkeleton v-for="i in 4" :key="i" height="16px" width="50px" />
          </div>
        </div>
      </AppCard>
    </div>

    <AppCard v-else-if="store.agentsData.length === 0" class="text-center py-12">
      <p class="text-sm text-gray-400">{{ t('reports.noAgentData') }}</p>
    </AppCard>

    <div v-else class="space-y-2">
      <AppCard
        v-for="(agent, i) in store.agentsData"
        :key="agent.id ?? i"
        padding="sm"
      >
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-3 flex-1 min-w-48">
            <span class="text-lg font-bold text-gray-300 w-7 text-right shrink-0">{{ i + 1 }}</span>
            <AppAvatar :name="agent.name" size="sm" class="shrink-0" />
            <div>
              <p class="font-medium text-gray-900 text-sm">{{ agent.name }}</p>
              <p v-if="agent.team" class="text-xs text-gray-400">{{ agent.team.name }}</p>
            </div>
          </div>
          <div class="flex items-center gap-6 shrink-0">
            <div class="text-center">
              <p class="text-lg font-bold text-gray-900">{{ formatNumber(agent.leads.total ?? 0) }}</p>
              <p class="text-xs text-gray-400">{{ t('reports.leadsCol') }}</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-bold text-success">{{ formatNumber(agent.leads.validated ?? 0) }}</p>
              <p class="text-xs text-gray-400">{{ t('reports.won') }}</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-bold text-primary">
                {{ agent.leads.conversion_rate != null ? formatPercent(agent.leads.conversion_rate) : '—' }}
              </p>
              <p class="text-xs text-gray-400">{{ t('reports.convCol') }}</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-bold text-info">{{ formatNumber(agent.appointments.total ?? 0) }}</p>
              <p class="text-xs text-gray-400">{{ t('reports.appts') }}</p>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
