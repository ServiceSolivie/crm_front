<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'
import { useReportFormat } from '@/composables/useReportFormat'

const { t } = useI18n()
const store = useReportsStore()
const { num, pct, dateTime } = useReportFormat()

const summary = computed(() => store.appointmentsSummary)
const kpis = computed(() => [
  { label: t('reports.kpi.appointments'), value: num(summary.value?.total) },
  { label: t('reports.kpi.planned'), value: num(summary.value?.planned), hint: summary.value?.overdue ? t('reports.kpi.overdue', { n: num(summary.value.overdue) }) : '' },
  { label: t('reports.kpi.completed'), value: num(summary.value?.completed), tone: 'success', hint: pct(summary.value?.completion_rate) },
  { label: t('reports.kpi.cancelled'), value: num((summary.value?.cancelled ?? 0) + (summary.value?.no_show ?? 0)), tone: 'danger' },
])

const COLUMNS = computed(() => [
  { key: 'lead', label: t('reports.colLead') },
  { key: 'scheduled_at', label: t('reports.colScheduledAt') },
  { key: 'status', label: t('reports.colStatus') },
  { key: 'assigned_to', label: t('reports.colAgent') },
  { key: 'insurance_type', label: t('reports.colType') },
])

const leadName = (r) => (r.lead ? [r.lead.first_name, r.lead.last_name].filter(Boolean).join(' ') || r.lead.reference : '—')

const CSV_COLUMNS = [
  { key: 'lead', label: 'Lead', value: leadName },
  { key: 'phone', label: 'Téléphone', value: (r) => r.lead?.phone },
  { key: 'scheduled_at', label: 'Planifié le' },
  { key: 'status', label: 'Statut', value: (r) => t('statuses.appointment.' + r.status, r.status) },
  { key: 'agent', label: 'Agent', value: (r) => r.agent?.name },
  { key: 'insurance_type', label: 'Assurance', value: (r) => (r.lead?.insurance_type ? t('insuranceTypes.' + r.lead.insurance_type, r.lead.insurance_type) : '') },
]

const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    await store.exportAllAppointments(CSV_COLUMNS, 'rapport-rendez-vous.csv')
  } finally {
    exporting.value = false
  }
}

const from = computed(() => (store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1))
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => store.fetchAppointments())
</script>

<template>
  <ReportShell
    team-filter
    :title="t('reports.titles.appointments')"
    :subtitle="t('reports.recordsCount', { n: num(store.meta.total) })"
    :exporting="exporting"
    @refresh="store.fetchAppointments()"
    @export="exportCsv"
  >
    <ReportKpis :items="kpis" :loading="store.loading.appointments && !summary" />

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <AppTable
        :columns="COLUMNS"
        :rows="store.appointmentsData"
        :loading="store.loading.appointments"
        :empty-title="t('reports.noAppointmentData')"
        :empty-description="t('reports.adjustDate')"
      >
        <template #cell-lead="{ row }">
          <RouterLink
            v-if="row.lead?.id"
            :to="{ name: 'leads.detail', params: { id: row.lead.id } }"
            class="flex items-center gap-2.5 min-w-0 hover:text-primary"
          >
            <AppAvatar :name="leadName(row)" size="xs" tone="soft" />
            <span class="font-medium truncate">{{ leadName(row) }}</span>
          </RouterLink>
          <span v-else class="text-gray-400">—</span>
        </template>
        <template #cell-scheduled_at="{ value }">
          <span class="font-mono text-[12.5px] whitespace-nowrap">{{ dateTime(value) }}</span>
        </template>
        <template #cell-status="{ value }">
          <AppointmentStatusBadge :status="value" />
        </template>
        <template #cell-assigned_to="{ row }">
          <span v-if="row.agent" class="flex items-center gap-2">
            <AppAvatar :name="row.agent.name" size="xs" />
            <span class="truncate">{{ row.agent.name }}</span>
          </span>
          <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
        </template>
        <template #cell-insurance_type="{ row }">
          <span
            v-if="row.lead?.insurance_type"
            class="px-1.5 rounded text-xs leading-5 font-medium bg-gray-100 text-gray-700"
            :title="t('insuranceTypes.' + row.lead.insurance_type, row.lead.insurance_type)"
          >{{ t('insuranceTypesShort.' + row.lead.insurance_type, row.lead.insurance_type) }}</span>
          <span v-else class="text-gray-400">—</span>
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
          @page-change="(p) => { store.setFilter('page', p); store.fetchAppointments() }"
          @per-page-change="(p) => { store.setFilter('per_page', p); store.fetchAppointments() }"
        />
      </div>
    </section>
  </ReportShell>
</template>
