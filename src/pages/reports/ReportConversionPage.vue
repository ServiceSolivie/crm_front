<script setup>
import { onMounted, computed } from 'vue'
import { Download, TrendingUp, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppProgressBar from '@/components/base/AppProgressBar.vue'
import { formatPercent, formatNumber } from '@/utils/formatters'

const { t } = useI18n()
const store = useReportsStore()

const GROUP_BY_OPTIONS = computed(() => [
  { value: 'source', label: t('reports.bySource') },
  { value: 'team', label: t('reports.byTeam') },
  { value: 'agent', label: t('reports.byAgent') },
  { value: 'insurance_type', label: t('reports.byInsuranceType') },
])

const CSV_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'total', label: 'Total Leads' },
  { key: 'won', label: 'Won' },
  { key: 'conversion_rate', label: 'Conversion Rate %' },
]

onMounted(() => store.fetchConversion())

function changeGroupBy(val) {
  store.setFilter('group_by', val)
  store.fetchConversion()
}
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('reports.conversion') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ t('reports.winRate') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="store.exportCsv(store.conversionData, CSV_COLUMNS, 'conversion-report.csv')">
          <template #icon><Download class="w-4 h-4" /></template>
          {{ t('reports.export') }}
        </AppButton>
      </div>
    </div>

    <!-- Controls -->
    <AppCard padding="sm">
      <div class="flex items-center gap-2 flex-wrap justify-between">
        <div class="flex items-center gap-2 flex-wrap">
          <AppSelect
            :model-value="store.filters.group_by"
            :options="GROUP_BY_OPTIONS"
            class="w-44"
            @update:model-value="changeGroupBy"
          />
          <span class="text-gray-300">|</span>
          <span class="text-sm text-gray-500">{{ t('reports.dateRange') }}</span>
          <AppInput
            :model-value="store.filters.from"
            type="date"
            class="w-36"
            @update:model-value="(v) => { store.setFilter('from', v); store.fetchConversion() }"
          />
          <span class="text-gray-400 text-sm">–</span>
          <AppInput
            :model-value="store.filters.to"
            type="date"
            class="w-36"
            @update:model-value="(v) => { store.setFilter('to', v); store.fetchConversion() }"
          />
        </div>
        <AppButton
          v-if="store.activeFiltersCount"
          variant="danger"
          size="sm"
          @click="store.resetFilters(); store.fetchConversion()"
        >
          <template #icon><X class="w-3.5 h-3.5" /></template>
          {{ t('common.clear') }}
        </AppButton>
      </div>
    </AppCard>

    <div v-if="store.loading.conversion" class="space-y-3">
      <AppCard v-for="n in 5" :key="n" padding="sm">
        <div class="space-y-2">
          <AppSkeleton height="14px" width="40%" />
          <AppSkeleton height="8px" />
        </div>
      </AppCard>
    </div>

    <AppCard v-else-if="store.conversionData.length === 0" class="text-center py-12">
      <TrendingUp class="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-400">{{ t('reports.noConversionData') }}</p>
    </AppCard>

    <div v-else class="space-y-3">
      <AppCard
        v-for="(item, i) in store.conversionData"
        :key="i"
        padding="sm"
      >
        <div class="flex items-center justify-between mb-2 gap-4">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm font-bold text-gray-300 shrink-0">{{ i + 1 }}</span>
            <span class="font-medium text-gray-900 text-sm truncate">{{ item.name }}</span>
          </div>
          <div class="flex items-center gap-4 shrink-0 text-sm">
            <span class="text-gray-400">{{ formatNumber(item.total ?? 0) }} {{ t('reports.leadsCol').toLowerCase() }}</span>
            <span class="text-success font-medium">{{ formatNumber(item.won ?? 0) }} {{ t('reports.won').toLowerCase() }}</span>
            <span class="font-bold text-primary">{{ formatPercent(item.conversion_rate ?? 0) }}</span>
          </div>
        </div>
        <AppProgressBar
          :value="item.conversion_rate ?? 0"
          color="bg-primary"
          height="h-2"
        />
      </AppCard>
    </div>
  </div>
</template>
