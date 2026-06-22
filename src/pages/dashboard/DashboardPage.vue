<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Users, UserPlus, TrendingUp, CalendarCheck, BarChart2,
  UserCheck, Building2, AlertCircle, Banknote, CircleDollarSign, Receipt, CheckCircle2,
} from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { LEAD_STATUS, INSURANCE_TYPE, APPOINTMENT_STATUS, PAYMENT_STATUS } from '@/utils/enums'
import { formatCurrency } from '@/utils/formatters'

import AppCard from '@/components/base/AppCard.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import AppProgressBar from '@/components/base/AppProgressBar.vue'
import AppBadge from '@/components/base/AppBadge.vue'

import KpiCard from '@/components/modules/dashboard/KpiCard.vue'
import DashboardDateFilter from '@/components/modules/dashboard/DashboardDateFilter.vue'

import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'

/* ── Stores ────────────────────────────────────────────────── */
const auth = useAuthStore()
const dash = useDashboardStore()
const { t } = useI18n()

/* ── Permissions ───────────────────────────────────────────── */
const canViewGlobal = computed(() => auth.can('DASHBOARD_VIEW_GLOBAL'))
const canViewTeam = computed(() => auth.can('DASHBOARD_VIEW_TEAM'))
const showAggregations = computed(() => canViewGlobal.value || canViewTeam.value)
const canViewRevenue = computed(() =>
  auth.can('REVENUE_VIEW_ALL') || auth.can('REVENUE_VIEW_TEAM') || auth.can('REVENUE_VIEW_PERSONAL'),
)

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

/* ── KPI derived values ────────────────────────────────────── */
const leads = computed(() => dash.kpis?.leads ?? null)
const appointments = computed(() => dash.kpis?.appointments ?? null)
const agents = computed(() => dash.kpis?.agents ?? null)
const teams = computed(() => dash.kpis?.teams ?? null)

/* ── Donut: Leads by Status ────────────────────────────────── */
const STATUS_COLORS = {
  NRP: '#6B7280',
  VALIDE: '#10B981',
  RAPPEL: '#F59E0B',
  RENDEZ_VOUS_ASSURE: '#3B82F6',
  PAS_INTERESSEE: '#EF4444',
}

const leadsByStatusSegments = computed(() => {
  const raw = dash.statistics?.leads.by_status
  console.log('the dash statistiques', dash.statistics);
  if (!raw) return []
  return Object.entries(raw)
    .map(([key, value]) => ({
      label: LEAD_STATUS[key]?.label ?? key,
      value,
      color: STATUS_COLORS[key] ?? '#9CA3AF',
    }))
    .sort((a, b) => b.value - a.value)
})

/* ── Donut: Appointments by Status ────────────────────────── */
const APT_STATUS_COLORS = {
  PLANIFIE: '#3B82F6',
  REALISE: '#10B981',
  ANNULE: '#EF4444',
  REPORTE: '#F59E0B',
}

const aptByStatusSegments = computed(() => {
  const raw = dash.statistics?.appointments_by_status
  if (!raw) return []
  return Object.entries(raw)
    .map(([key, value]) => ({
      label: APPOINTMENT_STATUS[key]?.label ?? key,
      value,
      color: APT_STATUS_COLORS[key] ?? '#9CA3AF',
    }))
    .sort((a, b) => b.value - a.value)
})

/* ── Insurance type horizontal bars ───────────────────────── */
const insuranceRows = computed(() => {
  const raw = dash.statistics?.leads?.by_insurance_type
  console.log('the raw data of insurance type ', dash.statistics?.leads);
  if (!raw) return []
  const entries = Object.entries(raw).map(([key, value]) => ({
    key,
    label: INSURANCE_TYPE[key]?.label ?? key,
    value,
  }))
  const max = Math.max(...entries.map((e) => e.value), 1)
  return entries
    .sort((a, b) => b.value - a.value)
    .map((e) => ({ ...e, pct: (e.value / max) * 100 }))
})

/* ── Revenue data ─────────────────────────────────────────── */
const revenueKpis = computed(() => dash.revenue?.kpis ?? null)

const PAYMENT_STATUS_COLORS = {
  NON_PAYE: '#EF4444',
  PARTIELLEMENT_PAYE: '#F59E0B',
  PAYE: '#10B981',
}

const paymentStatusSegments = computed(() => {
  const raw = dash.revenue?.by_payment_status
  if (!raw) return []
  return Object.entries(raw)
    .map(([key, value]) => ({
      label: PAYMENT_STATUS[key]?.label ?? key,
      value,
      color: PAYMENT_STATUS_COLORS[key] ?? '#9CA3AF',
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
})

const PAYMENT_METHOD_COLORS = ['#6366f1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

const paymentMethodSegments = computed(() => {
  const raw = dash.revenue?.by_payment_method
  if (!raw) return []
  return raw.map((item, idx) => ({
    label: item.label,
    value: item.total_amount,
    color: PAYMENT_METHOD_COLORS[idx % PAYMENT_METHOD_COLORS.length],
  }))
})

const monthlyRevenueData = computed(() => dash.revenue?.monthly_trend ?? [])

/* ── Aggregation tables ────────────────────────────────────── */
const teamRows = computed(() => dash.aggregations?.by_team ?? [])
const agentRows = computed(() => dash.aggregations?.by_agent ?? [])

const teamColumns = computed(() => [
  { key: 'team_name', label: t('teams.name') },
  { key: 'leads_total', label: t('leads.title'), align: 'right' },
  { key: 'leads_validated', label: 'Validés', align: 'right' },
  { key: 'appointments_completed', label: t('appointments.title'), align: 'right' },
  { key: '_conversion', label: 'Conv.', align: 'right' },
])

const agentColumns = computed(() => [
  { key: 'agent_name', label: 'Agent' },
  { key: 'leads_total', label: t('leads.title'), align: 'right' },
  { key: 'leads_validated', label: 'Validés', align: 'right' },
  { key: 'appointments_completed', label: t('appointments.title'), align: 'right' },
])

/* Enrich team rows with computed conversion rate */
const enrichedTeamRows = computed(() =>
  teamRows.value.map((row) => ({
    ...row,
    _conversion:
      row.leads_total > 0
        ? `${((row.leads_validated / row.leads_total) * 100).toFixed(0)}%`
        : '—',
  })),
)

/* ── Lifecycle ─────────────────────────────────────────────── */
onMounted(() => {
  dash.fetchAll()
})
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- ── Page header ──────────────────────────────────────── -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('dashboard.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">
            {{ t('dashboard.welcome') }} <span class="font-semibold text-white">{{ auth.user?.name }}</span>
          </p>
        </div>
        <DashboardDateFilter v-model="filterModel" />
      </div>
    </div>

    <!-- ── Row 1: KPI cards ─────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        :title="t('dashboard.totalLeads')"
        :value="leads?.total"
        :loading="dash.loading.kpis"
        :icon="Users"
        accent="indigo"
      />
      <KpiCard
        :title="t('dashboard.newToday')"
        :value="leads?.new_today"
        :loading="dash.loading.kpis"
        :icon="UserPlus"
        accent="emerald"
      />
      <KpiCard
        :title="t('dashboard.conversionRate')"
        :value="leads?.conversion_rate"
        format="rate"
        :loading="dash.loading.kpis"
        :icon="TrendingUp"
        accent="blue"
      />
      <KpiCard
        :title="t('dashboard.appointments')"
        :value="appointments?.total"
        :loading="dash.loading.kpis"
        :icon="CalendarCheck"
        accent="amber"
      />
    </div>

    <!-- ── Row 1b: Agents + Teams (admin/manager only) ──────── -->
    <div
      v-if="showAggregations && (agents || teams)"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <KpiCard
        v-if="agents"
        :title="t('dashboard.activeAgents')"
        :value="agents?.active"
        :sub-value="agents ? `${agents.total} total` : null"
        :loading="dash.loading.kpis"
        :icon="UserCheck"
        accent="indigo"
      />
      <KpiCard
        v-if="teams"
        :title="t('dashboard.activeTeams')"
        :value="teams?.active"
        :sub-value="teams ? `${teams.total} total` : null"
        :loading="dash.loading.kpis"
        :icon="Building2"
        accent="emerald"
      />
    </div>

    <!-- ── Revenue KPIs ──────────────────────────────────────── -->
    <template v-if="canViewRevenue">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="CA Attendu"
          :value="revenueKpis?.total_expected"
          format="currency"
          :loading="dash.loading.revenue"
          :icon="Banknote"
          accent="indigo"
        />
        <KpiCard
          title="CA Reçu"
          :value="revenueKpis?.total_received"
          format="currency"
          :loading="dash.loading.revenue"
          :icon="CircleDollarSign"
          accent="emerald"
        />
        <KpiCard
          title="CA Restant"
          :value="revenueKpis?.total_remaining"
          format="currency"
          :loading="dash.loading.revenue"
          :icon="Receipt"
          accent="amber"
        />
        <KpiCard
          title="Entièrement payés"
          :value="revenueKpis?.fully_paid"
          :sub-value="revenueKpis ? `${revenueKpis.validated_leads} validés` : null"
          :loading="dash.loading.revenue"
          :icon="CheckCircle2"
          accent="emerald"
        />
      </div>

      <!-- Monthly revenue trend (full width) -->
      <!-- <AppCard padding="none">
        <div class="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900">Tendance du chiffre d'affaires</h3>
            <p class="text-xs text-gray-400 mt-0.5">Évolution mensuelle</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp class="w-3.5 h-3.5 text-success" />
          </div>
        </div>

        <div class="px-2 pb-3">
          <template v-if="dash.loading.revenue">
            <div class="h-[220px] flex items-center justify-center">
              <AppSpinner :size="24" class="text-primary" />
            </div>
          </template>
          <template v-else-if="monthlyRevenueData.length">
            <BarChart
              :data="monthlyRevenueData"
              key-x="month"
              key-y="received"
              color="#10B981"
            />
          </template>
          <template v-else>
            <div class="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-400">
              <BarChart2 class="w-8 h-8 opacity-40" />
              <p class="text-sm">Aucune donnée pour cette période</p>
            </div>
          </template>
        </div>
      </AppCard> -->

      <!-- Payment status + method donuts (side by side, full width row) -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- Payment status donut -->
        <AppCard>
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="font-semibold text-gray-900">Statut de paiement</h3>
              <p class="text-xs text-gray-400 mt-0.5">Répartition des leads validés</p>
            </div>
          </div>
          <template v-if="dash.loading.revenue">
            <div class="flex gap-6">
              <AppSkeleton width="144px" height="144px" rounded="rounded-full" />
              <div class="flex flex-col gap-2.5 flex-1">
                <AppSkeleton v-for="n in 3" :key="n" height="16px" :width="`${60 + n * 10}%`" />
              </div>
            </div>
          </template>
          <template v-else-if="paymentStatusSegments.length">
            <DonutChart :segments="paymentStatusSegments" center-label="Leads" />
          </template>
          <template v-else>
            <div class="flex items-center justify-center py-10 text-gray-400">
              <AlertCircle class="w-5 h-5 mr-2 opacity-60" />
              <span class="text-sm">Aucune donnée</span>
            </div>
          </template>
        </AppCard>

        <!-- Payment method donut -->
        <AppCard>
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="font-semibold text-gray-900">Méthodes de paiement</h3>
              <p class="text-xs text-gray-400 mt-0.5">Par montant total</p>
            </div>
          </div>
          <template v-if="dash.loading.revenue">
            <div class="flex gap-6">
              <AppSkeleton width="144px" height="144px" rounded="rounded-full" />
              <div class="flex flex-col gap-2.5 flex-1">
                <AppSkeleton v-for="n in 3" :key="n" height="16px" :width="`${60 + n * 10}%`" />
              </div>
            </div>
          </template>
          <template v-else-if="paymentMethodSegments.length">
            <DonutChart :segments="paymentMethodSegments" center-label="Reçu" />
          </template>
          <template v-else>
            <div class="flex items-center justify-center py-10 text-gray-400">
              <AlertCircle class="w-5 h-5 mr-2 opacity-60" />
              <span class="text-sm">Aucun paiement</span>
            </div>
          </template>
        </AppCard>
      </div>
    </template>

    <!-- ── Row 2: Time-series charts ────────────────────────── -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">

      <!-- Leads over time -->
      <AppCard padding="none">
        <div class="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('dashboard.leadsOverTime') }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ t('dashboard.dailyNewLeads') }}</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp class="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        <div class="px-2 pb-3">
          <template v-if="dash.loading.charts">
            <div class="h-[220px] flex items-center justify-center">
              <AppSpinner :size="24" class="text-primary" />
            </div>
          </template>
          <template v-else-if="dash.charts?.leads_over_time?.length">
            <LineChart
              :data="dash.charts.leads_over_time"
              key-x="date"
              key-y="total"
              color="#6366f1"
            />
          </template>
          <template v-else>
            <div class="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-400">
              <BarChart2 class="w-8 h-8 opacity-40" />
              <p class="text-sm">{{ t('dashboard.noDataPeriod') }}</p>
            </div>
          </template>
        </div>
      </AppCard>

      <!-- Appointments over time -->
      <AppCard padding="none">
        <div class="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('dashboard.appointmentsOverTime') }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ t('dashboard.dailyVolume') }}</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <CalendarCheck class="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        <div class="px-2 pb-3">
          <template v-if="dash.loading.charts">
            <div class="h-[220px] flex items-center justify-center">
              <AppSpinner :size="24" class="text-primary" />
            </div>
          </template>
          <template v-else-if="dash.charts?.appointments_over_time?.length">
            <BarChart
              :data="dash.charts.appointments_over_time"
              key-x="date"
              key-y="total"
              color="#6366f1"
            />
          </template>
          <template v-else>
            <div class="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-400">
              <BarChart2 class="w-8 h-8 opacity-40" />
              <p class="text-sm">{{ t('dashboard.noDataPeriod') }}</p>
            </div>
          </template>
        </div>
      </AppCard>
    </div>

    <!-- ── Row 3: Statistics ─────────────────────────────────── -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">

      <!-- Leads by Status donut -->
      <AppCard>
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('dashboard.leadsByStatus') }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ t('dashboard.currentDistribution') }}</p>
          </div>
          <AppBadge v-if="leads?.total" :label="String(leads.total)" variant="neutral" />
        </div>

        <template v-if="dash.loading.statistics">
          <div class="flex gap-6">
            <AppSkeleton width="144px" height="144px" rounded="rounded-full" />
            <div class="flex flex-col gap-2.5 flex-1">
              <AppSkeleton v-for="n in 5" :key="n" height="16px" :width="`${70 + n * 4}%`" />
            </div>
          </div>
        </template>
        <template v-else-if="leadsByStatusSegments.length">
          <DonutChart :segments="leadsByStatusSegments" center-label="Leads" />
        </template>
        <template v-else>
          <div class="flex items-center justify-center py-10 text-gray-400">
            <AlertCircle class="w-5 h-5 mr-2 opacity-60" />
            <span class="text-sm">No status data available</span>
          </div>
        </template>
      </AppCard>

      <!-- Leads by Insurance Type bars -->
      <AppCard>
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('dashboard.leadsByInsuranceType') }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ t('dashboard.volumePerProduct') }}</p>
          </div>
        </div>

        <template v-if="dash.loading.statistics">
          <div class="flex flex-col gap-4">
            <div v-for="n in 6" :key="n" class="flex items-center gap-3">
              <AppSkeleton height="12px" width="100px" />
              <AppSkeleton height="8px" class="flex-1" />
              <AppSkeleton height="12px" width="24px" />
            </div>
          </div>
        </template>
        <template v-else-if="insuranceRows.length">
          <ul class="flex flex-col gap-3.5">
            <li
              v-for="row in insuranceRows"
              :key="row.key"
              class="flex items-center gap-3 group"
            >
              <span class="text-xs text-gray-500 w-36 shrink-0 leading-tight">{{ row.label }}</span>
              <div class="flex-1">
                <AppProgressBar
                  :value="row.pct"
                  color="bg-primary"
                  height="h-2"
                />
              </div>
              <span class="text-xs font-semibold text-gray-700 w-8 text-right tabular-nums">
                {{ row.value }}
              </span>
            </li>
          </ul>
        </template>
        <template v-else>
          <div class="flex items-center justify-center py-10 text-gray-400">
            <AlertCircle class="w-5 h-5 mr-2 opacity-60" />
            <span class="text-sm">No insurance data available</span>
          </div>
        </template>
      </AppCard>
    </div>

    <!-- ── Row 3b: Appointments by Status ───────────────────── -->
    <AppCard v-if="aptByStatusSegments.length || dash.loading.statistics">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="font-semibold text-gray-900">{{ t('dashboard.appointmentsByStatus') }}</h3>
          <p class="text-xs text-gray-400 mt-0.5">{{ t('dashboard.completionOverview') }}</p>
        </div>
        <AppBadge
          v-if="appointments?.total"
          :label="String(appointments.total)"
          variant="neutral"
        />
      </div>

      <template v-if="dash.loading.statistics">
        <div class="flex gap-6">
          <AppSkeleton width="144px" height="144px" rounded="rounded-full" />
          <div class="flex flex-col gap-2.5 flex-1">
            <AppSkeleton v-for="n in 4" :key="n" height="16px" :width="`${60 + n * 8}%`" />
          </div>
        </div>
      </template>
      <template v-else>
        <DonutChart :segments="aptByStatusSegments" center-label="Appts" />
      </template>
    </AppCard>

    <!-- ── Row 4: Aggregations (admin / manager) ─────────────── -->
    <template v-if="showAggregations">

      <!-- Per-team table -->
      <AppCard v-if="teamRows.length || dash.loading.aggregations" padding="none">
        <div class="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('dashboard.performanceByTeam') }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">Leads, validation, and appointment completion</p>
          </div>
          <AppBadge
            v-if="teamRows.length"
            :label="`${teamRows.length} team${teamRows.length !== 1 ? 's' : ''}`"
            variant="neutral"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th v-for="col in teamColumns" :key="col.key"
                  :class="['px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide', col.align === 'right' ? 'text-right' : 'text-left']">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeleton -->
              <template v-if="dash.loading.aggregations">
                <tr v-for="n in 3" :key="`sk-${n}`" class="border-b border-gray-50">
                  <td v-for="col in teamColumns" :key="col.key" class="px-5 py-3.5">
                    <AppSkeleton height="14px" :width="col.align === 'right' ? '48px' : '120px'" />
                  </td>
                </tr>
              </template>
              <!-- Data -->
              <template v-else>
                <tr
                  v-for="row in enrichedTeamRows"
                  :key="row.team_id"
                  class="border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
                >
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 class="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span class="font-medium text-gray-900">{{ row.team_name }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 text-right tabular-nums text-gray-700 font-medium">
                    {{ row.leads_total }}
                  </td>
                  <td class="px-5 py-3.5 text-right">
                    <span class="inline-flex items-center justify-end gap-1.5 tabular-nums">
                      <span class="font-medium text-gray-700">{{ row.leads_validated }}</span>
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-right tabular-nums text-gray-700">
                    {{ row.appointments_completed }}
                  </td>
                  <td class="px-5 py-3.5 text-right">
                    <AppBadge
                      :label="row._conversion"
                      :variant="
                        row._conversion === '—'
                          ? 'neutral'
                          : parseInt(row._conversion) >= 20
                          ? 'success'
                          : parseInt(row._conversion) >= 10
                          ? 'warning'
                          : 'danger'
                      "
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Per-agent table (global view only) -->
      <AppCard v-if="canViewGlobal && (agentRows.length || dash.loading.aggregations)" padding="none">
        <div class="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('dashboard.performanceByAgent') }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">Individual agent breakdown</p>
          </div>
          <AppBadge
            v-if="agentRows.length"
            :label="`${agentRows.length} agent${agentRows.length !== 1 ? 's' : ''}`"
            variant="neutral"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th v-for="col in agentColumns" :key="col.key"
                  :class="['px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide', col.align === 'right' ? 'text-right' : 'text-left']">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-if="dash.loading.aggregations">
                <tr v-for="n in 5" :key="`sk-${n}`" class="border-b border-gray-50">
                  <td v-for="col in agentColumns" :key="col.key" class="px-5 py-3.5">
                    <AppSkeleton height="14px" :width="col.align === 'right' ? '48px' : '140px'" />
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr
                  v-for="(row, idx) in agentRows"
                  :key="row.agent_id"
                  class="border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
                >
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {{ idx + 1 }}
                      </div>
                      <span class="font-medium text-gray-900">{{ row.agent_name }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 text-right tabular-nums text-gray-700 font-medium">
                    {{ row.leads_total }}
                  </td>
                  <td class="px-5 py-3.5 text-right tabular-nums text-gray-700">
                    {{ row.leads_validated }}
                  </td>
                  <td class="px-5 py-3.5 text-right tabular-nums text-gray-700">
                    {{ row.appointments_completed }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

  </div>
</template>
