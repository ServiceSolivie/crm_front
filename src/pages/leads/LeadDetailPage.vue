<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Edit2, Trash2, UserPlus, Plus, Calendar } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import LeadStatusDropdown from '@/components/modules/leads/LeadStatusDropdown.vue'
import LeadAssignModal from '@/components/modules/leads/LeadAssignModal.vue'
import LeadNotesFeed from '@/components/modules/leads/LeadNotesFeed.vue'
import LeadTimeline from '@/components/modules/leads/LeadTimeline.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import { INSURANCE_TYPE } from '@/utils/enums'
import { formatDate, formatDateTime } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const leadsStore = useLeadsStore()
const appointmentsStore = useAppointmentsStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()

const id = route.params.id
const activeTab = ref('notes')
const showAssignModal = ref(false)
const statusChanging = ref(false)
const noteSubmitting = ref(false)
const aptActionId = ref(null)

const leadFullName = computed(() => {
  const c = leadsStore.current
  if (!c) return ''
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
})

const TABS = computed(() => [
  { key: 'notes',        label: t('leads.history.notes') },
  { key: 'history',      label: t('leads.history.history') },
  { key: 'appointments', label: t('nav.appointments') },
  { key: 'info',         label: t('leads.history.details') },
])

onMounted(async () => {
  try {
    await leadsStore.fetchOne(id)
    await leadsStore.fetchNotes(id)
  } catch {
    router.replace({ name: 'leads' })
  }
})

async function onStatusChange(status) {
  statusChanging.value = true
  try {
    await leadsStore.updateStatus(id, status)
    toast.showSuccess(t('leads.statusUpdated'))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to update status')
  } finally {
    statusChanging.value = false
  }
}

async function onAssign(assignedTo) {
  try {
    await leadsStore.assign(id, assignedTo)
    toast.showSuccess(t('leads.assignSuccess'))
    showAssignModal.value = false
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to assign lead')
  }
}

async function onAddNote(note) {
  noteSubmitting.value = true
  try {
    await leadsStore.addNote(id, note)
    toast.showSuccess(t('leads.noteAdded'))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to add note')
  } finally {
    noteSubmitting.value = false
  }
}

async function onTabChange(tab) {
  activeTab.value = tab
  if (tab === 'history' && leadsStore.statusHistory.length === 0) {
    await Promise.all([
      leadsStore.fetchStatusHistory(id),
      leadsStore.fetchAssignmentHistory(id),
    ])
  }
  if (tab === 'appointments') {
    await leadsStore.fetchLeadAppointments(id)
  }
}

async function onAptDelete(apt) {
  const ok = await ui.confirm(t('appointments.deleteTitle'), t('appointments.deleteConfirm'))
  if (!ok) return
  aptActionId.value = apt.id
  try {
    await appointmentsStore.remove(apt.id)
    leadsStore.leadAppointments = leadsStore.leadAppointments.filter((a) => a.id !== apt.id)
    toast.showSuccess(t('appointments.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to delete appointment')
  } finally {
    aptActionId.value = null
  }
}

async function handleDelete() {
  const ok = await ui.confirm(t('leads.deleteTitle'), `${t('leads.deleteConfirm')}`)
  if (!ok) return
  try {
    await leadsStore.remove(id)
    toast.showSuccess(t('leads.deleteSuccess'))
    router.replace({ name: 'leads' })
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to delete lead')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-5">
    <!-- Header -->
    <div class="flex items-start gap-3">
      <AppButton variant="ghost" size="sm" @click="router.back()">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        {{ t('common.back') }}
      </AppButton>
    </div>

    <!-- Loading state -->
    <AppCard v-if="leadsStore.loading.detail">
      <div class="flex items-start gap-4">
        <AppSkeleton width="48px" height="48px" class="rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <AppSkeleton height="20px" width="40%" />
          <AppSkeleton height="14px" width="25%" />
        </div>
      </div>
    </AppCard>

    <!-- Lead header card -->
    <AppCard v-else-if="leadsStore.current">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-start gap-4">
          <AppAvatar :name="leadFullName" size="lg" />
          <div>
            <h1 class="text-xl font-semibold text-gray-900">{{ leadFullName }}</h1>
            <p v-if="leadsStore.current.email" class="text-sm text-gray-500 mt-0.5">
              {{ leadsStore.current.email }}
            </p>
            <p v-if="leadsStore.current.phone" class="text-sm text-gray-500">
              {{ leadsStore.current.phone }}
            </p>
            <div class="flex items-center gap-3 mt-2">
              <LeadStatusDropdown
                :status="leadsStore.current.status"
                :loading="statusChanging"
                @change="onStatusChange"
              />
              <span v-if="leadsStore.current.insurance_type" class="text-xs text-gray-500 font-medium">
                {{ INSURANCE_TYPE[leadsStore.current.insurance_type]?.label ?? leadsStore.current.insurance_type }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <AppButton
            variant="ghost"
            size="sm"
            @click="showAssignModal = true"
          >
            <template #icon><UserPlus class="w-4 h-4" /></template>
            {{ t('leads.assign') }}
          </AppButton>
          <AppButton
            v-if="auth.can('LEADS_UPDATE')"
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'leads.edit', params: { id } })"
          >
            <template #icon><Edit2 class="w-4 h-4" /></template>
            {{ t('common.edit') }}
          </AppButton>
          <AppButton
            v-if="auth.can('LEADS_DELETE')"
            variant="ghost"
            size="sm"
            class="!text-danger"
            @click="handleDelete"
          >
            <template #icon><Trash2 class="w-4 h-4" /></template>
          </AppButton>
        </div>
      </div>

      <!-- Assignment strip -->
      <div v-if="leadsStore.current.assigned_agent" class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
        <span class="text-xs text-gray-400">{{ t('leads.assignedTo') }}</span>
        <AppAvatar :name="leadsStore.current.assigned_agent.name" size="xs" />
        <span class="text-sm font-medium text-gray-700">{{ leadsStore.current.assigned_agent.name }}</span>
        <span class="text-xs text-gray-400 ml-auto">{{ t('leads.createdAt') }} {{ formatDate(leadsStore.current.created_at) }}</span>
      </div>
    </AppCard>

    <!-- Tabs -->
    <AppCard v-if="leadsStore.current" padding="none">
      <!-- Tab bar -->
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
            @click="onTabChange(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab content -->
      <div class="p-5">
        <!-- Notes -->
        <LeadNotesFeed
          v-if="activeTab === 'notes'"
          :notes="leadsStore.notes"
          :loading="leadsStore.loading.notes"
          :submitting="noteSubmitting"
          @add-note="onAddNote"
        />

        <!-- History -->
        <LeadTimeline
          v-else-if="activeTab === 'history'"
          :status-history="leadsStore.statusHistory"
          :assignment-history="leadsStore.assignmentHistory"
          :loading="leadsStore.loading.history"
        />

        <!-- Appointments -->
        <div v-else-if="activeTab === 'appointments'">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-gray-500">
              {{ leadsStore.leadAppointments.length }} {{ t('nav.appointments').toLowerCase() }}
            </p>
            <AppButton
              v-if="auth.can('APPOINTMENTS_CREATE')"
              size="sm"
              @click="router.push({ name: 'leads.appointments.create', params: { leadId: id } })"
            >
              <template #icon><Plus class="w-4 h-4" /></template>
              {{ t('appointments.scheduleNew') }}
            </AppButton>
          </div>

          <div v-if="leadsStore.loading.appointments" class="space-y-3">
            <AppSkeleton v-for="n in 3" :key="n" height="72px" class="rounded-xl" />
          </div>

          <div v-else-if="leadsStore.leadAppointments.length === 0" class="text-center py-10">
            <Calendar class="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p class="text-sm text-gray-500">{{ t('appointments.noScheduled') }}</p>
            <AppButton
              v-if="auth.can('APPOINTMENTS_CREATE')"
              variant="ghost"
              size="sm"
              class="mt-3"
              @click="router.push({ name: 'leads.appointments.create', params: { leadId: id } })"
            >
              {{ t('appointments.scheduleFirst') }}
            </AppButton>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="apt in leadsStore.leadAppointments"
              :key="apt.id"
              class="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div class="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                <Calendar class="w-4 h-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {{ formatDateTime(apt.scheduled_at) }}
                  </span>
                  <AppointmentStatusBadge :status="apt.status" dot />
                </div>
                <div v-if="apt.agent" class="flex items-center gap-1.5 mt-1">
                  <AppAvatar :name="apt.agent.name" size="xs" />
                  <span class="text-xs text-gray-500">{{ apt.agent.name }}</span>
                </div>
                <p v-if="apt.notes" class="text-xs text-gray-400 mt-1 line-clamp-2">{{ apt.notes }}</p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <AppButton
                  v-if="auth.can('APPOINTMENTS_UPDATE')"
                  variant="ghost"
                  size="sm"
                  @click="router.push({ name: 'appointments.edit', params: { id: apt.id } })"
                >
                  {{ t('common.edit') }}
                </AppButton>
                <AppButton
                  v-if="auth.can('APPOINTMENTS_DELETE')"
                  variant="ghost"
                  size="sm"
                  class="!text-danger hover:!bg-danger-bg"
                  :loading="aptActionId === apt.id"
                  @click="onAptDelete(apt)"
                >
                  {{ t('common.delete') }}
                </AppButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div v-else-if="activeTab === 'info'" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('leads.source') }}</p>
            <p class="text-sm text-gray-900">{{ leadsStore.current.lead_source?.name ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('leads.insuranceType') }}</p>
            <p class="text-sm text-gray-900">
              {{ INSURANCE_TYPE[leadsStore.current.insurance_type]?.label ?? leadsStore.current.insurance_type ?? '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('leads.createdAt') }}</p>
            <p class="text-sm text-gray-900">{{ formatDateTime(leadsStore.current.created_at) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('users.lastUpdated') }}</p>
            <p class="text-sm text-gray-900">{{ formatDateTime(leadsStore.current.updated_at) }}</p>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Assign modal -->
    <LeadAssignModal
      :open="showAssignModal"
      :current-assignee-id="leadsStore.current?.assigned_agent?.id ?? null"
      :loading="leadsStore.loading.action"
      @close="showAssignModal = false"
      @assign="onAssign"
    />
  </div>
</template>
