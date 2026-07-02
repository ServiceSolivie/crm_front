<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import { Calendar, X, Clock, User, FileText, ExternalLink, Edit2, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useUsersStore } from '@/stores/users.store'
import { appointmentsApi } from '@/api/appointments'
import { useToast } from '@/composables/useToast'
import { APPOINTMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatDateTime } from '@/utils/formatters'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'

const router = useRouter()
const { t, locale } = useI18n()
const auth = useAuthStore()
const usersStore = useUsersStore()
const toast = useToast()

const calendarRef = ref(null)

// Role guards
const isAgent = computed(() => auth.hasRole('agent'))

// Filters
const search = ref('')
const filterStatus = ref('')
const filterAgentId = ref('')

// UI state
const loading = ref(false)
const selectedApt = ref(null)
const showModal = ref(false)

// Agent options for non-agents
const agentOptions = computed(() => [
  { value: '', label: t('calendar.allAgents') },
  ...usersStore.list.map((u) => ({ value: u.id, label: u.name })),
])

const aptStatusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')
const statusOptions = computed(() => [
  { value: '', label: t('appointments.allStatuses') },
  ...aptStatusOptions.value,
])

const activeFilterCount = computed(() =>
  [search.value, filterStatus.value, filterAgentId.value].filter(Boolean).length,
)

// Color map per status
const STATUS_COLORS = {
  PLANIFIE: { bg: '#6366f1', border: '#4f46e5' },
  REALISE:  { bg: '#10b981', border: '#059669' },
  ANNULE:   { bg: '#ef4444', border: '#dc2626' },
  REPORTE:  { bg: '#f59e0b', border: '#d97706' },
}

// Lead full name helper
function leadName(apt) {
  if (!apt?.lead) return t('nav.appointments')
  return [apt.lead.first_name, apt.lead.last_name].filter(Boolean).join(' ') || t('nav.appointments')
}

// Transform backend appointment → FullCalendar event object
function toFcEvent(apt) {
  const colors = STATUS_COLORS[apt.status] ?? { bg: '#6366f1', border: '#4f46e5' }
  return {
    id: String(apt.id),
    title: leadName(apt),
    start: apt.scheduled_at,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    textColor: '#ffffff',
    extendedProps: { apt },
  }
}

// FullCalendar event source — called on every date range change and refetch
async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  loading.value = true
  try {
    const params = {
      from: fetchInfo.startStr.slice(0, 10),
      to: fetchInfo.endStr.slice(0, 10),
      per_page: 500,
    }
    if (isAgent.value) {
      params.assigned_to = auth.user?.id
    } else if (filterAgentId.value) {
      params.assigned_to = filterAgentId.value
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (search.value)       params.search = search.value

    const { data } = await appointmentsApi.list(params)
    successCallback(data.map(toFcEvent))
  } catch (e) {
    failureCallback(e)
    toast.showError('Failed to load calendar events')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  calendarRef.value?.getApi().refetchEvents()
}

function clearFilters() {
  search.value = ''
  filterStatus.value = ''
  filterAgentId.value = ''
  applyFilters()
}

// Event click → open modal
function onEventClick({ event }) {
  selectedApt.value = event.extendedProps.apt
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedApt.value = null
}

function goToDetail() {
  if (!selectedApt.value) return
  router.push({ name: 'appointments.detail', params: { id: selectedApt.value.id } })
  closeModal()
}

function goToEdit() {
  if (!selectedApt.value) return
  router.push({ name: 'appointments.edit', params: { id: selectedApt.value.id } })
  closeModal()
}

function goToLead() {
  if (!selectedApt.value?.lead?.id) return
  router.push({ name: 'leads.detail', params: { id: selectedApt.value.lead.id } })
  closeModal()
}

// Reactive FullCalendar options — locale switches when the app locale changes
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  locale: locale.value === 'fr' ? frLocale : 'en',
  initialView: 'dayGridMonth',
  headerToolbar: {
    left:   'prev,next today',
    center: 'title',
    right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
  },
  events: fetchEvents,
  eventClick: onEventClick,
  height: 'auto',
  dayMaxEvents: 4,
  eventDisplay: 'block',
  nowIndicator: true,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  slotMinTime: '00:00:00',
  slotMaxTime: '24:00:00',
  allDaySlot: false,
  noEventsText: t('calendar.noEvents'),
  listDaySideFormat: false,
}))

onMounted(async () => {
  if (!isAgent.value) {
    await usersStore.fetchList({ role: 'agent', per_page: 100 })
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('nav.calendar') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">
            {{ isAgent ? t('calendar.agentSubtitle') : t('calendar.adminSubtitle') }}
          </p>
        </div>
        <Loader2 v-if="loading" class="w-5 h-5 text-white/70 animate-spin shrink-0" />
      </div>
    </div>

    <!-- Filters -->
    <AppCard padding="sm">
      <div class="flex items-center gap-3 flex-wrap">
        <AppSearchInput
          :model-value="search"
          :placeholder="t('calendar.searchPlaceholder')"
          class="flex-1 min-w-[180px]"
          @update:model-value="search = $event; applyFilters()"
        />
        <AppSelect
          :model-value="filterStatus"
          :options="statusOptions"
          class="w-44"
          @update:model-value="filterStatus = $event; applyFilters()"
        />
        <AppSelect
          v-if="!isAgent"
          :model-value="filterAgentId"
          :options="agentOptions"
          class="w-44"
          @update:model-value="filterAgentId = $event; applyFilters()"
        />
        <AppButton
          v-if="activeFilterCount"
          variant="ghost"
          size="sm"
          @click="clearFilters"
        >
          <template #icon><X class="w-3.5 h-3.5" /></template>
          {{ t('common.clear') }}
        </AppButton>
      </div>

      <!-- Status legend -->
      <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        <span class="text-xs text-gray-400 font-medium">{{ t('calendar.legend') }} :</span>
        <div
          v-for="(val, key) in APPOINTMENT_STATUS"
          :key="key"
          class="flex items-center gap-1.5"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            :style="{ backgroundColor: STATUS_COLORS[key]?.bg }"
          />
          <span class="text-xs text-gray-600">{{ t('statuses.appointment.' + key, val.label) }}</span>
        </div>
      </div>
    </AppCard>

    <!-- Calendar -->
    <AppCard padding="none" class="overflow-hidden">
      <div class="p-4">
        <FullCalendar ref="calendarRef" :options="calendarOptions" />
      </div>
    </AppCard>

    <!-- Event detail modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showModal && selectedApt"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeModal" />

          <!-- Panel -->
          <div class="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <!-- Status color strip -->
            <div
              class="h-1.5 w-full"
              :style="{ backgroundColor: STATUS_COLORS[selectedApt.status]?.bg ?? '#6366f1' }"
            />

            <div class="p-5">
              <!-- Header row -->
              <div class="flex items-start justify-between gap-3 mb-4">
                <div class="flex items-start gap-3 min-w-0">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    :style="{ backgroundColor: (STATUS_COLORS[selectedApt.status]?.bg ?? '#6366f1') + '18' }"
                  >
                    <Calendar
                      class="w-5 h-5"
                      :style="{ color: STATUS_COLORS[selectedApt.status]?.bg ?? '#6366f1' }"
                    />
                  </div>
                  <div class="min-w-0">
                    <button
                      class="text-base font-semibold text-gray-900 hover:text-primary transition-colors text-left leading-tight"
                      @click="goToLead"
                    >
                      {{ leadName(selectedApt) }}
                    </button>
                    <AppointmentStatusBadge :status="selectedApt.status" class="mt-1" />
                  </div>
                </div>
                <button
                  class="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0"
                  @click="closeModal"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Detail rows -->
              <div class="space-y-3 text-sm">
                <div class="flex items-center gap-2.5 text-gray-700">
                  <Clock class="w-4 h-4 text-gray-400 shrink-0" />
                  <span class="font-medium">{{ formatDateTime(selectedApt.scheduled_at) }}</span>
                </div>

                <div v-if="selectedApt.agent" class="flex items-center gap-2.5">
                  <User class="w-4 h-4 text-gray-400 shrink-0" />
                  <AppAvatar :name="selectedApt.agent.name" size="xs" />
                  <span class="text-gray-700">{{ selectedApt.agent.name }}</span>
                </div>
                <div v-else class="flex items-center gap-2.5 text-gray-400">
                  <User class="w-4 h-4 shrink-0" />
                  <span class="text-sm italic">{{ t('common.unassigned') }}</span>
                </div>

                <div v-if="selectedApt.lead?.phone" class="flex items-center gap-2.5 text-gray-600">
                  <span class="w-4 h-4 text-gray-400 shrink-0 text-center text-xs">📞</span>
                  <span>{{ selectedApt.lead.phone }}</span>
                </div>

                <div v-if="selectedApt.notes" class="flex items-start gap-2.5 text-gray-600">
                  <FileText class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <p class="text-xs leading-relaxed line-clamp-3">{{ selectedApt.notes }}</p>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
                <AppButton size="sm" class="flex-1" @click="goToDetail">
                  <template #icon><ExternalLink class="w-3.5 h-3.5" /></template>
                  {{ t('calendar.viewDetails') }}
                </AppButton>
                <AppButton variant="secondary" size="sm" @click="goToEdit">
                  <template #icon><Edit2 class="w-3.5 h-3.5" /></template>
                  {{ t('common.edit') }}
                </AppButton>
                <button
                  v-if="selectedApt.lead?.id"
                  class="text-xs text-primary hover:underline px-2 py-1 shrink-0"
                  @click="goToLead"
                >
                  {{ t('calendar.viewLead') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
/* FullCalendar design-system overrides */
.fc {
  --fc-border-color: #e5e7eb;
  --fc-button-bg-color: var(--color-primary, #6366f1);
  --fc-button-border-color: var(--color-primary, #6366f1);
  --fc-button-hover-bg-color: var(--color-primary-hover, #4f46e5);
  --fc-button-hover-border-color: var(--color-primary-hover, #4f46e5);
  --fc-button-active-bg-color: #4338ca;
  --fc-button-active-border-color: #4338ca;
  --fc-today-bg-color: rgba(99, 102, 241, 0.06);
  --fc-neutral-bg-color: #f9fafb;
  --fc-list-event-hover-bg-color: #f3f4f6;
  --fc-page-bg-color: #ffffff;
  --fc-highlight-color: rgba(99, 102, 241, 0.1);
  --fc-now-indicator-color: #ef4444;
  font-family: inherit;
}

.fc .fc-toolbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.fc .fc-button {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  box-shadow: none !important;
}

.fc .fc-button:focus {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25) !important;
}

.fc .fc-toolbar.fc-header-toolbar {
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.fc .fc-col-header-cell {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  padding: 0.5rem 0;
}

.fc .fc-daygrid-day-number {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  padding: 4px 6px;
}

.fc .fc-day-today .fc-daygrid-day-number {
  background-color: var(--color-primary, #6366f1);
  color: #fff;
  border-radius: 9999px;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fc .fc-event {
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  padding: 1px 4px;
}

.fc .fc-event:hover {
  opacity: 0.85;
}

.fc .fc-list-event:hover td {
  background-color: var(--fc-list-event-hover-bg-color);
}

.fc .fc-list-event-title a {
  color: #111827;
  font-weight: 500;
  text-decoration: none;
}

.fc .fc-list-day-cushion {
  background-color: #f9fafb;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.fc .fc-timegrid-slot-label {
  font-size: 0.7rem;
  color: #9ca3af;
}

.fc .fc-more-link {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-primary, #6366f1);
}

.fc .fc-popover {
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
}

.fc .fc-popover-header {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  background-color: #f9fafb;
  border-radius: 0.75rem 0.75rem 0 0;
}
</style>
