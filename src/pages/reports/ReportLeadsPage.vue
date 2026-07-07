<script setup>
import { onMounted, computed, ref } from 'vue'
import { Download, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useReportsStore } from '@/stores/reports.store'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'
import { formatDate } from '@/utils/formatters'

const { t } = useI18n()
const store = useReportsStore()

const COLUMNS = computed(() => [
  { key: 'name', label: t('reports.colName') },
  { key: 'phone', label: t('reports.colPhone') },
  { key: 'status', label: t('reports.colStatus') },
  { key: 'insurance_type', label: t('reports.colType') },
  { key: 'source', label: t('reports.colSource') },
  { key: 'assigned_to', label: t('reports.colAgent') },
  { key: 'created_at', label: t('reports.colCreated') },
])

const CSV_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'insurance_type', label: 'Insurance Type' },
  { key: 'created_at', label: 'Created At' },
]

const exporting = ref(false)

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => store.fetchLeads())

async function exportCsv() {
  exporting.value = true
  try {
    await store.exportAllLeads(
      CSV_COLUMNS,
      'leads-report.csv',
      (row) => ({ ...row, name: [row.first_name, row.last_name].filter(Boolean).join(' ') }),
    )
  } finally {
    exporting.value = false
  }
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
          <h1 class="text-2xl font-bold text-white">{{ t('reports.leads') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('reports.records') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" :disabled="exporting" @click="exportCsv">
          <template #icon><Download class="w-4 h-4" /></template>
          {{ exporting ? t('common.loading') : t('reports.exportCsv') }}
        </AppButton>
      </div>
    </div>

    <!-- Date range controls -->
    <AppCard padding="sm">
      <div class="flex items-center gap-2 flex-wrap justify-between">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm text-gray-500">{{ t('reports.dateRange') }}</span>
          <AppInput
            :model-value="store.filters.from"
            type="date"
            class="w-36"
            @update:model-value="(v) => { store.setFilter('from', v); store.fetchLeads() }"
          />
          <span class="text-gray-400 text-sm">–</span>
          <AppInput
            :model-value="store.filters.to"
            type="date"
            class="w-36"
            @update:model-value="(v) => { store.setFilter('to', v); store.fetchLeads() }"
          />
        </div>
        <AppButton
          v-if="store.activeFiltersCount"
          variant="danger"
          size="sm"
          @click="store.resetFilters(); store.fetchLeads()"
        >
          <template #icon><X class="w-3.5 h-3.5" /></template>
          {{ t('common.clear') }}
        </AppButton>
      </div>
    </AppCard>

    <AppCard padding="none">
      <AppTable
        :columns="COLUMNS"
        :rows="store.leadsData"
        :loading="store.loading.leads"
        row-key="id"
        :empty-title="t('reports.noLeadData')"
        :empty-description="t('reports.adjustDate')"
      >
        <template #cell-name="{ row }">
          <span class="text-sm font-medium text-gray-900">
            {{ [row.first_name, row.last_name].filter(Boolean).join(' ') || '—' }}
          </span>
        </template>

        <template #cell-status="{ value }">
          <LeadStatusBadge :status="value" />
        </template>

        <template #cell-insurance_type="{ value }">
          <span class="text-xs text-gray-600">{{ value?.replace(/_/g, ' ') ?? '—' }}</span>
        </template>

        <template #cell-source="{ row }">
          <span class="text-sm text-gray-600">{{ row.lead_source?.name ?? '—' }}</span>
        </template>

        <template #cell-assigned_to="{ row }">
          <div v-if="row.assigned_agent" class="flex items-center gap-1.5">
            <AppAvatar :name="row.assigned_agent.name" size="xs" />
            <span class="text-sm text-gray-700">{{ row.assigned_agent.name }}</span>
          </div>
          <span v-else class="text-gray-400 text-sm">—</span>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-sm text-gray-500">{{ formatDate(value) }}</span>
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
          @page-change="(p) => { store.setFilter('page', p); store.fetchLeads() }"
          @per-page-change="(p) => { store.setFilter('per_page', p); store.fetchLeads() }"
        />
      </div>
    </AppCard>
  </div>
</template>
