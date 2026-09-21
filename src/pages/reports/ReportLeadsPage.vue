<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'
import { useReportFormat } from '@/composables/useReportFormat'

const { t } = useI18n()
const store = useReportsStore()
const { num, pct, dateTime } = useReportFormat()

const summary = computed(() => store.leadsSummary)
const kpis = computed(() => [
  { label: t('reports.kpi.leads'), value: num(summary.value?.total) },
  { label: t('reports.kpi.validated'), value: num(summary.value?.validated), tone: 'success' },
  { label: t('reports.kpi.conversion'), value: pct(summary.value?.conversion_rate) },
  { label: t('reports.kpi.unassigned'), value: num(summary.value?.unassigned), tone: summary.value?.unassigned ? 'danger' : undefined },
])

const COLUMNS = computed(() => [
  { key: 'name', label: t('reports.colName') },
  { key: 'phone', label: t('reports.colPhone') },
  { key: 'status', label: t('reports.colStatus') },
  { key: 'insurance_type', label: t('reports.colType') },
  { key: 'source', label: t('reports.colSource') },
  { key: 'assigned_to', label: t('reports.colAgent') },
  { key: 'created_at', label: t('leads.receivedAt') },
])

const fullName = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.reference || '—'

const CSV_COLUMNS = [
  { key: 'reference', label: 'Référence' },
  { key: 'name', label: 'Nom', value: fullName },
  { key: 'phone', label: 'Téléphone' },
  { key: 'email', label: 'E-mail' },
  { key: 'status', label: 'Statut', value: (r) => t('statuses.lead.' + r.status, r.status) },
  { key: 'insurance_type', label: 'Assurance', value: (r) => (r.insurance_type ? t('insuranceTypes.' + r.insurance_type, r.insurance_type) : '') },
  { key: 'source', label: 'Source', value: (r) => r.lead_source?.name },
  { key: 'agent', label: 'Agent', value: (r) => r.assigned_agent?.name },
  { key: 'created_at', label: 'Reçu le' },
]

const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    await store.exportAllLeads(CSV_COLUMNS, 'rapport-leads.csv')
  } finally {
    exporting.value = false
  }
}

const from = computed(() => (store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1))
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => store.fetchLeads())
</script>

<template>
  <ReportShell
    team-filter
    :title="t('reports.titles.leads')"
    :subtitle="t('reports.recordsCount', { n: num(store.meta.total) })"
    :exporting="exporting"
    @refresh="store.fetchLeads()"
    @export="exportCsv"
  >
    <ReportKpis :items="kpis" :loading="store.loading.leads && !summary" />

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <AppTable
        :columns="COLUMNS"
        :rows="store.leadsData"
        :loading="store.loading.leads"
        :empty-title="t('reports.noLeadData')"
        :empty-description="t('reports.adjustDate')"
      >
        <template #cell-name="{ row }">
          <RouterLink :to="{ name: 'leads.detail', params: { id: row.id } }" class="flex items-center gap-2.5 min-w-0 hover:text-primary">
            <AppAvatar :name="fullName(row)" size="xs" tone="soft" />
            <span class="font-medium truncate">{{ fullName(row) }}</span>
          </RouterLink>
        </template>
        <template #cell-phone="{ value }">
          <span class="font-mono text-[12.5px]">{{ value || '—' }}</span>
        </template>
        <template #cell-status="{ value }">
          <LeadStatusBadge :status="value" />
        </template>
        <template #cell-insurance_type="{ value }">
          <span v-if="value" class="px-1.5 rounded text-xs leading-5 font-medium bg-gray-100 text-gray-700" :title="t('insuranceTypes.' + value, value)">
            {{ t('insuranceTypesShort.' + value, value) }}
          </span>
          <span v-else class="text-gray-400">—</span>
        </template>
        <template #cell-source="{ row }">
          <span class="text-gray-600">{{ row.lead_source?.name ?? '—' }}</span>
        </template>
        <template #cell-assigned_to="{ row }">
          <span v-if="row.assigned_agent" class="flex items-center gap-2">
            <AppAvatar :name="row.assigned_agent.name" size="xs" />
            <span class="truncate">{{ row.assigned_agent.name }}</span>
          </span>
          <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
        </template>
        <template #cell-created_at="{ value }">
          <span class="font-mono text-[12.5px] whitespace-nowrap">{{ dateTime(value) }}</span>
        </template>
      </AppTable>
      <div class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          :per-page-options="[25, 50, 100]"
          @page-change="(p) => { store.setFilter('page', p); store.fetchLeads() }"
          @per-page-change="(p) => { store.setFilter('per_page', p); store.fetchLeads() }"
        />
      </div>
    </section>
  </ReportShell>
</template>
