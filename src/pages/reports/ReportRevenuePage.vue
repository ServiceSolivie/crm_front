<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import { useAuthStore } from '@/stores/auth.store'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import PaymentStatusBadge from '@/components/modules/payments/PaymentStatusBadge.vue'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'
import { PAYMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { useReportFormat } from '@/composables/useReportFormat'

const { t } = useI18n()
const store = useReportsStore()
const auth = useAuthStore()
const { num, money, date } = useReportFormat()

const paymentStatusOptions = useEnumOptions(PAYMENT_STATUS, 'statuses.payment')
const showAgent = computed(() => auth.can('REVENUE_VIEW_ALL') || auth.can('REVENUE_VIEW_TEAM'))

const summary = computed(() => store.revenueSummary)
const collectionRate = computed(() => {
  if (!summary.value || !Number(summary.value.total_expected)) return 0
  return Math.min(100, (Number(summary.value.total_received) / Number(summary.value.total_expected)) * 100)
})

const kpis = computed(() => [
  { label: t('revenue.expectedRevenue'), value: money(summary.value?.total_expected) },
  { label: t('revenue.receivedRevenue'), value: money(summary.value?.total_received), tone: 'success' },
  { label: t('revenue.remainingRevenue'), value: money(summary.value?.total_remaining) },
  {
    label: t('revenue.fullyPaid'),
    value: summary.value ? `${num(summary.value.fully_paid)} / ${num(summary.value.leads_count)}` : '—',
    hint: t('revenue.validatedLeads'),
  },
])

const fullName = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.reference || '—'

const CSV_COLUMNS = computed(() => [
  { key: 'name', label: t('revenue.csvLead'), value: fullName },
  { key: 'expected_revenue', label: t('revenue.csvExpected') },
  { key: 'total_received', label: t('revenue.csvReceived') },
  { key: 'remaining_amount', label: t('revenue.csvRemaining') },
  { key: 'payment_status', label: t('revenue.csvStatus'), value: (r) => r.payment_status_label ?? r.payment_status },
  { key: 'payments_count', label: t('revenue.csvPayments') },
  { key: 'validated_at', label: t('revenue.csvValidatedAt') },
  ...(showAgent.value ? [{ key: 'agent', label: t('revenue.agentCol'), value: (r) => r.agent?.name }] : []),
])

function refresh() {
  store.fetchRevenue()
}
function onFilter(key, value) {
  store.setFilter(key, value)
  refresh()
}

const from = computed(() => (store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1))
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

const GRID = computed(() =>
  showAgent.value
    ? 'grid-cols-[minmax(180px,1.6fr)_110px_110px_110px_150px_70px_90px_minmax(140px,1fr)]'
    : 'grid-cols-[minmax(180px,1.6fr)_110px_110px_110px_150px_70px_90px]',
)

onMounted(refresh)
</script>

<template>
  <ReportShell
    team-filter
    :title="t('revenue.title')"
    :subtitle="t('revenue.subtitle')"
    @refresh="refresh"
    @export="store.exportCsv(store.revenueData, CSV_COLUMNS, 'rapport-chiffre-affaires.csv')"
  >
    <template #filters>
      <AppFilterChip
        :label="t('revenue.statusCol')"
        :model-value="store.filters.payment_status ?? ''"
        :options="paymentStatusOptions"
        :searchable="false"
        @update:model-value="(v) => onFilter('payment_status', v || null)"
      />
    </template>

    <ReportKpis :items="kpis" :loading="store.loading.revenue && !summary" />

    <section v-if="summary" class="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
      <span class="text-[13px] font-medium text-gray-700 shrink-0">{{ t('revenue.collectionRate') }}</span>
      <span class="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <span
          :class="['block h-full rounded-full', collectionRate >= 80 ? 'bg-success' : collectionRate >= 40 ? 'bg-warning' : 'bg-danger']"
          :style="{ width: `${collectionRate}%` }"
        />
      </span>
      <span class="w-16 text-right font-mono text-[13px] font-medium">{{ Math.round(collectionRate) }} %</span>
    </section>

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <div :class="['min-w-[900px] text-[13px]', showAgent ? 'min-w-[1040px]' : '']" role="table">
          <div role="row" :class="['grid gap-x-3 items-center h-10 px-5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600', GRID]">
            <span role="columnheader">{{ t('revenue.leadCol') }}</span>
            <span role="columnheader" class="text-right">{{ t('revenue.expectedCol') }}</span>
            <span role="columnheader" class="text-right">{{ t('revenue.receivedCol') }}</span>
            <span role="columnheader" class="text-right">{{ t('revenue.remainingCol') }}</span>
            <span role="columnheader">{{ t('revenue.statusCol') }}</span>
            <span role="columnheader" class="text-right">{{ t('revenue.paymentsCol') }}</span>
            <span role="columnheader">{{ t('revenue.validatedAtCol') }}</span>
            <span v-if="showAgent" role="columnheader">{{ t('revenue.agentCol') }}</span>
          </div>

          <template v-if="store.loading.revenue">
            <div v-for="n in 8" :key="n" :class="['grid gap-x-3 items-center h-[50px] px-5 border-b border-gray-100', GRID]">
              <AppSkeleton height="12px" width="70%" />
              <AppSkeleton v-for="c in (showAgent ? 7 : 6)" :key="c" height="10px" />
            </div>
          </template>

          <p v-else-if="!store.revenueData.length" class="px-5 py-12 text-center text-sm text-gray-500">{{ t('revenue.noLeadsForPeriod') }}</p>

          <template v-else>
            <div
              v-for="row in store.revenueData"
              :key="row.id"
              role="row"
              :class="['grid gap-x-3 items-center h-[54px] px-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50', GRID]"
            >
              <RouterLink role="cell" :to="{ name: 'leads.detail', params: { id: row.id } }" class="min-w-0 hover:text-primary">
                <p class="font-medium truncate">{{ fullName(row) }}</p>
                <p v-if="row.phone" class="font-mono text-[11.5px] text-gray-500 truncate">{{ row.phone }}</p>
              </RouterLink>
              <span role="cell" class="text-right font-mono">{{ money(row.expected_revenue) }}</span>
              <span role="cell" class="text-right font-mono text-success-text">{{ money(row.total_received) }}</span>
              <span role="cell" class="text-right font-mono">{{ money(row.remaining_amount) }}</span>
              <span role="cell"><PaymentStatusBadge :status="row.payment_status" /></span>
              <span role="cell" class="text-right font-mono">{{ num(row.payments_count) }}</span>
              <span role="cell" class="font-mono text-[12.5px]">{{ date(row.validated_at) }}</span>
              <span v-if="showAgent" role="cell" class="min-w-0">
                <span v-if="row.agent" class="flex items-center gap-2">
                  <AppAvatar :name="row.agent.name" size="xs" />
                  <span class="truncate">{{ row.agent.name }}</span>
                </span>
                <span v-else class="text-gray-500">—</span>
                <span v-if="row.team" class="block text-xs text-gray-500 truncate">{{ row.team.name }}</span>
              </span>
            </div>
          </template>
        </div>
      </div>
      <div v-if="store.revenueData.length" class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          :per-page-options="[25, 50, 100]"
          @page-change="(p) => onFilter('page', p)"
          @per-page-change="(v) => onFilter('per_page', v)"
        />
      </div>
    </section>
  </ReportShell>
</template>
