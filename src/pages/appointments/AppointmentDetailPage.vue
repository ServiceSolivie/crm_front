<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Clock, Pencil, Trash2, Phone, Check, X } from 'lucide-vue-next'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import AppointmentRescheduleModal from '@/components/modules/appointments/AppointmentRescheduleModal.vue'
import AppointmentRemindersPanel from '@/components/modules/appointments/AppointmentRemindersPanel.vue'
import { formatDateTime } from '@/utils/formatters'
import { firstErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const store = useAppointmentsStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()

const id = route.params.id
const showReschedule = ref(false)
const busy = ref(false)

const canUpdate = computed(() => auth.can('APPOINTMENTS_UPDATE'))
// Only this appointment, never another one still in the store
const apt = computed(() => (store.current && String(store.current.id) === String(id) ? store.current : null))

const leadName = computed(() => {
  const lead = apt.value?.lead
  return [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || lead?.reference || t('appointments.title')
})

const whenLabel = computed(() => {
  if (!apt.value?.scheduled_at) return ''
  const d = new Date(apt.value.scheduled_at)
  const loc = locale.value === 'fr' ? 'fr-FR' : 'en-GB'
  const day = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`
})

const isOverdue = computed(() =>
  apt.value?.status === 'PLANIFIE' && new Date(apt.value.scheduled_at) < new Date(),
)

onMounted(async () => {
  try {
    await store.fetchOne(id)
    await store.fetchReminders(id)
  } catch {
    router.replace({ name: 'appointments' })
  }
})

async function setStatus(status) {
  busy.value = true
  try {
    await store.updateStatus(id, status)
    toast.showSuccess(t('appointments.statusUpdated'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('calendar.updateError')))
  } finally {
    busy.value = false
  }
}

async function onReschedule(scheduledAt) {
  try {
    await store.reschedule(id, scheduledAt)
    toast.showSuccess(t('appointments.rescheduled'))
    showReschedule.value = false
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('calendar.updateError')))
  }
}

async function onAddReminder(payload) {
  try {
    await store.addReminder(id, payload)
    toast.showSuccess(t('reminders.added'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('reminders.addError')))
  }
}

async function onRemoveReminder(reminderId) {
  const ok = await ui.confirm(t('reminders.removeTitle'), t('reminders.removeConfirm'), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.removeReminder(id, reminderId)
    toast.showSuccess(t('reminders.removed'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('reminders.removeError')))
  }
}

async function handleDelete() {
  const ok = await ui.confirm(t('appointments.deleteTitle'), t('appointments.deleteConfirm'), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.remove(id)
    toast.showSuccess(t('appointments.deleteSuccess'))
    router.replace({ name: 'appointments' })
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.appointmentDelete')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1100px] mx-auto">
    <AppPageHeader
      :title="apt ? leadName : '…'"
      :breadcrumb="[{ label: t('appointments.title'), to: '/appointments' }, { label: apt ? leadName : '…' }]"
    >
      <template #meta>
        <div v-if="apt" class="flex flex-wrap items-center gap-2.5 mt-1.5">
          <AppointmentStatusBadge :status="apt.status" dot />
          <span :class="['text-[13px]', isOverdue ? 'text-danger-text font-medium' : 'text-gray-600']">{{ whenLabel }}</span>
          <span v-if="isOverdue" class="text-[11px] font-semibold uppercase text-danger-text">{{ t('appointments.overdue') }}</span>
        </div>
      </template>
      <template v-if="apt && canUpdate" #actions>
        <button
          v-if="apt.status === 'PLANIFIE'"
          type="button"
          :disabled="busy"
          class="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
          @click="setStatus('REALISE')"
        ><Check class="w-4 h-4" />{{ t('calendar.markDone') }}</button>
        <button
          type="button"
          class="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
          @click="showReschedule = true"
        ><Clock class="w-4 h-4" />{{ t('calendar.reschedule') }}</button>
        <RouterLink
          :to="{ name: 'appointments.edit', params: { id } }"
          class="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
        ><Pencil class="w-4 h-4" />{{ t('common.edit') }}</RouterLink>
        <button
          v-if="apt.status === 'PLANIFIE'"
          type="button"
          :disabled="busy"
          class="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-danger-text hover:bg-danger-bg/40 disabled:opacity-50"
          @click="setStatus('ANNULE')"
        ><X class="w-4 h-4" />{{ t('calendar.cancelApt') }}</button>
        <button
          v-if="auth.can('APPOINTMENTS_DELETE')"
          type="button"
          :aria-label="t('common.delete')"
          class="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-500 flex items-center justify-center hover:text-danger-text hover:bg-danger-bg/40"
          @click="handleDelete"
        ><Trash2 class="w-4 h-4" /></button>
      </template>
    </AppPageHeader>

    <div v-if="!apt" class="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <AppSkeleton height="18px" width="40%" /><AppSkeleton height="14px" width="60%" /><AppSkeleton height="14px" width="30%" />
    </div>

    <div v-else class="flex flex-col lg:flex-row gap-5 items-start">
      <div class="flex-1 min-w-0 w-full flex flex-col gap-4">
        <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5 flex flex-col gap-3.5">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('appointments.details') }}</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            <div>
              <dt class="text-xs text-gray-500">{{ t('appointments.dateTime') }}</dt>
              <dd class="mt-0.5 font-mono text-[12.5px] text-gray-900">{{ formatDateTime(apt.scheduled_at) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">{{ t('appointments.agent') }}</dt>
              <dd class="mt-0.5 text-[13px] text-gray-900 flex items-center gap-1.5">
                <template v-if="apt.agent"><AppAvatar :name="apt.agent.name" size="xs" />{{ apt.agent.name }}</template>
                <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
              </dd>
            </div>
            <div v-if="apt.location">
              <dt class="text-xs text-gray-500">{{ t('appointments.location') }}</dt>
              <dd class="mt-0.5 text-[13px] text-gray-900">{{ apt.location }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">{{ t('appointments.createdBy') }}</dt>
              <dd class="mt-0.5 text-[13px] text-gray-900">
                {{ apt.created_by?.name ?? '—' }} · <span class="font-mono text-[12.5px]">{{ formatDateTime(apt.created_at) }}</span>
              </dd>
            </div>
          </dl>
          <div v-if="apt.notes" class="pt-3 border-t border-gray-100">
            <p class="text-xs text-gray-500 mb-1">{{ t('appointments.notes') }}</p>
            <p class="text-[13px] leading-[19px] text-gray-900 whitespace-pre-wrap break-words">{{ apt.notes }}</p>
          </div>
        </section>

        <AppointmentRemindersPanel
          :reminders="store.reminders"
          :loading="store.loading.reminders"
          :submitting="store.loading.action"
          :can-edit="canUpdate"
          @add="onAddReminder"
          @remove="onRemoveReminder"
        />
      </div>

      <!-- Lead -->
      <aside v-if="apt.lead" class="w-full lg:w-[320px] shrink-0">
        <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-3">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('appointments.lead') }}</h2>
          <RouterLink :to="{ name: 'leads.detail', params: { id: apt.lead.id } }" class="flex items-center gap-2.5 min-w-0 hover:text-primary">
            <AppAvatar :name="leadName" size="md" tone="soft" />
            <span class="min-w-0">
              <span class="block text-[14px] font-medium truncate">{{ leadName }}</span>
              <span v-if="apt.lead.reference" class="block font-mono text-xs text-gray-500">{{ apt.lead.reference }}</span>
            </span>
          </RouterLink>
          <dl class="flex flex-col gap-2.5">
            <div v-if="apt.lead.phone">
              <dt class="text-xs text-gray-500">{{ t('leads.phone') }}</dt>
              <dd class="mt-0.5">
                <a :href="`tel:${apt.lead.phone}`" class="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-gray-900 hover:text-primary">
                  <Phone class="w-3.5 h-3.5" />{{ apt.lead.phone }}
                </a>
              </dd>
            </div>
            <div v-if="apt.lead.insurance_type">
              <dt class="text-xs text-gray-500">{{ t('leads.filterInsurance') }}</dt>
              <dd class="mt-0.5 text-[13px] text-gray-900">{{ t('insuranceTypes.' + apt.lead.insurance_type, apt.lead.insurance_type) }}</dd>
            </div>
          </dl>
          <RouterLink
            :to="{ name: 'leads.detail', params: { id: apt.lead.id } }"
            class="h-8 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50 flex items-center justify-center"
          >{{ t('calendar.viewLead') }}</RouterLink>
        </section>
      </aside>
    </div>

    <AppointmentRescheduleModal
      :open="showReschedule"
      :current-date="apt?.scheduled_at ?? ''"
      :loading="store.loading.action"
      @close="showReschedule = false"
      @reschedule="onReschedule"
    />
  </div>
</template>
