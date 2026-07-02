<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Edit2, Trash2, UserPlus, Plus, Calendar, Pencil } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import LeadStatusDropdown from '@/components/modules/leads/LeadStatusDropdown.vue'
import LeadAssignModal from '@/components/modules/leads/LeadAssignModal.vue'
import LeadNotesFeed from '@/components/modules/leads/LeadNotesFeed.vue'
import LeadTimeline from '@/components/modules/leads/LeadTimeline.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import RevenueCard from '@/components/modules/payments/RevenueCard.vue'
import RevenuePromptModal from '@/components/modules/payments/RevenuePromptModal.vue'
import PaymentForm from '@/components/modules/payments/PaymentForm.vue'
import PaymentList from '@/components/modules/payments/PaymentList.vue'
import DossierTab from '@/components/modules/documents/DossierTab.vue'
import DocumentPreviewModal from '@/components/modules/documents/DocumentPreviewModal.vue'
import { documentsApi } from '@/api/documents'
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
const showRevenuePrompt = ref(false)
const pendingStatus = ref(null)
const showPaymentForm = ref(false)
const paymentFormRef = ref(null)
const updatingClientType = ref(false)
const previewDoc = ref(null)
const previewBlobUrl = ref(null)
const previewLoading = ref(false)

const leadFullName = computed(() => {
  const c = leadsStore.current
  if (!c) return ''
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
})

const isValidated = computed(() => leadsStore.current?.status === 'VALIDE')

const TABS = computed(() => {
  const tabs = [
    { key: 'notes',        label: t('leads.history.notes') },
    { key: 'history',      label: t('leads.history.history') },
    { key: 'appointments', label: t('nav.appointments') },
  ]
  if (isValidated.value) {
    tabs.push({ key: 'payments', label: t('payments.title') })
  }
  tabs.push({ key: 'dossier', label: t('leads.history.dossier') })
  tabs.push({ key: 'info', label: t('leads.history.details') })
  return tabs
})

onMounted(async () => {
  try {
    await leadsStore.fetchOne(id)
    await leadsStore.fetchNotes(id)
  } catch {
    router.replace({ name: 'leads' })
  }
})

function onStatusChange(status) {
  if (status === 'VALIDE' && leadsStore.current?.status !== 'VALIDE') {
    pendingStatus.value = status
    showRevenuePrompt.value = true
    return
  }
  doStatusChange({ status })
}

async function onRevenueConfirm(expectedRevenue) {
  await doStatusChange({ status: pendingStatus.value, expected_revenue: expectedRevenue })
  showRevenuePrompt.value = false
  pendingStatus.value = null
  onTabChange('payments')
}

async function doStatusChange(payload) {
  statusChanging.value = true
  try {
    await leadsStore.updateStatus(id, payload)
    toast.showSuccess(t('leads.statusUpdated'))
  } catch (e) {
    toast.showError(e?.message ?? 'Échec de la mise à jour du statut')
  } finally {
    statusChanging.value = false
  }
}

async function onAssign(assignedTo, agent) {
  try {
    await leadsStore.assign(id, assignedTo)
    if (agent && leadsStore.current) {
      leadsStore.current.assigned_agent = {
        id: agent.id,
        name: agent.name,
        email: agent.email,
      }
    }
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
  if (tab === 'payments') {
    await leadsStore.fetchPayments(id)
  }
  if (tab === 'dossier') {
    await leadsStore.fetchDossier(id)
  }
}

async function onPaymentSubmit(payload) {
  try {
    await leadsStore.addPayment(id, payload)
    toast.showSuccess('Paiement enregistré avec succès')
    showPaymentForm.value = false
  } catch (e) {
    if (e?.errors) {
      paymentFormRef.value?.setServerErrors(e.errors)
    } else {
      toast.showError(e?.message ?? 'Échec de l\'enregistrement du paiement')
    }
  }
}

async function onPaymentDelete(payment) {
  try {
    await leadsStore.removePayment(id, payment.id)
    toast.showSuccess('Paiement supprimé avec succès')
  } catch (e) {
    toast.showError(e?.message ?? 'Échec de la suppression du paiement')
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

async function onDossierUpload(formData) {
  try {
    await leadsStore.uploadDocument(id, formData)
    toast.showSuccess('Document téléversé avec succès')
  } catch (e) {
    toast.showError(e?.message ?? 'Échec du téléversement')
  }
}

async function onDossierDelete(document) {
  try {
    await leadsStore.removeDocument(id, document.id)
    toast.showSuccess('Document supprimé avec succès')
  } catch (e) {
    toast.showError(e?.message ?? 'Échec de la suppression')
  }
}

async function onDossierDownload(document) {
  try {
    await leadsStore.downloadDocument(id, document.id, document.original_filename)
  } catch (e) {
    toast.showError(e?.message ?? 'Échec du téléchargement')
  }
}

async function onSetClientType(clientType) {
  updatingClientType.value = true
  try {
    await leadsStore.setClientType(id, clientType)
    await leadsStore.fetchDossier(id)
    toast.showSuccess(t('documents.clientTypeUpdated'))
  } catch (e) {
    toast.showError(e?.message ?? 'Échec de la mise à jour')
  } finally {
    updatingClientType.value = false
  }
}

async function onDossierPreview(doc) {
  previewDoc.value = { ...doc.document, type_label: doc.type_label }
  previewBlobUrl.value = null
  previewLoading.value = true
  try {
    const response = await documentsApi.download(id, doc.document.id)
    previewBlobUrl.value = URL.createObjectURL(new Blob([response.data], { type: doc.document.mime_type }))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to load preview')
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  if (previewBlobUrl.value) {
    URL.revokeObjectURL(previewBlobUrl.value)
  }
  previewDoc.value = null
  previewBlobUrl.value = null
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
                {{ t('insuranceTypes.' + leadsStore.current.insurance_type, leadsStore.current.insurance_type) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <AppButton
            v-if="!auth.hasRole('agent')"
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

    <!-- Revenue card -->
    <RevenueCard
      v-if="leadsStore.current && isValidated"
      :expected-revenue="leadsStore.current.expected_revenue"
      :total-received="leadsStore.current.total_received"
      :remaining-amount="leadsStore.current.remaining_amount"
      :payment-status="leadsStore.current.payment_status"
    />

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
                <button
                  v-if="auth.can('APPOINTMENTS_UPDATE')"
                  :title="t('common.edit')"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
                  @click="router.push({ name: 'appointments.edit', params: { id: apt.id } })"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="auth.can('APPOINTMENTS_DELETE')"
                  :title="t('common.delete')"
                  :disabled="aptActionId === apt.id"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
                  @click="onAptDelete(apt)"
                >
                  <AppSpinner v-if="aptActionId === apt.id" :size="14" />
                  <Trash2 v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Payments -->
        <div v-else-if="activeTab === 'payments'">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-gray-500">
              {{ leadsStore.payments.length }} paiement(s)
            </p>
            <AppButton
              v-if="auth.can('PAYMENTS_CREATE') && leadsStore.current?.payment_status !== 'PAYE'"
              size="sm"
              @click="showPaymentForm = true"
            >
              <template #icon><Plus class="w-4 h-4" /></template>
              Ajouter un paiement
            </AppButton>
          </div>

          <PaymentList
            :payments="leadsStore.payments"
            :loading="leadsStore.loading.payments"
            @delete="onPaymentDelete"
          />
        </div>

        <!-- Dossier -->
        <DossierTab
          v-else-if="activeTab === 'dossier'"
          :dossier="leadsStore.dossier"
          :lead-id="id"
          :loading="leadsStore.loading.dossier"
          :updating-client-type="updatingClientType"
          @upload="onDossierUpload"
          @delete="onDossierDelete"
          @download="onDossierDownload"
          @preview="onDossierPreview"
          @set-client-type="onSetClientType"
        />

        <!-- Details -->
        <div v-else-if="activeTab === 'info'" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('leads.source') }}</p>
            <p class="text-sm text-gray-900">{{ leadsStore.current.lead_source?.name ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('leads.insuranceType') }}</p>
            <p class="text-sm text-gray-900">
              {{ leadsStore.current.insurance_type ? t('insuranceTypes.' + leadsStore.current.insurance_type, leadsStore.current.insurance_type) : '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Type de client</p>
            <p class="text-sm text-gray-900">
              {{ leadsStore.current.client_type ? t('clientTypes.' + leadsStore.current.client_type, leadsStore.current.client_type) : '—' }}
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

    <!-- Revenue prompt modal (shown when transitioning to VALIDE) -->
    <RevenuePromptModal
      :open="showRevenuePrompt"
      :loading="statusChanging"
      @close="showRevenuePrompt = false; pendingStatus = null"
      @confirm="onRevenueConfirm"
    />

    <!-- Payment form modal -->
    <PaymentForm
      ref="paymentFormRef"
      :open="showPaymentForm"
      :remaining-amount="leadsStore.current?.remaining_amount ?? 0"
      :loading="leadsStore.loading.payments"
      @close="showPaymentForm = false"
      @submit="onPaymentSubmit"
    />

    <!-- Document preview modal -->
    <DocumentPreviewModal
      :open="!!previewDoc"
      :document="previewDoc"
      :blob-url="previewBlobUrl"
      :loading="previewLoading"
      @close="closePreview"
      @download="onDossierDownload(previewDoc); closePreview()"
    />
  </div>
</template>
