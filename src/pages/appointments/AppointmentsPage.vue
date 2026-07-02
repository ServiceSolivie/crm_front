<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Filter, X, Calendar, Pencil, Trash2 } from 'lucide-vue-next'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import { APPOINTMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatDateTime } from '@/utils/formatters'

const router = useRouter()
const store = useAppointmentsStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const showFilters = ref(false)

const COLUMNS = computed(() => [
  { key: 'lead', label: t('appointments.lead') },
  { key: 'scheduled_at', label: t('appointments.dateTime'), sortable: true },
  { key: 'status', label: t('appointments.status') },
  { key: 'assigned_to', label: t('appointments.agent') },
  { key: 'insurance_type', label: t('appointments.insuranceType') },
  { key: 'actions', label: '', align: 'right', width: '100px' },
])

const aptStatusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')
const statusOptions = computed(() => [{ value: '', label: t('appointments.allStatuses') }, ...aptStatusOptions.value])

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() =>
  Math.min(store.meta.current_page * store.meta.per_page, store.meta.total),
)

onMounted(() => {
  store.fetchList()
  store.fetchStats()
})

async function handleDelete(row) {
  const ok = await ui.confirm(t('appointments.deleteTitle'), t('appointments.deleteConfirm'))
  if (!ok) return
  try {
    await store.remove(row.id)
    toast.showSuccess(t('appointments.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to delete appointment')
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
          <h1 class="text-2xl font-bold text-white">{{ t('appointments.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('appointments.total') }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <AppButton variant="secondary" size="sm" @click="showFilters = !showFilters">
            <template #icon><Filter class="w-4 h-4" /></template>
            {{ t('common.filter') }}
            <span
              v-if="store.activeFiltersCount"
              class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold"
            >{{ store.activeFiltersCount }}</span>
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Stats cards -->
    <div v-if="store.stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-gray-900">{{ store.stats.total ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ t('appointments.statsTotal') }}</p>
      </AppCard>
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-info">{{ store.stats.by_status.PLANIFIE ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ t('appointments.statsScheduled') }}</p>
      </AppCard>
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-success">{{ store.stats.by_status.REALISE ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ t('appointments.statsCompleted') }}</p>
      </AppCard>
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-danger">{{ store.stats.by_status.ANNULE ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ t('appointments.statsCancelled') }}</p>
      </AppCard>
    </div>

    <!-- Search + Filters -->
    <AppCard padding="sm" class="space-y-3">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('appointments.searchPlaceholder')"
        @update:model-value="store.setFilter('search', $event)"
      />
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showFilters" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AppSelect
            :model-value="store.filters.status"
            :options="statusOptions"
            @update:model-value="store.setFilter('status', $event)"
          />
          <AppInput
            :model-value="store.filters.from"
            type="date"
            :placeholder="t('appointments.fromDate')"
            @update:model-value="store.setFilter('from', $event)"
          />
          <AppInput
            :model-value="store.filters.to"
            type="date"
            :placeholder="t('appointments.toDate')"
            @update:model-value="store.setFilter('to', $event)"
          />
          <div class="flex items-end">
            <AppButton
              v-if="store.activeFiltersCount"
              variant="danger"
              size="sm"
              class="w-full"
              @click="store.resetFilters()"
            >
              <template #icon><X class="w-3.5 h-3.5" /></template>
              {{ t('common.clear') }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </AppCard>

    <!-- Table -->
    <AppCard padding="none">
      <AppTable
        :columns="COLUMNS"
        :rows="store.list"
        :loading="store.loading.list"
        :sort-key="store.filters.sort_by"
        :sort-dir="store.filters.sort_dir"
        row-key="id"
        :empty-title="t('appointments.noAppointments')"
        :empty-description="t('appointments.noAppointmentsDesc')"
        @sort="({ key, dir }) => { store.filters.sort_by = key; store.filters.sort_dir = dir; store.fetchList() }"
        @row-click="(row) => router.push({ name: 'appointments.detail', params: { id: row.id } })"
      >
        <template #cell-lead="{ row }">
          <div v-if="row.lead" class="flex items-center gap-2">
            <AppAvatar :name="`${row.lead.first_name ?? ''} ${row.lead.last_name ?? ''}`" size="sm" />
            <span class="font-medium text-gray-900 text-sm">
              {{ [row.lead.first_name, row.lead.last_name].filter(Boolean).join(' ') || '—' }}
            </span>
          </div>
          <span v-else class="text-gray-400 text-sm">—</span>
        </template>

        <template #cell-scheduled_at="{ value }">
          <div class="flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span class="text-sm text-gray-700 whitespace-nowrap">{{ formatDateTime(value) }}</span>
          </div>
        </template>

        <template #cell-status="{ row }">
          <AppointmentStatusBadge :status="row.status" dot />
        </template>

        <template #cell-assigned_to="{ row }">
          <div v-if="row.agent" class="flex items-center gap-1.5">
            <AppAvatar :name="row.agent.name" size="xs" />
            <span class="text-sm text-gray-700">{{ row.agent.name }}</span>
          </div>
          <span v-else class="text-gray-400 text-sm">—</span>
        </template>

        <template #cell-insurance_type="{ row }">
          <span class="text-xs text-gray-600">{{ row.lead.insurance_type ? row.lead.insurance_type : '—' }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1" @click.stop>
            <button
              v-if="auth.can('APPOINTMENTS_UPDATE')"
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="router.push({ name: 'appointments.edit', params: { id: row.id } })"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="auth.can('APPOINTMENTS_DELETE')"
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
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
          @page-change="store.setFilter('page', $event)"
          @per-page-change="store.setFilter('per_page', $event)"
        />
      </div>
    </AppCard>
  </div>
</template>
