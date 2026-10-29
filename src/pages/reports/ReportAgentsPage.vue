<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'
import ReportPerformanceTable from '@/components/modules/reports/ReportPerformanceTable.vue'
import { useReportFormat } from '@/composables/useReportFormat'

const { t } = useI18n()
const store = useReportsStore()
const { num, pct } = useReportFormat()

const kpis = computed(() => {
  const rows = store.agentsData
  const leads = rows.reduce((s, r) => s + (r.leads?.total ?? 0), 0)
  const validated = rows.reduce((s, r) => s + (r.leads?.validated ?? 0), 0)
  return [
    { label: t('reports.kpi.leads'), value: num(leads) },
    { label: t('reports.kpi.appointments'), value: num(rows.reduce((s, r) => s + (r.appointments?.total ?? 0), 0)) },
    { label: t('reports.kpi.validated'), value: num(validated), tone: 'success' },
    { label: t('reports.kpi.conversion'), value: pct(leads ? (validated / leads) * 100 : null), hint: t('reports.kpi.agentsCount', { n: rows.length }) },
  ]
})

const CSV_COLUMNS = [
  { key: 'name', label: 'Agent' },
  { key: 'team', label: 'Équipe', value: (r) => r.team?.name },
  { key: 'leads', label: 'Leads', value: (r) => r.leads?.total },
  { key: 'validated', label: 'Validés', value: (r) => r.leads?.validated },
  { key: 'conversion', label: 'Conversion %', value: (r) => r.leads?.conversion_rate },
  { key: 'appointments', label: 'Rendez-vous', value: (r) => r.appointments?.total },
  { key: 'calls', label: 'Appels', value: (r) => r.calls?.total },
  { key: 'phone_calls', label: 'Appels Ringover', value: (r) => r.phone_calls?.total },
  { key: 'phone_answered', label: 'Appels décrochés', value: (r) => r.phone_calls?.answered },
  { key: 'phone_answer_rate', label: 'Taux de décroché %', value: (r) => r.phone_calls?.answer_rate },
  { key: 'talk_minutes', label: 'Temps de conversation (min)', value: (r) => Math.round((r.phone_calls?.talk_seconds ?? 0) / 60) },
  { key: 'calls_per_won', label: 'Appels par lead validé', value: (r) => r.phone_calls?.per_validated_lead },
  { key: 'revenue', label: 'CA encaissé', value: (r) => r.revenue?.received },
]

function talkTime(seconds) {
  const m = Math.round((seconds ?? 0) / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

// Ringover call figures, shown once the API returns them (calls permission)
const callKpis = computed(() => {
  const rows = store.agentsData.filter((r) => r.phone_calls)
  if (!rows.length) return []
  const total = rows.reduce((s, r) => s + (r.phone_calls.total ?? 0), 0)
  const answered = rows.reduce((s, r) => s + (r.phone_calls.answered ?? 0), 0)
  const talk = rows.reduce((s, r) => s + (r.phone_calls.talk_seconds ?? 0), 0)
  return [
    { label: t('dashboard.calls.outbound'), value: num(total) },
    { label: t('dashboard.calls.answerRate'), value: pct(total ? (answered / total) * 100 : null), hint: t('dashboard.calls.answeredOf', { answered, total }) },
    { label: t('dashboard.calls.talkTime'), value: talkTime(talk) },
    { label: t('dashboard.calls.averageTalk'), value: talkTime(answered ? talk / answered : 0) },
  ]
})

onMounted(() => store.fetchAgents())
</script>

<template>
  <ReportShell
    team-filter
    :title="t('reports.titles.agents')"
    :subtitle="t('reports.performanceByAgent')"
    @refresh="store.fetchAgents()"
    @export="store.exportCsv(store.agentsData, CSV_COLUMNS, 'rapport-agents.csv')"
  >
    <ReportKpis :items="kpis" :loading="store.loading.agents" />
    <ReportKpis v-if="callKpis.length" :items="callKpis" :loading="store.loading.agents" />
    <ReportPerformanceTable
      kind="agent"
      :rows="store.agentsData"
      :loading="store.loading.agents"
      :empty-text="t('reports.noAgentData')"
    />
  </ReportShell>
</template>
