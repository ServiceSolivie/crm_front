<script setup>
import { onMounted, computed } from 'vue'
import { Download } from 'lucide-vue-next'
import { useReportsStore } from '@/stores/reports.store'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters'

const store = useReportsStore()

const COLUMNS = [
  { key: 'lead', label: 'Lead' },
  { key: 'scheduled_at', label: 'Scheduled At' },
  { key: 'status', label: 'Status' },
  { key: 'assigned_to', label: 'Agent' },
  { key: 'insurance_type', label: 'Type' },
]

const CSV_COLUMNS = [
  { key: 'scheduled_at', label: 'Scheduled At' },
  { key: 'status', label: 'Status' },
  { key: 'insurance_type', label: 'Insurance Type' },
]

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => store.fetchAppointments())
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">Appointments Report</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} records</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="store.exportCsv(store.appointmentsData, CSV_COLUMNS, 'appointments-report.csv')">
          <template #icon><Download class="w-4 h-4" /></template>
          Export CSV
        </AppButton>
      </div>
    </div>

    <!-- Date range controls -->
    <AppCard padding="sm">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm text-gray-500">Date range:</span>
        <AppInput
          :model-value="store.filters.from"
          type="date"
          class="w-36"
          @update:model-value="(v) => { store.setFilter('from', v); store.fetchAppointments() }"
        />
        <span class="text-gray-400 text-sm">–</span>
        <AppInput
          :model-value="store.filters.to"
          type="date"
          class="w-36"
          @update:model-value="(v) => { store.setFilter('to', v); store.fetchAppointments() }"
        />
      </div>
    </AppCard>

    <AppCard padding="none">
      <AppTable
        :columns="COLUMNS"
        :rows="store.appointmentsData"
        :loading="store.loading.appointments"
        row-key="id"
        empty-title="No appointment data"
        empty-description="Adjust the date range to load report data."
      >
        <template #cell-lead="{ row }">
          <span class="text-sm font-medium text-gray-900">
            {{ row.lead ? [row.lead.first_name, row.lead.last_name].filter(Boolean).join(' ') || '—' : '—' }}
          </span>
        </template>
        <template #cell-scheduled_at="{ value }">
          <span class="text-sm text-gray-700">{{ formatDateTime(value) }}</span>
        </template>
        <template #cell-status="{ value }">
          <AppointmentStatusBadge :status="value" />
        </template>
        <template #cell-assigned_to="{ row }">
          <div v-if="row.agent" class="flex items-center gap-1.5">
            <AppAvatar :name="row.agent.name" size="xs" />
            <span class="text-sm text-gray-700">{{ row.agent.name }}</span>
          </div>
          <span v-else class="text-gray-400 text-sm">—</span>
        </template>
        <template #cell-insurance_type="{ row }">
          <span class="text-xs text-gray-600">{{ row.lead ? row.lead.insurance_type : '—' }}</span>
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
          @page-change="(p) => { store.setFilter('page', p); store.fetchAppointments() }"
        />
      </div>
    </AppCard>
  </div>
</template>
