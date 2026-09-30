<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy, ExternalLink, CreditCard } from 'lucide-vue-next'
import { usePaymentsStore } from '@/stores/payments.store'
import { useAuthStore } from '@/stores/auth.store'
import { usersApi } from '@/api/users'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { formatCurrency, formatDateTime } from '@/utils/formatters'

/**
 * Payments page: every payment link sent through Hyperswitch, read from
 * the CRM (only the leads the user can see), with filters (status, agent,
 * period) and sorting. Refreshed live when a payment is received or fails.
 */
const { t } = useI18n()
const store = usePaymentsStore()
const auth = useAuthStore()
const toast = useToast()

const STATUSES = ['OUVERTE', 'A_VERIFIER', 'PAYEE', 'ECHOUEE', 'ANNULEE', 'EXPIREE']
const STATUS_VARIANT = { OUVERTE: 'info', A_VERIFIER: 'warning', PAYEE: 'success', ECHOUEE: 'danger', ANNULEE: 'neutral', EXPIREE: 'warning' }

const COLUMNS = computed(() => [
  { key: 'reference', label: t('paymentsPage.reference') },
  { key: 'lead', label: t('paymentsPage.lead') },
  { key: 'amount', label: t('paymentsPage.amount'), align: 'right' },
  { key: 'status', label: t('paymentsPage.status') },
  { key: 'client_email', label: t('paymentsPage.email') },
  { key: 'created_by', label: t('paymentsPage.createdBy') },
  { key: 'created_at', label: t('paymentsPage.createdAt') },
  { key: 'actions', label: '', align: 'right', width: '90px' },
])

const statusOptions = computed(() => STATUSES.map((s) => ({ value: s, label: t('paymentLink.statuses.' + s) })))

// "Envoyé par": only for users who can list the CRM's users (managers…)
const agents = ref([])
const agentOptions = computed(() => agents.value.map((u) => ({ value: u.id, label: u.name })))
async function loadAgents() {
  if (!auth.can('USERS_VIEW')) return
  try {
    agents.value = (await usersApi.list({ per_page: 100 })).data ?? []
  } catch {
    agents.value = []
  }
}

// "Période" presets map onto the API's from (created_at, inclusive)
const periodPreset = ref('')
const periodOptions = computed(() => [
  { value: 'today', label: t('paymentsPage.periods.today') },
  { value: '7d', label: t('paymentsPage.periods.last7') },
  { value: '30d', label: t('paymentsPage.periods.last30') },
  { value: 'month', label: t('paymentsPage.periods.thisMonth') },
])
function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function setPeriod(key) {
  periodPreset.value = key
  const now = new Date()
  const start = {
    today: now,
    '7d': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
    '30d': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
  }[key]
  store.filters.to = ''
  store.setFilter('from', start ? isoDay(start) : '')
}

const sortOptions = computed(() => [
  { value: '-created_at', label: t('paymentsPage.sorts.newest') },
  { value: 'created_at', label: t('paymentsPage.sorts.oldest') },
  { value: '-amount', label: t('paymentsPage.sorts.amountDesc') },
  { value: 'amount', label: t('paymentsPage.sorts.amountAsc') },
])

const hasFilters = computed(() => {
  const f = store.filters
  return !!(f.search || f.status.length || f.created_by || f.from || f.to || f.sort)
})
function clearFilters() {
  periodPreset.value = ''
  store.resetFilters()
}

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

async function copy(url) {
  try {
    await navigator.clipboard.writeText(url)
    toast.showSuccess(t('paymentLink.copied'))
  } catch {
    toast.showError(t('paymentLink.errors.copy'))
  }
}

// A payment was received / failed (live notification): refresh the list
const onPaymentUpdated = () => store.fetchList()
onMounted(() => {
  store.fetchList()
  loadAgents()
  window.addEventListener('crm:payment-updated', onPaymentUpdated)
})
onBeforeUnmount(() => window.removeEventListener('crm:payment-updated', onPaymentUpdated))
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('paymentsPage.title')" :count="store.meta.total" />

    <div class="flex flex-wrap items-center gap-2">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('paymentsPage.searchPlaceholder')"
        class="w-full sm:w-[320px]"
        @update:model-value="store.setFilter('search', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('paymentsPage.status')"
        :model-value="store.filters.status"
        :options="statusOptions"
        :searchable="false"
        @update:model-value="store.setFilter('status', $event)"
      />
      <AppFilterChip
        v-if="agentOptions.length"
        :label="t('paymentsPage.createdBy')"
        :model-value="store.filters.created_by"
        :options="agentOptions"
        @update:model-value="store.setFilter('created_by', $event)"
      />
      <AppFilterChip
        :label="t('paymentsPage.period')"
        :model-value="store.filters.from ? periodPreset : ''"
        :options="periodOptions"
        :searchable="false"
        @update:model-value="setPeriod"
      />
      <AppFilterChip
        :label="t('paymentsPage.sort')"
        :model-value="store.filters.sort"
        :options="sortOptions"
        :searchable="false"
        @update:model-value="store.setFilter('sort', $event)"
      />
      <button
        v-if="hasFilters"
        type="button"
        class="h-9 px-2 text-[13px] text-gray-600 hover:text-gray-900"
        @click="clearFilters"
      >{{ t('common.clear') }}</button>
    </div>

    <AppCard padding="none">
      <AppTable
        :columns="COLUMNS"
        :rows="store.list"
        :loading="store.loading.list"
        row-key="id"
        :empty-title="t('paymentsPage.empty')"
        :empty-description="t('paymentsPage.emptyDesc')"
      >
        <template #cell-reference="{ row }">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
              <CreditCard class="w-4 h-4" />
            </span>
            <div class="min-w-0">
              <p class="font-mono text-[12.5px] font-medium text-gray-900 whitespace-nowrap">{{ row.reference }}</p>
              <p v-if="row.hyperswitch_payment_id" class="font-mono text-[11px] text-gray-500 truncate max-w-[180px]" :title="row.hyperswitch_payment_id">
                {{ row.hyperswitch_payment_id }}
              </p>
            </div>
          </div>
        </template>

        <template #cell-lead="{ row }">
          <div v-if="row.lead" class="min-w-0">
            <p class="text-sm text-gray-900 truncate">{{ row.lead.name }}</p>
            <router-link
              :to="{ name: 'leads.detail', params: { id: row.lead.id } }"
              class="text-xs text-primary hover:underline"
              @click.stop
            >{{ row.lead.reference }}</router-link>
          </div>
        </template>

        <template #cell-amount="{ row }">
          <span class="font-mono text-[13px] font-medium text-gray-900 whitespace-nowrap">{{ formatCurrency(row.amount, row.currency) }}</span>
        </template>

        <template #cell-status="{ row }">
          <AppBadge :variant="STATUS_VARIANT[row.status] ?? 'neutral'" dot>
            {{ t('paymentLink.statuses.' + row.status, row.status_label) }}
          </AppBadge>
        </template>

        <template #cell-client_email="{ row }">
          <span class="text-sm text-gray-700 truncate max-w-[220px] inline-block">{{ row.client_email }}</span>
        </template>

        <template #cell-created_by="{ row }">
          <div v-if="row.created_by" class="flex items-center gap-1.5">
            <AppAvatar :name="row.created_by.name" size="xs" />
            <span class="text-sm text-gray-700 truncate max-w-[120px]">{{ row.created_by.name }}</span>
          </div>
        </template>

        <template #cell-created_at="{ row }">
          <div class="whitespace-nowrap">
            <p class="font-mono text-[12.5px] text-gray-600">{{ formatDateTime(row.created_at) }}</p>
            <p v-if="!row.sent_at" class="text-[11px] text-warning-text">{{ t('paymentsPage.notEmailed') }}</p>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div v-if="row.payment_url && row.status === 'OUVERTE'" class="flex items-center justify-end gap-1">
            <button
              :title="t('paymentLink.copy')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
              @click="copy(row.payment_url)"
            ><Copy class="w-3.5 h-3.5" /></button>
            <a
              :href="row.payment_url"
              target="_blank"
              rel="noopener noreferrer"
              :title="t('paymentLink.open')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
            ><ExternalLink class="w-3.5 h-3.5" /></a>
          </div>
        </template>
      </AppTable>

      <div v-if="store.meta.last_page > 1" class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          @page-change="store.setFilter('page', $event)"
          @per-page-change="store.setFilter('per_page', $event)"
        />
      </div>
    </AppCard>
  </div>
</template>
