<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Edit2, Trash2, Clock, Calendar } from 'lucide-vue-next'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import AppointmentRescheduleModal from '@/components/modules/appointments/AppointmentRescheduleModal.vue'
import AppointmentRemindersPanel from '@/components/modules/appointments/AppointmentRemindersPanel.vue'
import { formatDateTime } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const store = useAppointmentsStore()
const ui = useUiStore()
const toast = useToast()

const id = route.params.id
const showReschedule = ref(false)
const activeTab = ref('reminders')

const leadFullName = computed(() => {
  const lead = store.current?.lead
  if (!lead) return 'Appointment'
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Appointment'
})

const TABS = [
  { key: 'reminders', label: 'Reminders' },
  { key: 'info', label: 'Details' },
]

onMounted(async () => {
  try {
    await store.fetchOne(id)
    await store.fetchReminders(id)
  } catch {
    router.replace({ name: 'appointments' })
  }
})

async function onReschedule(scheduledAt) {
  try {
    await store.reschedule(id, scheduledAt)
    toast.showSuccess('Appointment rescheduled')
    showReschedule.value = false
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to reschedule')
  }
}

async function onAddReminder(payload) {
  try {
    await store.addReminder(id, payload)
    toast.showSuccess('Reminder added')
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to add reminder')
  }
}

async function onRemoveReminder(reminderId) {
  const ok = await ui.confirm('Remove Reminder', 'Remove this reminder?')
  if (!ok) return
  try {
    await store.removeReminder(id, reminderId)
    toast.showSuccess('Reminder removed')
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to remove reminder')
  }
}

async function handleDelete() {
  const ok = await ui.confirm('Delete Appointment', 'Delete this appointment? Cannot be undone.')
  if (!ok) return
  try {
    await store.remove(id)
    toast.showSuccess('Appointment deleted')
    router.replace({ name: 'appointments' })
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to delete')
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="router.back()">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        Back
      </AppButton>
      <AppButton
        v-if="store.current?.lead?.id"
        variant="ghost"
        size="sm"
        @click="router.push({ name: 'leads.detail', params: { id: store.current.lead.id } })"
      >
        View Lead
      </AppButton>
    </div>

    <!-- Loading -->
    <AppCard v-if="store.loading.detail">
      <div class="space-y-3">
        <AppSkeleton height="24px" width="40%" />
        <AppSkeleton height="16px" width="60%" />
        <AppSkeleton height="16px" width="30%" />
      </div>
    </AppCard>

    <!-- Header card -->
    <AppCard v-else-if="store.current">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center shrink-0">
            <Calendar class="w-6 h-6 text-primary" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl font-semibold text-gray-900">{{ leadFullName }}</h1>
              <AppointmentStatusBadge :status="store.current.status" dot />
            </div>
            <div class="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
              <Clock class="w-4 h-4" />
              <span>{{ formatDateTime(store.current.scheduled_at) }}</span>
            </div>
            <div v-if="store.current.agent" class="flex items-center gap-1.5 mt-1.5">
              <AppAvatar :name="store.current.agent.name" size="xs" />
              <span class="text-sm text-gray-600">{{ store.current.agent.name }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <AppButton variant="ghost" size="sm" @click="showReschedule = true">
            <template #icon><Clock class="w-4 h-4" /></template>
            Reschedule
          </AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'appointments.edit', params: { id } })"
          >
            <template #icon><Edit2 class="w-4 h-4" /></template>
            Edit
          </AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            class="!text-danger"
            @click="handleDelete"
          >
            <template #icon><Trash2 class="w-4 h-4" /></template>
          </AppButton>
        </div>
      </div>

      <div v-if="store.current.notes" class="mt-4 pt-4 border-t border-gray-100">
        <p class="text-xs text-gray-400 mb-1">Notes</p>
        <p class="text-sm text-gray-700">{{ store.current.notes }}</p>
      </div>
    </AppCard>

    <!-- Tabs -->
    <AppCard v-if="store.current" padding="none">
      <div class="border-b border-gray-100 px-5">
        <div class="flex gap-0">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            :class="[
              'px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="p-5">
        <AppointmentRemindersPanel
          v-if="activeTab === 'reminders'"
          :reminders="store.reminders"
          :loading="store.loading.reminders"
          :submitting="store.loading.action"
          @add="onAddReminder"
          @remove="onRemoveReminder"
        />

        <div v-else-if="activeTab === 'info'" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Lead</p>
            <p class="text-sm text-gray-900">{{ leadFullName !== 'Appointment' ? leadFullName : '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Phone</p>
            <p class="text-sm text-gray-900">{{ store.current.lead?.phone ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Insurance Type</p>
            <p class="text-sm text-gray-900">{{ store.current.insurance_type?.replace(/_/g, ' ') ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Created At</p>
            <p class="text-sm text-gray-900">{{ formatDateTime(store.current.created_at) }}</p>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Reschedule modal -->
    <AppointmentRescheduleModal
      :open="showReschedule"
      :current-date="store.current?.scheduled_at ?? ''"
      :loading="store.loading.action"
      @close="showReschedule = false"
      @reschedule="onReschedule"
    />
  </div>
</template>
