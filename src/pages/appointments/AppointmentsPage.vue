<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Calendar, Pencil, Trash2 } from 'lucide-vue-next'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'
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

function isOverdue(row) {
  if (!row.scheduled_at) return false
  if (row.status === 'REALISE' || row.status === 'ANNULE') return false
  return new Date(row.scheduled_at) < new Date()
}

function leadName(row) {
  return [row.lead?.first_name, row.lead?.last_name].filter(Boolean).join(' ') || row.lead?.reference || '—'
}

const COLUMNS = computed(() => [
  { key: 'lead', label: t('appointments.lead') },
  { key: 'scheduled_at', label: t('appointments.dateTime'), sortable: true },
  { key: 'status', label: t('appointments.status') },
  { key: 'assigned_to', label: t('appointments.agent') },
  { key: 'insurance_type', label: t('appointments.insuranceType') },
  { key: 'actions', label: '', align: 'right', width: '90px' },
])

const aptStatusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')

/* ── "Date" chip: presets mapped onto the API's from / to (scheduled_at) ── */
const datePreset = ref('')
const dateOptions = computed(() => [
  { value: 'today', label: t('appointments.presets.today') },
  { value: 'week', label: t('appointments.presets.week') },
  { value: 'next7', label: t('appointments.presets.next7') },
  { value: 'past30', label: t('appointments.presets.past30') },
])
function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function setDatePreset(key) {
  datePreset.value = key
  const n = new Date()
  const day = (offset) => new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset)
  let range = ['', '']
  if (key === 'today') range = [isoDay(n), isoDay(n)]
  else if (key === 'week') {
    const monday = day(-((n.getDay() + 6) % 7))
    range = [isoDay(monday), isoDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6))]
  } else if (key === 'next7') range = [isoDay(n), isoDay(day(7))]
  else if (key === 'past30') range = [isoDay(day(-30)), isoDay(n)]
  store.filters.from = range[0]
  // "to" compares a datetime: include the whole last day
  store.setFilter('to', range[1] ? `${range[1]} 23:59:59` : '')
}
function clearFilters() {
  datePreset.value = ''
  store.resetFilters()
}
const hasFilters = computed(() => !!(store.filters.status || store.filters.from || store.filters.to || store.filters.search))

const kpis = computed(() => [
  { label: t('appointments.statsTotal'), value: String(store.stats?.total ?? '—') },
  { label: t('appointments.statsScheduled'), value: String(store.stats?.by_status?.PLANIFIE ?? '—') },
  { label: t('appointments.statsCompleted'), value: String(store.stats?.by_status?.REALISE ?? '—'), tone: 'success' },
  { label: t('appointments.statsCancelled'), value: String(store.stats?.by_status?.ANNULE ?? '—'), tone: 'danger' },
])

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
  const ok = await ui.confirm(t('appointments.deleteTitle'), t('appointments.deleteConfirm'), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.remove(row.id)
    toast.showSuccess(t('appointments.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('leadDetail.errors.appointmentDelete'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('appointments.title')" :count="store.meta.total">
      <template #actions>
        <RouterLink
          to="/calendar"
          class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
        ><Calendar class="w-4 h-4" />{{ t('nav.calendar') }}</RouterLink>
      </template>
    </AppPageHeader>

    <ReportKpis v-if="store.stats || store.loading.stats" :items="kpis" :loading="store.loading.stats && !store.stats" />

    <div class="flex flex-wrap items-center gap-2">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('appointments.searchPlaceholder')"
        class="w-full sm:w-[280px]"
        @update:model-value="store.setFilter('search', $event)"
      />
      <AppFilterChip
        :label="t('appointments.status')"
        :model-value="store.filters.status"
        :options="aptStatusOptions"
        :searchable="false"
        @update:model-value="store.setFilter('status', $event)"
      />
      <AppFilterChip
        :label="t('appointments.date')"
        :model-value="store.filters.from ? datePreset : ''"
        :options="dateOptions"
        :searchable="false"
        @update:model-value="setDatePreset"
      />
      <button v-if="hasFilters" type="button" class="h-9 px-2 text-[13px] text-gray-600 hover:text-gray-900" @click="clearFilters">
        {{ t('common.clear') }}
      </button>
    </div>

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <AppTable
        :columns="COLUMNS"
        :rows="store.list"
        :loading="store.loading.list"
        :sort-key="store.filters.sort_by"
        :sort-dir="store.filters.sort_dir"
        row-key="id"
        class="[&_tbody_tr]:cursor-pointer"
        :row-class="(row) => (isOverdue(row) ? 'bg-danger-bg/30' : '')"
        :empty-title="t('appointments.noAppointments')"
        :empty-description="t('appointments.noAppointmentsDesc')"
        @sort="({ key, dir }) => { store.filters.sort_by = key; store.filters.sort_dir = dir; store.fetchList() }"
        @row-click="(row) => router.push({ name: 'appointments.detail', params: { id: row.id } })"
      >
        <template #cell-lead="{ row }">
          <div v-if="row.lead" class="flex items-center gap-2.5 min-w-0">
            <AppAvatar :name="leadName(row)" size="sm" tone="soft" />
            <span class="font-medium truncate">{{ leadName(row) }}</span>
          </div>
          <span v-else class="text-gray-400">—</span>
        </template>

        <template #cell-scheduled_at="{ row, value }">
          <span :class="['font-mono text-[12.5px] whitespace-nowrap', isOverdue(row) ? 'text-danger-text font-medium' : '']">{{ formatDateTime(value) }}</span>
          <span v-if="isOverdue(row)" class="ml-2 text-[11px] font-semibold uppercase text-danger-text">{{ t('appointments.overdue') }}</span>
        </template>

        <template #cell-status="{ row }">
          <AppointmentStatusBadge :status="row.status" dot />
        </template>

        <template #cell-assigned_to="{ row }">
          <div v-if="row.agent" class="flex items-center gap-2 min-w-0">
            <AppAvatar :name="row.agent.name" size="xs" />
            <span class="truncate">{{ row.agent.name }}</span>
          </div>
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

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <RouterLink
              v-if="auth.can('APPOINTMENTS_UPDATE')"
              :to="{ name: 'appointments.edit', params: { id: row.id } }"
              :aria-label="t('common.edit')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
            ><Pencil class="w-3.5 h-3.5" /></RouterLink>
            <button
              v-if="auth.can('APPOINTMENTS_DELETE')"
              type="button"
              :aria-label="t('common.delete')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
              @click="handleDelete(row)"
            ><Trash2 class="w-3.5 h-3.5" /></button>
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
    </section>
  </div>
</template>
