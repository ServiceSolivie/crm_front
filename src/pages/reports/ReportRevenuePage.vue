<script setup>
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, X, Banknote, CircleDollarSign, Receipt, CheckCircle2 } from 'lucide-vue-next'
import { useReportsStore } from '@/stores/reports.store'
import { useAuthStore } from '@/stores/auth.store'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppProgressBar from '@/components/base/AppProgressBar.vue'
import KpiCard from '@/components/modules/dashboard/KpiCard.vue'
import PaymentStatusBadge from '@/components/modules/payments/PaymentStatusBadge.vue'
import { PAYMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatCurrency, formatDate } from '@/utils/formatters'

const { t } = useI18n()
const store = useReportsStore()
const auth = useAuthStore()

const paymentStatusOptions = useEnumOptions(PAYMENT_STATUS, 'statuses.payment')
const canViewAll = computed(() => auth.can('REVENUE_VIEW_ALL'))
const canViewTeam = computed(() => auth.can('REVENUE_VIEW_TEAM'))

const summary = computed(() => store.revenueSummary)

const collectionRate = computed(() => {
  if (!summary.value || !summary.value.total_expected) return 0
  return Math.min(100, (summary.value.total_received / summary.value.total_expected) * 100)
})

const CSV_COLUMNS = computed(() => [
  { key: 'name', label: t('revenue.csvLead') },
  { key: 'expected_revenue', label: t('revenue.csvExpected') },
  { key: 'total_received', label: t('revenue.csvReceived') },
  { key: 'remaining_amount', label: t('revenue.csvRemaining') },
  { key: 'payment_status_label', label: t('revenue.csvStatus') },
  { key: 'payments_count', label: t('revenue.csvPayments') },
  { key: 'validated_at', label: t('revenue.csvValidatedAt') },
])

function csvRows() {
  return store.revenueData.map((r) => ({
    name: [r.first_name, r.last_name].filter(Boolean).join(' '),
    expected_revenue: r.expected_revenue,
    total_received: r.total_received,
    remaining_amount: r.remaining_amount,
    payment_status_label: r.payment_status_label ?? r.payment_status,
    payments_count: r.payments_count,
    validated_at: r.validated_at,
  }))
}

function refresh() {
  store.fetchRevenue()
}

function onFilter(key, value) {
  store.setFilter(key, value)
  refresh()
}

function onPageChange(page) {
  store.setFilter('page', page)
  refresh()
}

onMounted(() => refresh())
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('revenue.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ t('revenue.subtitle') }}</p>
        </div>
        <AppButton
          size="sm"
          class="!bg-white !text-primary hover:!bg-indigo-50"
          @click="store.exportCsv(csvRows(), CSV_COLUMNS, 'revenue-report.csv')"
        >
          <template #icon><Download class="w-4 h-4" /></template>
          {{ t('common.export') }}
        </AppButton>
      </div>
    </div>

    <!-- Summary KPI cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        :title="t('revenue.expectedRevenue')"
        :value="summary?.total_expected"
        format="currency"
        :loading="store.loading.revenue"
        :icon="Banknote"
        accent="indigo"
      />
      <KpiCard
        :title="t('revenue.receivedRevenue')"
        :value="summary?.total_received"
        format="currency"
        :loading="store.loading.revenue"
        :icon="CircleDollarSign"
        accent="emerald"
      />
      <KpiCard
        :title="t('revenue.remainingRevenue')"
        :value="summary?.total_remaining"
        format="currency"
        :loading="store.loading.revenue"
        :icon="Receipt"
        accent="amber"
      />
      <KpiCard
        :title="t('revenue.fullyPaid')"
        :value="summary?.fully_paid"
        :sub-value="summary ? `${summary.leads_count} ${t('revenue.validatedLeads')}` : null"
        :loading="store.loading.revenue"
        :icon="CheckCircle2"
        accent="emerald"
      />
    </div>

    <!-- Collection rate -->
    <AppCard v-if="summary" padding="sm">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-gray-700 shrink-0">{{ t('revenue.collectionRate') }}</span>
        <div class="flex-1">
          <AppProgressBar
            :value="collectionRate"
            :color="collectionRate >= 80 ? 'bg-success' : collectionRate >= 40 ? 'bg-warning' : 'bg-danger'"
            height="h-2.5"
            show-label
          />
        </div>
      </div>
    </AppCard>

    <!-- Filters -->
    <AppCard padding="sm">
      <div class="flex items-center gap-2 flex-wrap justify-between">
        <div class="flex items-center gap-2 flex-wrap">
          <AppInput
            :model-value="store.filters.from"
            type="date"
            class="w-36"
            @update:model-value="(v) => onFilter('from', v)"
          />
          <span class="text-gray-400 text-sm">–</span>
          <AppInput
            :model-value="store.filters.to"
            type="date"
            class="w-36"
            @update:model-value="(v) => onFilter('to', v)"
          />
          <AppSelect
            :model-value="store.filters.payment_status ?? ''"
            :options="[{ value: '', label: t('revenue.allStatuses') }, ...paymentStatusOptions]"
            class="w-48"
            @update:model-value="(v) => onFilter('payment_status', v || null)"
          />
        </div>
        <AppButton
          v-if="store.activeFiltersCount"
          variant="danger"
          size="sm"
          @click="store.resetFilters(); refresh()"
        >
          <template #icon><X class="w-3.5 h-3.5" /></template>
          {{ t('revenue.clearFilters') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Table -->
    <AppCard padding="none">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.leadCol') }}</th>
              <th class="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.expectedCol') }}</th>
              <th class="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.receivedCol') }}</th>
              <th class="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.remainingCol') }}</th>
              <th class="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.statusCol') }}</th>
              <th class="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.paymentsCol') }}</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.validatedAtCol') }}</th>
              <th v-if="canViewAll || canViewTeam" class="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{{ t('revenue.agentCol') }}</th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton -->
            <template v-if="store.loading.revenue">
              <tr v-for="n in 8" :key="`sk-${n}`" class="border-b border-gray-50">
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="140px" /></td>
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="80px" /></td>
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="80px" /></td>
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="80px" /></td>
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="100px" /></td>
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="40px" /></td>
                <td class="px-5 py-3.5"><AppSkeleton height="14px" width="90px" /></td>
                <td v-if="canViewAll || canViewTeam" class="px-5 py-3.5"><AppSkeleton height="14px" width="100px" /></td>
              </tr>
            </template>

            <!-- Empty state -->
            <tr v-else-if="store.revenueData.length === 0">
              <td :colspan="canViewAll || canViewTeam ? 8 : 7" class="px-5 py-12 text-center text-sm text-gray-400">
                {{ t('revenue.noLeadsForPeriod') }}
              </td>
            </tr>

            <!-- Data -->
            <template v-else>
              <tr
                v-for="row in store.revenueData"
                :key="row.id"
                class="border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
              >
                <td class="px-5 py-3.5">
                  <div>
                    <p class="font-medium text-gray-900">
                      {{ [row.first_name, row.last_name].filter(Boolean).join(' ') }}
                    </p>
                    <p v-if="row.phone" class="text-xs text-gray-400">{{ row.phone }}</p>
                  </div>
                </td>
                <td class="px-5 py-3.5 text-right tabular-nums font-medium text-gray-900">
                  {{ formatCurrency(row.expected_revenue) }}
                </td>
                <td class="px-5 py-3.5 text-right tabular-nums font-medium text-success">
                  {{ formatCurrency(row.total_received) }}
                </td>
                <td class="px-5 py-3.5 text-right tabular-nums font-medium text-warning">
                  {{ formatCurrency(row.remaining_amount) }}
                </td>
                <td class="px-5 py-3.5 text-center">
                  <PaymentStatusBadge :status="row.payment_status" />
                </td>
                <td class="px-5 py-3.5 text-right tabular-nums text-gray-700">
                  {{ row.payments_count }}
                </td>
                <td class="px-5 py-3.5 text-gray-500">
                  {{ formatDate(row.validated_at) }}
                </td>
                <td v-if="canViewAll || canViewTeam" class="px-5 py-3.5">
                  <div v-if="row.agent" class="flex items-center gap-2">
                    <AppAvatar :name="row.agent.name" size="xs" />
                    <div>
                      <p class="text-xs font-medium text-gray-700">{{ row.agent.name }}</p>
                      <p v-if="row.team" class="text-xs text-gray-400">{{ row.team.name }}</p>
                    </div>
                  </div>
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="store.revenueData.length" class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1"
          :to="Math.min(store.meta.current_page * store.meta.per_page, store.meta.total)"
          :per-page="store.meta.per_page"
          @page-change="onPageChange"
          @per-page-change="(v) => onFilter('per_page', v)"
        />
      </div>
    </AppCard>
  </div>
</template>
