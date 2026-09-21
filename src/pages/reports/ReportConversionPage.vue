<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'
import { useReportFormat } from '@/composables/useReportFormat'

const { t } = useI18n()
const store = useReportsStore()
const { num, pct } = useReportFormat()

const GROUPS = computed(() => [
  { value: 'source', label: t('reports.bySource') },
  { value: 'team', label: t('reports.byTeam') },
  { value: 'agent', label: t('reports.byAgent') },
  { value: 'insurance_type', label: t('reports.byInsuranceType') },
])

function changeGroupBy(val) {
  store.setFilter('group_by', val)
  store.fetchConversion()
}

// Insurance types come back as enum keys; show their label
function rowName(item) {
  if (store.filters.group_by === 'insurance_type' && item.name) return t('insuranceTypes.' + item.name, item.name)
  return item.name ?? '—'
}

const rows = computed(() =>
  [...store.conversionData].sort((a, b) => (b.conversion_rate ?? 0) - (a.conversion_rate ?? 0)),
)
const maxRate = computed(() => Math.max(1, ...rows.value.map((r) => r.conversion_rate ?? 0)))

const totals = computed(() => {
  const total = store.conversionData.reduce((s, r) => s + (r.total ?? 0), 0)
  const won = store.conversionData.reduce((s, r) => s + (r.won ?? 0), 0)
  return { total, won, rate: total ? (won / total) * 100 : null }
})

const kpis = computed(() => [
  { label: t('reports.kpi.leads'), value: num(totals.value.total) },
  { label: t('reports.kpi.validated'), value: num(totals.value.won), tone: 'success' },
  { label: t('reports.kpi.conversion'), value: pct(totals.value.rate) },
])

const CSV_COLUMNS = [
  { key: 'name', label: 'Groupe', value: rowName },
  { key: 'total', label: 'Leads' },
  { key: 'won', label: 'Validés' },
  { key: 'conversion_rate', label: 'Conversion %' },
]

onMounted(() => store.fetchConversion())
</script>

<template>
  <ReportShell
    team-filter
    :title="t('reports.titles.conversion')"
    :subtitle="t('reports.winRate')"
    @refresh="store.fetchConversion()"
    @export="store.exportCsv(rows, CSV_COLUMNS, 'rapport-conversion.csv')"
  >
    <template #filters>
      <div role="group" :aria-label="t('reports.groupBy')" class="flex gap-0.5 p-[3px] bg-gray-200 rounded-[9px]">
        <button
          v-for="g in GROUPS"
          :key="g.value"
          type="button"
          :aria-pressed="store.filters.group_by === g.value"
          :class="[
            'h-7.5 px-3 rounded-[7px] text-[13px] whitespace-nowrap transition-colors',
            store.filters.group_by === g.value ? 'bg-white text-gray-900 font-medium shadow-[0_1px_2px_rgba(17,24,39,0.08)]' : 'text-gray-600 hover:text-gray-900',
          ]"
          @click="changeGroupBy(g.value)"
        >{{ g.label }}</button>
      </div>
    </template>

    <ReportKpis :items="kpis" :loading="store.loading.conversion" />

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="grid grid-cols-[minmax(160px,1.4fr)_80px_80px_minmax(200px,2fr)] gap-x-4 items-center h-10 px-5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
        <span>{{ GROUPS.find((g) => g.value === store.filters.group_by)?.label }}</span>
        <span class="text-right">{{ t('reports.leadsCol') }}</span>
        <span class="text-right">{{ t('reports.validated') }}</span>
        <span>{{ t('reports.conversionCol') }}</span>
      </div>

      <div v-if="store.loading.conversion" class="divide-y divide-gray-100">
        <div v-for="n in 6" :key="n" class="grid grid-cols-[minmax(160px,1.4fr)_80px_80px_minmax(200px,2fr)] gap-x-4 items-center h-[50px] px-5">
          <AppSkeleton height="12px" width="60%" /><AppSkeleton height="10px" /><AppSkeleton height="10px" /><AppSkeleton height="8px" />
        </div>
      </div>

      <p v-else-if="!rows.length" class="px-5 py-12 text-center text-sm text-gray-500">{{ t('reports.noConversionData') }}</p>

      <div v-else class="text-[13px]">
        <div
          v-for="(item, i) in rows"
          :key="item.id ?? item.name ?? i"
          class="grid grid-cols-[minmax(160px,1.4fr)_80px_80px_minmax(200px,2fr)] gap-x-4 items-center h-[50px] px-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
        >
          <span class="font-medium text-gray-900 truncate">{{ rowName(item) }}</span>
          <span class="text-right font-mono">{{ num(item.total) }}</span>
          <span class="text-right font-mono text-success-text">{{ num(item.won) }}</span>
          <span class="flex items-center gap-2.5">
            <span class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <span
                :class="['block h-full rounded-full', (item.conversion_rate ?? 0) >= (totals.rate ?? 0) ? 'bg-primary' : 'bg-indigo-300']"
                :style="{ width: `${((item.conversion_rate ?? 0) / maxRate) * 100}%` }"
              />
            </span>
            <span class="w-14 text-right font-mono font-medium">{{ pct(item.conversion_rate) }}</span>
          </span>
        </div>
      </div>
    </section>
  </ReportShell>
</template>
