<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, SlidersHorizontal, AlertCircle } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { LEAD_STATUS, LEAD_STAGES } from '@/utils/enums'
import { formatCurrency } from '@/utils/formatters'

import AppSkeleton from '@/components/base/AppSkeleton.vue'

import KpiStripCell from '@/components/modules/dashboard/KpiStripCell.vue'
import MyDayPanel from '@/components/modules/dashboard/MyDayPanel.vue'
import DashboardDateFilter from '@/components/modules/dashboard/DashboardDateFilter.vue'
import DashboardFilterPanel from '@/components/modules/dashboard/DashboardFilterPanel.vue'

import DailyBarsChart from '@/components/charts/DailyBarsChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'

/* ── Stores ────────────────────────────────────────────────── */
const auth = useAuthStore()
const dash = useDashboardStore()
const { t, locale } = useI18n()

/* ── Permissions ───────────────────────────────────────────── */
const canViewGlobal = computed(() => auth.can('DASHBOARD_VIEW_GLOBAL'))
const canViewTeam = computed(() => auth.can('DASHBOARD_VIEW_TEAM'))
const showAggregations = computed(() => canViewGlobal.value || canViewTeam.value)
const canViewRevenue = computed(() =>
  auth.can('REVENUE_VIEW_ALL') || auth.can('REVENUE_VIEW_TEAM') || auth.can('REVENUE_VIEW_PERSONAL'),
)
const canViewAppointments = computed(() => auth.canAny('APPOINTMENTS_VIEW'))

/* ── Header ────────────────────────────────────────────────── */
const firstName = computed(() => (auth.user?.name ?? '').split(' ')[0])
const todayLabel = computed(() => {
  const s = new Date().toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

/* ── Date filter ───────────────────────────────────────────── */
const filterModel = computed({
  get: () => ({ days: dash.filters.days, from: dash.filters.from, to: dash.filters.to }),
  set: (v) => {
    if (v.days) dash.setFilter('days', v.days)
    else if (v.from && v.to) {
      dash.setFilter('from', v.from)
      dash.setFilter('to', v.to)
    }
  },
})

/* ── Team / Agent filters ──────────────────────────────────── */
const showTeamAgentFilters = computed(() => canViewGlobal.value || (canViewTeam.value && !auth.hasRole('team_leader')))
const showFilterPanel = ref(false)
const fixedTeamId = computed(() => (!canViewGlobal.value && canViewTeam.value) ? auth.user?.team_id : null)
const activeTeamAgentCount = computed(
  () => (dash.filters.team_id ? 1 : 0) + (dash.filters.agent_id ? 1 : 0),
)

/* ── KPI strip ─────────────────────────────────────────────── */
const leads = computed(() => dash.kpis?.leads ?? null)
const appointments = computed(() => dash.kpis?.appointments ?? null)
const agents = computed(() => dash.kpis?.agents ?? null)
const revenueKpis = computed(() => dash.revenue?.kpis ?? null)

function fmtNumber(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB').format(v)
}
function fmtRate(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }).format(v) + ' %'
}

/* Change vs the same-length period just before (kpis.*.previous) */
function delta(current, previous, isRate = false) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  const fmt = new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
  if (isRate) {
    const diff = Number(current) - Number(previous)
    return { text: t('dashboard.deltaPoints', { v: fmt.format(diff) }), tone: diff > 0 ? 'success' : diff < 0 ? 'danger' : 'muted' }
  }
  if (!Number(previous)) return null
  const pct = ((Number(current) - Number(previous)) / Number(previous)) * 100
  return { text: t('dashboard.deltaPercent', { v: fmt.format(pct) }), tone: pct > 0 ? 'success' : pct < 0 ? 'danger' : 'muted' }
}
const leadsDelta = computed(() => delta(leads.value?.total, leads.value?.previous?.total))
// A rate means nothing when the previous period had no leads
const conversionDelta = computed(() =>
  leads.value?.previous?.total ? delta(leads.value?.conversion_rate, leads.value.previous.conversion_rate, true) : null,
)

const leadsSpark = computed(() => (dash.charts?.leads_over_time ?? []).map((d) => Number(d.total) || 0))
const apptSpark = computed(() => (dash.charts?.appointments_over_time ?? []).map((d) => Number(d.total) || 0))

const collectedPct = computed(() => {
  const k = revenueKpis.value
  if (!k || !Number(k.total_expected)) return 0
  return Math.round((Number(k.total_received) / Number(k.total_expected)) * 100)
})

const kpiColumns = computed(() => (canViewRevenue.value || agents.value ? 5 : 4))

/* ── Pipeline (lead statuses grouped into stages) ──────────── */
const pipeline = computed(() => {
  const raw = dash.statistics?.leads?.by_status
  if (!raw) return []
  const totals = Object.fromEntries(Object.keys(LEAD_STAGES).map((k) => [k, { count: 0, statuses: [] }]))
  for (const [status, count] of Object.entries(raw)) {
    const stage = LEAD_STATUS[status]?.stage ?? 'contact'
    totals[stage].count += Number(count) || 0
    if (count) totals[stage].statuses.push(`${t('statuses.lead.' + status, status)} : ${count}`)
  }
  const sum = Object.values(totals).reduce((s, v) => s + v.count, 0) || 1
  return Object.entries(LEAD_STAGES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({
      key,
      label: t('stages.' + key),
      count: totals[key].count,
      pct: (totals[key].count / sum) * 100,
      dot: meta.dot,
      detail: totals[key].statuses.join('\n'),
    }))
})

/* ── Daily chart ───────────────────────────────────────────── */
const dailySeries = computed(() => [
  { label: t('dashboard.leadsSeries'), color: '#4f46e5', data: dash.charts?.leads_over_time ?? [] },
  { label: t('dashboard.appointmentsSeries'), color: '#c7d2fe', data: dash.charts?.appointments_over_time ?? [] },
])
const hasDailyData = computed(() => dailySeries.value.some((s) => s.data.length))

/* ── Top agents ────────────────────────────────────────────── */
const agentRows = computed(() => dash.aggregations?.by_agent ?? [])
const topAgents = computed(() =>
  [...agentRows.value]
    .map((r) => ({ ...r, rate: r.leads_total ? (r.leads_validated / r.leads_total) * 100 : 0 }))
    .sort((a, b) => b.leads_validated - a.leads_validated)
    .slice(0, 3),
)

/* ── Details section ───────────────────────────────────────── */
const insuranceRows = computed(() => {
  const raw = dash.statistics?.leads?.by_insurance_type
  if (!raw) return []
  const entries = Object.entries(raw).map(([key, value]) => ({
    key,
    label: t('insuranceTypes.' + key, key),
    value,
  }))
  const max = Math.max(...entries.map((e) => e.value), 1)
  return entries
    .sort((a, b) => b.value - a.value)
    .map((e) => ({ ...e, pct: (e.value / max) * 100 }))
})

const APT_STATUS_COLORS = { PLANIFIE: '#3B82F6', REALISE: '#10B981', ANNULE: '#EF4444', REPORTE: '#F59E0B' }
const aptByStatusSegments = computed(() => {
  const raw = dash.statistics?.appointments_by_status
  if (!raw) return []
  return Object.entries(raw)
    .map(([key, value]) => ({ label: t('statuses.appointment.' + key, key), value, color: APT_STATUS_COLORS[key] ?? '#9CA3AF' }))
    .sort((a, b) => b.value - a.value)
})

const PAYMENT_STATUS_COLORS = { NON_PAYE: '#EF4444', PARTIELLEMENT_PAYE: '#F59E0B', PAYE: '#10B981' }
const paymentStatusSegments = computed(() => {
  const raw = dash.revenue?.by_payment_status
  if (!raw) return []
  return Object.entries(raw)
    .map(([key, value]) => ({ label: t('statuses.payment.' + key, key), value, color: PAYMENT_STATUS_COLORS[key] ?? '#9CA3AF' }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
})

const PAYMENT_METHOD_COLORS = ['#4f46e5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
const paymentMethodSegments = computed(() => {
  const raw = dash.revenue?.by_payment_method
  if (!raw) return []
  return raw.map((item, idx) => ({
    label: item.label,
    value: item.total_amount,
    color: PAYMENT_METHOD_COLORS[idx % PAYMENT_METHOD_COLORS.length],
  }))
})

const teamRows = computed(() =>
  (dash.aggregations?.by_team ?? []).map((row) => ({
    ...row,
    conversion: row.leads_total > 0 ? (row.leads_validated / row.leads_total) * 100 : null,
  })),
)

/* ── Lifecycle ─────────────────────────────────────────────── */
onMounted(() => {
  dash.fetchAll()
})
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1440px] mx-auto">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-[13px] text-gray-500">{{ todayLabel }}</p>
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900 mt-0.5">
          {{ t('dashboard.hello', { name: firstName }) }}
        </h1>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <DashboardDateFilter v-model="filterModel" />
        <button
          v-if="showTeamAgentFilters"
          type="button"
          :aria-expanded="showFilterPanel"
          class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
          @click="showFilterPanel = !showFilterPanel"
        >
          <SlidersHorizontal class="w-4 h-4 text-gray-500" />
          {{ t('dashboard.filters') }}
          <span
            v-if="activeTeamAgentCount"
            class="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-primary text-white text-[10px] font-bold"
          >{{ activeTeamAgentCount }}</span>
        </button>
        <RouterLink
          v-if="auth.can('LEADS_CREATE')"
          :to="{ name: 'leads.create' }"
          class="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover"
        >
          <Plus class="w-4 h-4" />
          {{ t('dashboard.newLead') }}
        </RouterLink>
      </div>
    </div>

    <div
      v-if="showFilterPanel && showTeamAgentFilters"
      class="bg-white border border-gray-200 rounded-xl px-5 py-4"
    >
      <DashboardFilterPanel
        :team-id="dash.filters.team_id"
        :agent-id="dash.filters.agent_id"
        :show-team-select="canViewGlobal"
        :fixed-team-id="fixedTeamId"
        @update:team-id="(v) => dash.setFilter('team_id', v)"
        @update:agent-id="(v) => dash.setFilter('agent_id', v)"
      />
    </div>

    <!-- ── KPI strip ─────────────────────────────────────────── -->
    <section
      :aria-label="t('dashboard.title')"
      :class="[
        'grid grid-cols-1 sm:grid-cols-2 bg-white border border-gray-200 rounded-xl',
        'divide-y divide-gray-100 xl:divide-y-0 xl:divide-x',
        kpiColumns === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
      ]"
    >
      <KpiStripCell
        :label="t('dashboard.totalLeads')"
        :value="fmtNumber(leads?.total)"
        :hint="leadsDelta?.text ?? ''"
        :hint-tone="leadsDelta?.tone"
        :spark="leadsSpark"
        :loading="dash.loading.kpis"
      />
      <KpiStripCell
        :label="t('dashboard.newToday')"
        :value="fmtNumber(leads?.new_today)"
        :hint="leads?.unassigned ? t('dashboard.unassignedCount', { n: fmtNumber(leads.unassigned) }) : ''"
        :hint-tone="leads?.unassigned ? 'danger' : 'muted'"
        :loading="dash.loading.kpis"
      />
      <KpiStripCell
        :label="t('dashboard.conversionRate')"
        :value="fmtRate(leads?.conversion_rate)"
        :hint="conversionDelta?.text ?? ''"
        :hint-tone="conversionDelta?.tone"
        :loading="dash.loading.kpis"
      />
      <KpiStripCell
        :label="t('dashboard.appointments')"
        :value="fmtNumber(appointments?.total)"
        :hint="appointments?.overdue
          ? t('dashboard.overdueCount', { n: fmtNumber(appointments.overdue) })
          : appointments ? t('dashboard.apptBreakdown', { today: appointments.today ?? 0, upcoming: appointments.upcoming ?? 0 }) : ''"
        :hint-tone="appointments?.overdue ? 'danger' : 'muted'"
        :spark="apptSpark"
        :loading="dash.loading.kpis"
      />
      <KpiStripCell
        v-if="canViewRevenue"
        :label="t('dashboard.receivedRevenue')"
        :value="revenueKpis ? formatCurrency(revenueKpis.total_received) : '—'"
        :progress="collectedPct"
        :hint="revenueKpis ? t('dashboard.collectedOf', { pct: collectedPct, total: formatCurrency(revenueKpis.total_expected) }) : ''"
        :loading="dash.loading.revenue"
      />
      <KpiStripCell
        v-else-if="agents"
        :label="t('dashboard.activeAgents')"
        :value="fmtNumber(agents.active)"
        :hint="t('dashboard.activeOf', { n: agents.total })"
        :loading="dash.loading.kpis"
      />
    </section>

    <!-- ── Main grid ─────────────────────────────────────────── -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-5">

      <div :class="['flex flex-col gap-5 min-w-0', canViewAppointments ? 'xl:col-span-8' : 'xl:col-span-12']">

        <!-- Pipeline -->
        <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-base font-semibold text-gray-900">{{ t('dashboard.pipeline') }}</h2>
            <RouterLink to="/leads" class="text-[13px] font-medium text-primary hover:text-primary-hover">
              {{ t('dashboard.viewLeads') }}
            </RouterLink>
          </div>
          <template v-if="dash.loading.statistics">
            <AppSkeleton height="12px" class="rounded-full" />
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <AppSkeleton v-for="n in 6" :key="n" height="40px" />
            </div>
          </template>
          <template v-else-if="pipeline.length">
            <div class="h-3 flex gap-[3px] rounded-full overflow-hidden bg-gray-100">
              <div
                v-for="s in pipeline.filter((p) => p.count)"
                :key="s.key"
                :class="s.dot"
                :style="{ width: `${s.pct}%` }"
                :title="`${s.label} : ${s.count}`"
              />
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <RouterLink
                v-for="s in pipeline"
                :key="s.key"
                :to="{ name: 'leads', query: { stage: s.key } }"
                class="flex flex-col gap-0.5 -mx-1.5 px-1.5 py-1 rounded-lg hover:bg-gray-50"
                :title="s.detail"
              >
                <span class="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                  <span :class="['w-2 h-2 rounded-sm', s.dot]" />{{ s.label }}
                </span>
                <span class="font-mono text-lg font-medium text-gray-900">{{ fmtNumber(s.count) }}</span>
              </RouterLink>
            </div>
          </template>
          <p v-else class="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle class="w-4 h-4" />{{ t('dashboard.noStatusData') }}
          </p>
        </section>

        <!-- Daily leads + appointments -->
        <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5 flex flex-col gap-3 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-display text-base font-semibold text-gray-900">{{ t('dashboard.leadsAndAppointments') }}</h2>
            <div class="flex gap-4 text-[12.5px] text-gray-600">
              <span v-for="s in dailySeries" :key="s.label" class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: s.color }" />{{ s.label }}
              </span>
            </div>
          </div>
          <AppSkeleton v-if="dash.loading.charts" height="220px" />
          <DailyBarsChart v-else-if="hasDailyData" :series="dailySeries" />
          <p v-else class="h-[200px] flex items-center justify-center text-sm text-gray-500">
            {{ t('dashboard.noDataPeriod') }}
          </p>
        </section>
      </div>

      <!-- Right column: today -->
      <MyDayPanel v-if="canViewAppointments" class="xl:col-span-4">
        <template v-if="topAgents.length" #footer>
          <div class="mt-auto px-5 py-3.5 border-t border-gray-100">
            <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2.5">
              {{ t('dashboard.topAgents') }}
            </p>
            <div class="flex flex-col gap-2 text-[13px]">
              <div v-for="a in topAgents" :key="a.agent_id" class="flex items-center gap-2.5">
                <span class="flex-1 truncate">{{ a.agent_name }}</span>
                <span class="font-mono text-gray-600">{{ t('dashboard.validatedCount', { n: a.leads_validated }) }}</span>
                <span class="w-12 text-right font-mono">{{ fmtRate(a.rate) }}</span>
              </div>
            </div>
          </div>
        </template>
      </MyDayPanel>
    </div>

    <!-- ── Details ───────────────────────────────────────────── -->
    <h2 class="font-display text-base font-semibold text-gray-900 mt-2">{{ t('dashboard.details') }}</h2>

    <div v-if="canViewRevenue" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5">
        <h3 class="font-display text-[15px] font-semibold text-gray-900 mb-3">{{ t('dashboard.revenueTitle') }}</h3>
        <div v-if="dash.loading.revenue" class="space-y-3">
          <AppSkeleton v-for="n in 4" :key="n" height="18px" />
        </div>
        <dl v-else class="divide-y divide-gray-100 text-[13px]">
          <div class="flex justify-between py-2.5">
            <dt class="text-gray-600">{{ t('dashboard.expectedRevenue') }}</dt>
            <dd class="font-mono">{{ revenueKpis ? formatCurrency(revenueKpis.total_expected) : '—' }}</dd>
          </div>
          <div class="flex justify-between py-2.5">
            <dt class="text-gray-600">{{ t('dashboard.receivedRevenue') }}</dt>
            <dd class="font-mono text-success-text">{{ revenueKpis ? formatCurrency(revenueKpis.total_received) : '—' }}</dd>
          </div>
          <div class="flex justify-between py-2.5">
            <dt class="text-gray-600">{{ t('dashboard.remainingRevenue') }}</dt>
            <dd class="font-mono">{{ revenueKpis ? formatCurrency(revenueKpis.total_remaining) : '—' }}</dd>
          </div>
          <div class="flex justify-between py-2.5">
            <dt class="text-gray-600">{{ t('dashboard.fullyPaid') }}</dt>
            <dd class="font-mono">
              {{ revenueKpis ? `${revenueKpis.fully_paid} / ${revenueKpis.validated_leads}` : '—' }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5">
        <h3 class="font-display text-[15px] font-semibold text-gray-900">{{ t('dashboard.paymentStatus') }}</h3>
        <p class="text-xs text-gray-500 mt-0.5 mb-4">{{ t('dashboard.paymentStatusSub') }}</p>
        <AppSkeleton v-if="dash.loading.revenue" height="144px" />
        <DonutChart v-else-if="paymentStatusSegments.length" :segments="paymentStatusSegments" center-label="Leads" />
        <p v-else class="py-8 text-center text-sm text-gray-500">{{ t('dashboard.noPaymentData') }}</p>
      </section>

      <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5">
        <h3 class="font-display text-[15px] font-semibold text-gray-900">{{ t('dashboard.paymentMethods') }}</h3>
        <p class="text-xs text-gray-500 mt-0.5 mb-4">{{ t('dashboard.paymentMethodsSub') }}</p>
        <AppSkeleton v-if="dash.loading.revenue" height="144px" />
        <DonutChart v-else-if="paymentMethodSegments.length" :segments="paymentMethodSegments" center-label="€" />
        <p v-else class="py-8 text-center text-sm text-gray-500">{{ t('dashboard.noPayments') }}</p>
      </section>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5">
        <h3 class="font-display text-[15px] font-semibold text-gray-900 mb-4">{{ t('dashboard.leadsByInsuranceType') }}</h3>
        <div v-if="dash.loading.statistics" class="space-y-3">
          <AppSkeleton v-for="n in 6" :key="n" height="12px" />
        </div>
        <ul v-else-if="insuranceRows.length" class="flex flex-col gap-3">
          <li v-for="row in insuranceRows" :key="row.key" class="flex items-center gap-3">
            <span class="w-36 shrink-0 text-[12.5px] text-gray-600 truncate">{{ row.label }}</span>
            <span class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <span class="block h-full rounded-full bg-primary" :style="{ width: `${row.pct}%` }" />
            </span>
            <span class="w-10 text-right font-mono text-[12.5px] text-gray-900">{{ row.value }}</span>
          </li>
        </ul>
        <p v-else class="py-8 text-center text-sm text-gray-500">{{ t('dashboard.noInsuranceData') }}</p>
      </section>

      <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5">
        <h3 class="font-display text-[15px] font-semibold text-gray-900 mb-4">{{ t('dashboard.appointmentsByStatus') }}</h3>
        <AppSkeleton v-if="dash.loading.statistics" height="144px" />
        <DonutChart v-else-if="aptByStatusSegments.length" :segments="aptByStatusSegments" :center-label="t('dashboard.appointmentsSeries')" />
        <p v-else class="py-8 text-center text-sm text-gray-500">{{ t('dashboard.noDataPeriod') }}</p>
      </section>
    </div>

    <!-- Team / agent tables -->
    <template v-if="showAggregations">
      <section
        v-for="table in [
          { key: 'team', show: teamRows.length || dash.loading.aggregations, title: t('dashboard.performanceByTeam'), rows: teamRows },
          { key: 'agent', show: canViewGlobal && (agentRows.length || dash.loading.aggregations), title: t('dashboard.performanceByAgent'), rows: agentRows },
        ]"
        v-show="table.show"
        :key="table.key"
        class="bg-white border border-gray-200 rounded-xl overflow-hidden"
      >
        <h3 class="px-5 py-4 font-display text-[15px] font-semibold text-gray-900">{{ table.title }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="bg-gray-50 border-y border-gray-200 text-xs font-medium text-gray-600">
                <th class="px-5 h-9 text-left font-medium">{{ table.key === 'team' ? t('teams.name') : t('appointments.agent') }}</th>
                <th class="px-5 h-9 text-right font-medium">{{ t('leads.title') }}</th>
                <th class="px-5 h-9 text-right font-medium">{{ t('dashboard.validatedCol') }}</th>
                <th class="px-5 h-9 text-right font-medium">{{ t('appointments.title') }}</th>
                <th v-if="table.key === 'team'" class="px-5 h-9 text-right font-medium">{{ t('dashboard.conversionCol') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="dash.loading.aggregations">
                <tr v-for="n in 3" :key="n" class="border-b border-gray-100">
                  <td v-for="c in 4" :key="c" class="px-5 py-3"><AppSkeleton height="14px" /></td>
                </tr>
              </template>
              <template v-else>
              <tr
                v-for="row in table.rows"
                :key="row.team_id ?? row.agent_id"
                class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <td class="px-5 py-3 font-medium text-gray-900">{{ row.team_name ?? row.agent_name }}</td>
                <td class="px-5 py-3 text-right font-mono">{{ row.leads_total }}</td>
                <td class="px-5 py-3 text-right font-mono">{{ row.leads_validated }}</td>
                <td class="px-5 py-3 text-right font-mono">{{ row.appointments_completed }}</td>
                <td v-if="table.key === 'team'" class="px-5 py-3 text-right font-mono">
                  {{ row.conversion === null ? '—' : fmtRate(row.conversion) }}
                </td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
