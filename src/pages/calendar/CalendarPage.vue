<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import { ChevronLeft, ChevronRight, X, Phone, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useUsersStore } from '@/stores/users.store'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { appointmentsApi } from '@/api/appointments'
import { useToast } from '@/composables/useToast'
import { APPOINTMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { firstErrorMessage } from '@/utils/errors'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import AppointmentRescheduleModal from '@/components/modules/appointments/AppointmentRescheduleModal.vue'

const { t, locale } = useI18n()
const auth = useAuthStore()
const usersStore = useUsersStore()
const appointmentsStore = useAppointmentsStore()
const toast = useToast()

const calendarRef = ref(null)
const isAgent = computed(() => auth.hasRole('agent'))
const canUpdate = computed(() => auth.can('APPOINTMENTS_UPDATE'))

/* ── Filters ───────────────────────────────────────────────── */
const filterStatus = ref('')
const filterAgentId = ref('')
const filterSearch = ref('')
const statusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')
const agentOptions = computed(() => usersStore.list.map((u) => ({ value: u.id, label: u.name })))
watch([filterStatus, filterAgentId, filterSearch], () => calendarRef.value?.getApi().refetchEvents())

/* ── View + visible range ──────────────────────────────────── */
const VIEWS = [
  { key: 'dayGridMonth', label: 'month' },
  { key: 'timeGridWeek', label: 'week' },
  { key: 'timeGridDay', label: 'day' },
  { key: 'listWeek', label: 'list' },
]
function savedView() {
  try {
    const v = localStorage.getItem('crm_calendar_view')
    return VIEWS.some((x) => x.key === v) ? v : 'timeGridWeek'
  } catch {
    return 'timeGridWeek'
  }
}
const initialView = savedView() // read once: the options object must not change when the view does
const currentView = ref(initialView)
const rangeTitle = ref('')

function changeView(key) {
  currentView.value = key
  try { localStorage.setItem('crm_calendar_view', key) } catch { /* private mode */ }
  calendarRef.value?.getApi().changeView(key)
}
function go(dir) {
  const api = calendarRef.value?.getApi()
  if (!api) return
  if (dir === 'prev') api.prev()
  else if (dir === 'next') api.next()
  else api.today()
}
function onDatesSet(info) {
  rangeTitle.value = info.view.title
}

/* ── Events ────────────────────────────────────────────────── */
const loading = ref(false)

// Tinted blocks, dark text — same status colours as the badges
const STATUS_STYLE = {
  PLANIFIE: { bg: '#dbeafe', fg: '#1d4ed8' },
  REALISE: { bg: '#d1fae5', fg: '#047857' },
  REPORTE: { bg: '#fef3c7', fg: '#b45309' },
  ANNULE: { bg: '#fee2e2', fg: '#b91c1c' },
}

function leadName(apt) {
  return [apt?.lead?.first_name, apt?.lead?.last_name].filter(Boolean).join(' ') || apt?.lead?.reference || t('nav.appointments')
}

function toFcEvent(apt) {
  const s = STATUS_STYLE[apt.status] ?? STATUS_STYLE.PLANIFIE
  return {
    id: String(apt.id),
    title: leadName(apt),
    start: apt.scheduled_at,
    // Appointments carry their own length (duration_minutes → ends_at)
    ...(apt.ends_at ? { end: apt.ends_at } : {}),
    backgroundColor: s.bg,
    borderColor: s.bg,
    textColor: s.fg,
    classNames: [`apt-${apt.status}`],
    extendedProps: { apt },
  }
}

async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  loading.value = true
  try {
    const params = {
      from: fetchInfo.startStr.slice(0, 10),
      to: fetchInfo.endStr.slice(0, 10),
      per_page: 500,
    }
    // The API filters appointments by `agent_id`; agents are already scoped to their own
    if (!isAgent.value && filterAgentId.value) params.agent_id = filterAgentId.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterSearch.value.trim()) params.search = filterSearch.value.trim()
    const { data } = await appointmentsApi.list(params)
    successCallback(data.map(toFcEvent))
  } catch (e) {
    failureCallback(e)
    toast.showError(t('calendar.loadError'))
  } finally {
    loading.value = false
  }
}

// Time, then lead name — built with text nodes (lead names are user data)
function eventContent(arg) {
  const wrap = document.createElement('div')
  wrap.className = 'apt-content'
  if (arg.timeText) {
    const time = document.createElement('span')
    time.className = 'apt-time'
    time.textContent = arg.timeText
    wrap.appendChild(time)
  }
  const name = document.createElement('span')
  name.className = 'apt-name'
  name.textContent = arg.event.title
  wrap.appendChild(name)
  return { domNodes: [wrap] }
}

/* ── Selection (side panel) ────────────────────────────────── */
const selectedApt = ref(null)
let selectedEl = null

function onEventClick({ event, el, jsEvent }) {
  jsEvent.preventDefault()
  selectedEl?.classList.remove('apt-selected')
  selectedEl = el
  el.classList.add('apt-selected')
  selectedApt.value = event.extendedProps.apt
}
function clearSelection() {
  selectedEl?.classList.remove('apt-selected')
  selectedEl = null
  selectedApt.value = null
}
// Keep the highlight when the calendar re-renders (refetch, view change)
function onEventDidMount({ event, el }) {
  if (selectedApt.value && String(selectedApt.value.id) === event.id) {
    el.classList.add('apt-selected')
    selectedEl = el
  }
}

const selectedWhen = computed(() => {
  if (!selectedApt.value) return ''
  const d = new Date(selectedApt.value.scheduled_at)
  const loc = locale.value === 'fr' ? 'fr-FR' : 'en-GB'
  const day = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })
  const hm = { hour: '2-digit', minute: '2-digit' }
  const time = d.toLocaleTimeString(loc, hm)
  const end = selectedApt.value.ends_at ? new Date(selectedApt.value.ends_at).toLocaleTimeString(loc, hm) : null
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}${end ? `–${end}` : ''}`
})

/* ── Actions on the selected appointment ───────────────────── */
const actionBusy = ref(false)
const showReschedule = ref(false)

async function refreshAfter(updated) {
  if (updated) selectedApt.value = { ...selectedApt.value, ...updated }
  calendarRef.value?.getApi().refetchEvents()
}

async function setStatus(status) {
  if (!selectedApt.value) return
  actionBusy.value = true
  try {
    const updated = await appointmentsStore.updateStatus(selectedApt.value.id, status)
    toast.showSuccess(t('calendar.updated'))
    await refreshAfter(updated)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('calendar.updateError')))
  } finally {
    actionBusy.value = false
  }
}

async function onReschedule(scheduledAt) {
  actionBusy.value = true
  try {
    const updated = await appointmentsStore.reschedule(selectedApt.value.id, scheduledAt)
    showReschedule.value = false
    toast.showSuccess(t('calendar.updated'))
    await refreshAfter(updated)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('calendar.updateError')))
  } finally {
    actionBusy.value = false
  }
}

/* ── FullCalendar options ──────────────────────────────────── */
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  locale: locale.value === 'fr' ? frLocale : 'en',
  initialView,
  headerToolbar: false,
  events: fetchEvents,
  eventClick: onEventClick,
  eventContent,
  eventDidMount: onEventDidMount,
  datesSet: onDatesSet,
  height: 'auto',
  dayMaxEvents: 4,
  eventDisplay: 'block',
  nowIndicator: true,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  defaultTimedEventDuration: '00:30',
  slotMinTime: '07:00:00',
  slotMaxTime: '21:00:00',
  scrollTime: '08:00:00',
  allDaySlot: false,
  expandRows: true,
  noEventsText: t('calendar.noEvents'),
  listDaySideFormat: false,
}))

onMounted(async () => {
  if (!isAgent.value) await usersStore.fetchList({ role: 'agent', per_page: 100 })
})
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900 flex items-center gap-2.5">
          {{ t('nav.calendar') }}
          <Loader2 v-if="loading" class="w-4 h-4 text-gray-400 animate-spin" />
        </h1>
        <p class="text-[13px] text-gray-500 mt-0.5 first-letter:uppercase">{{ rangeTitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="flex items-center gap-1">
          <button
            type="button"
            :aria-label="t('calendar.previous')"
            class="w-8.5 h-8.5 rounded-lg border border-gray-300 bg-white text-gray-600 flex items-center justify-center hover:bg-gray-50"
            @click="go('prev')"
          ><ChevronLeft class="w-4 h-4" /></button>
          <button
            type="button"
            class="h-8.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
            @click="go('today')"
          >{{ t('calendar.today') }}</button>
          <button
            type="button"
            :aria-label="t('calendar.next')"
            class="w-8.5 h-8.5 rounded-lg border border-gray-300 bg-white text-gray-600 flex items-center justify-center hover:bg-gray-50"
            @click="go('next')"
          ><ChevronRight class="w-4 h-4" /></button>
        </div>
        <div role="group" :aria-label="t('calendar.view')" class="flex gap-0.5 p-[3px] bg-gray-200 rounded-[9px]">
          <button
            v-for="v in VIEWS"
            :key="v.key"
            type="button"
            :aria-pressed="currentView === v.key"
            :class="[
              'h-7 px-3 rounded-[7px] text-[13px] transition-colors',
              currentView === v.key ? 'bg-white text-gray-900 font-medium shadow-[0_1px_2px_rgba(17,24,39,0.08)]' : 'text-gray-600 hover:text-gray-900',
            ]"
            @click="changeView(v.key)"
          >{{ t('calendar.views.' + v.label) }}</button>
        </div>
        <AppFilterChip v-if="!isAgent" v-model="filterAgentId" :label="t('calendar.agent')" :options="agentOptions" />
        <AppFilterChip v-model="filterStatus" :label="t('calendar.status')" :options="statusOptions" :searchable="false" />
        <AppSearchInput v-model="filterSearch" :placeholder="t('calendar.searchPlaceholder')" class="w-full sm:w-56" />
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-5 items-start">

      <!-- Calendar -->
      <section class="flex-1 min-w-0 w-full bg-white border border-gray-200 rounded-xl overflow-hidden crm-calendar">
        <FullCalendar ref="calendarRef" :options="calendarOptions" />
      </section>

      <!-- Side panel -->
      <aside class="w-full xl:w-[300px] shrink-0 flex flex-col gap-4 xl:sticky xl:top-0">
        <section v-if="selectedApt" class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <AppointmentStatusBadge :status="selectedApt.status" />
            <button
              type="button"
              :aria-label="t('calendar.close')"
              class="w-7 h-7 rounded-md text-gray-500 flex items-center justify-center hover:bg-gray-100"
              @click="clearSelection"
            ><X class="w-3.5 h-3.5" /></button>
          </div>
          <div>
            <RouterLink
              v-if="selectedApt.lead?.id"
              :to="{ name: 'leads.detail', params: { id: selectedApt.lead.id } }"
              class="font-display text-lg font-semibold text-gray-900 hover:text-primary"
            >{{ leadName(selectedApt) }}</RouterLink>
            <p v-else class="font-display text-lg font-semibold text-gray-900">{{ leadName(selectedApt) }}</p>
            <p class="text-[13px] text-gray-600 mt-0.5">{{ selectedWhen }}</p>
          </div>
          <dl class="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div v-if="selectedApt.lead?.status" class="min-w-0 col-span-2">
              <dt class="text-xs text-gray-500">{{ t('calendar.leadStatus') }}</dt>
              <dd class="mt-1"><LeadStatusBadge :status="selectedApt.lead.status" /></dd>
            </div>
            <div v-if="selectedApt.lead?.insurance_type" class="min-w-0">
              <dt class="text-xs text-gray-500">{{ t('calendar.insurance') }}</dt>
              <dd class="mt-0.5 text-[13px] text-gray-900 truncate">{{ t('insuranceTypesShort.' + selectedApt.lead.insurance_type, selectedApt.lead.insurance_type) }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-gray-500">{{ t('calendar.agent') }}</dt>
              <dd class="mt-0.5 text-[13px] text-gray-900 flex items-center gap-1.5 min-w-0">
                <template v-if="selectedApt.agent">
                  <AppAvatar :name="selectedApt.agent.name" size="xs" />
                  <span class="truncate">{{ selectedApt.agent.name }}</span>
                </template>
                <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
              </dd>
            </div>
            <div v-if="selectedApt.lead?.phone" class="min-w-0 col-span-2">
              <dt class="text-xs text-gray-500">{{ t('calendar.phone') }}</dt>
              <dd class="mt-0.5">
                <a :href="`tel:${selectedApt.lead.phone}`" class="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-gray-900 hover:text-primary">
                  <Phone class="w-3.5 h-3.5" />{{ selectedApt.lead.phone }}
                </a>
              </dd>
            </div>
          </dl>
          <p
            v-if="selectedApt.notes"
            class="text-[13px] leading-[19px] text-gray-900 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words"
          >{{ selectedApt.notes }}</p>

          <div v-if="canUpdate && selectedApt.status === 'PLANIFIE'" class="flex gap-2">
            <button
              type="button"
              :disabled="actionBusy"
              class="flex-1 h-8.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
              @click="setStatus('REALISE')"
            >{{ t('calendar.markDone') }}</button>
            <button
              type="button"
              :disabled="actionBusy"
              class="h-8.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              @click="showReschedule = true"
            >{{ t('calendar.reschedule') }}</button>
          </div>
          <div class="flex items-center gap-3 pt-1 border-t border-gray-100 text-[13px]">
            <RouterLink :to="{ name: 'appointments.detail', params: { id: selectedApt.id } }" class="font-medium text-primary hover:text-primary-hover">
              {{ t('calendar.viewDetails') }}
            </RouterLink>
            <RouterLink v-if="canUpdate" :to="{ name: 'appointments.edit', params: { id: selectedApt.id } }" class="text-gray-600 hover:text-gray-900">
              {{ t('common.edit') }}
            </RouterLink>
            <button
              v-if="canUpdate && selectedApt.status === 'PLANIFIE'"
              type="button"
              :disabled="actionBusy"
              class="ml-auto text-danger-text hover:underline disabled:opacity-50"
              @click="setStatus('ANNULE')"
            >{{ t('calendar.cancelApt') }}</button>
          </div>
        </section>

        <p v-else class="bg-white border border-dashed border-gray-300 rounded-xl px-4.5 py-4 text-[13px] text-gray-500">
          {{ t('calendar.selectHint') }}
        </p>

        <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-2.5">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('calendar.legend') }}</h2>
          <div class="flex flex-col gap-2 text-[13px]">
            <div v-for="(style, key) in STATUS_STYLE" :key="key" class="flex items-center gap-2.5">
              <span class="w-3.5 h-3.5 rounded" :style="{ backgroundColor: style.bg }" />
              <span :class="key === 'ANNULE' ? 'line-through' : ''">{{ t('statuses.appointment.' + key) }}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <AppointmentRescheduleModal
      :open="showReschedule"
      :current-date="selectedApt?.scheduled_at ?? ''"
      :loading="actionBusy"
      @close="showReschedule = false"
      @reschedule="onReschedule"
    />
  </div>
</template>

<style>
/* FullCalendar, restyled to the CRM design system */
.crm-calendar .fc {
  --fc-border-color: #f3f4f6;
  --fc-today-bg-color: rgba(238, 242, 255, 0.55);
  --fc-neutral-bg-color: #f9fafb;
  --fc-list-event-hover-bg-color: #f9fafb;
  --fc-page-bg-color: #ffffff;
  --fc-highlight-color: rgba(99, 102, 241, 0.1);
  --fc-now-indicator-color: #dc2626;
  font-family: inherit;
  font-size: 13px;
}
.crm-calendar .fc-theme-standard .fc-scrollgrid { border: 0; }
.crm-calendar .fc .fc-col-header-cell {
  padding: 8px 0;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  border-bottom-color: #e5e7eb;
}
.crm-calendar .fc .fc-col-header-cell-cushion { color: inherit; text-decoration: none; }
.crm-calendar .fc .fc-day-today .fc-col-header-cell-cushion {
  color: #4f46e5;
  font-weight: 600;
}
.crm-calendar .fc .fc-timegrid-slot { height: 2.75rem; }
.crm-calendar .fc .fc-timegrid-slot-minor { border-top-style: none; }
.crm-calendar .fc .fc-timegrid-slot-label-cushion {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #6b7280;
}
.crm-calendar .fc .fc-daygrid-day-number {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 12.5px;
  color: #374151;
  padding: 6px 8px;
  text-decoration: none;
}
.crm-calendar .fc .fc-day-today .fc-daygrid-day-number {
  background: #4f46e5;
  color: #fff;
  border-radius: 9999px;
  min-width: 1.6rem;
  height: 1.6rem;
  margin: 4px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.crm-calendar .fc .fc-day-sat,
.crm-calendar .fc .fc-day-sun { background-color: #fafafa; }

/* Events: tinted blocks, dark text */
.crm-calendar .fc .fc-event {
  border-radius: 6px;
  border: 0;
  cursor: pointer;
  padding: 2px 6px;
  box-shadow: none;
}
.crm-calendar .fc .fc-event:hover { filter: brightness(0.97); }
.crm-calendar .fc .fc-event.apt-selected { box-shadow: 0 0 0 2px #4f46e5; }
.crm-calendar .fc .apt-content { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.crm-calendar .fc-daygrid-event .apt-content { flex-direction: row; gap: 6px; }
.crm-calendar .fc .apt-time { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; font-weight: 500; }
.crm-calendar .fc .apt-name { font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crm-calendar .fc .apt-ANNULE .apt-name { text-decoration: line-through; }
.crm-calendar .fc .fc-more-link { font-size: 12px; font-weight: 500; color: #4f46e5; }

/* List view */
.crm-calendar .fc .fc-list { border: 0; }
.crm-calendar .fc .fc-list-day-cushion { background: #f9fafb; font-size: 12.5px; font-weight: 600; color: #374151; }
.crm-calendar .fc .fc-list-event-time { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; color: #4b5563; }
.crm-calendar .fc .fc-list-event-title { color: #111827; }
.crm-calendar .fc .fc-list-event-title a { color: inherit; text-decoration: none; }
.crm-calendar .fc .fc-list-event.apt-selected td { background: #eef2ff; }

.crm-calendar .fc .fc-popover {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.12);
}
.crm-calendar .fc .fc-popover-header { background: #f9fafb; font-size: 12.5px; font-weight: 600; border-radius: 10px 10px 0 0; }
</style>
