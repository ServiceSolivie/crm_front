<script setup>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ChevronLeft, ChevronRight, Phone, Mail, Clock, MoreHorizontal, UserPlus, PackagePlus,
  Pencil, Trash2, Flag, AlertTriangle, Check, CalendarDays, Plus, ChevronDown,
} from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useAppointmentsStore } from '@/stores/appointments.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import AppModal from '@/components/base/AppModal.vue'
import LeadStatusDropdown from '@/components/modules/leads/LeadStatusDropdown.vue'
import LeadStageStepper from '@/components/modules/leads/LeadStageStepper.vue'
import LeadComposer from '@/components/modules/leads/LeadComposer.vue'
import LeadActivityFeed from '@/components/modules/leads/LeadActivityFeed.vue'
import LeadAssignModal from '@/components/modules/leads/LeadAssignModal.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import PaymentStatusBadge from '@/components/modules/payments/PaymentStatusBadge.vue'
import DvcStatusBadge from '@/components/modules/leads/DvcStatusBadge.vue'
import RevenuePromptModal from '@/components/modules/payments/RevenuePromptModal.vue'
import RappelScheduleModal from '@/components/modules/leads/RappelScheduleModal.vue'
import PaymentForm from '@/components/modules/payments/PaymentForm.vue'
import PaymentList from '@/components/modules/payments/PaymentList.vue'
import DossierTab from '@/components/modules/documents/DossierTab.vue'
import FlagIssueModal from '@/components/modules/leads/FlagIssueModal.vue'
import CrossSellModal from '@/components/modules/leads/CrossSellModal.vue'
import DocumentPreviewModal from '@/components/modules/documents/DocumentPreviewModal.vue'
import { documentsApi } from '@/api/documents'
import { leadsApi } from '@/api/leads'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { firstErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const leadsStore = useLeadsStore()
const appointmentsStore = useAppointmentsStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()

const id = computed(() => route.params.id)
const showAssignModal = ref(false)
const statusChanging = ref(false)
const noteSubmitting = ref(false)
const callSubmitting = ref(false)
const aptActionId = ref(null)
const showRevenuePrompt = ref(false)
const showRappelModal = ref(false)
const rappelLoading = ref(false)
const pendingStatus = ref(null)
const showPaymentForm = ref(false)
const paymentFormRef = ref(null)
const updatingClientType = ref(false)
const previewDoc = ref(null)
const previewBlobUrl = ref(null)
const previewLoading = ref(false)
const showFlagIssueModal = ref(false)
const flagIssueLoading = ref(false)
const showCrossSellModal = ref(false)
const crossSellLoading = ref(false)
const showDossierModal = ref(false)
const showMoreMenu = ref(false)
const showFormDetails = ref(false)

// Only the lead this page is for (never a previously opened one still in the store)
const lead = computed(() =>
  leadsStore.current && String(leadsStore.current.id) === String(id.value) ? leadsStore.current : null,
)

const leadFullName = computed(() => {
  const c = leadsStore.current
  if (!c) return ''
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.reference
})

function humanizeKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

/**
 * The sheet's own extra/unmapped fields are stored as JSON in `comment`
 * (e.g. currently_insured, reason_change, plate — anything without a
 * dedicated Lead column). Parsed here into label/value pairs so they
 * render like every other field instead of as raw text.
 * Falls back to null (raw text) for any older, pre-JSON comment value.
 */
const sheetExtraFields = computed(() => {
  const raw = leadsStore.current?.comment
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Object.entries(parsed).map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }))
  } catch {
    return null
  }
})

// The contract total is set with the first payment (or by gestion when validating)
const hasRevenue = computed(() => leadsStore.current?.expected_revenue != null)
// Payments can be recorded before or after the DVC signature — not on lost leads
const LOST_STATUSES = ['PERDU', 'PAS_INTERESSE', 'MAUVAIS_NUMERO', 'LEAD_INVALIDE']
const canAddPayment = computed(() =>
  auth.can('PAYMENTS_CREATE') && !LOST_STATUSES.includes(leadsStore.current?.status),
)
const paymentListRef = ref(null)

const GESTION_REVIEW_STATUSES = ['GESTION', 'CALL2_OK', 'CALL2_KO', 'PDG_OK', 'PDG_KO']
const canFlagIssue = computed(() =>
  auth.hasRole('gestion') && GESTION_REVIEW_STATUSES.includes(leadsStore.current?.status),
)
const missingDossierDocuments = computed(() =>
  (leadsStore.dossier?.documents ?? []).filter((d) => d.status === 'missing'),
)

const canCrossSell = computed(() => {
  if (auth.hasRole('gestion')) return false
  const l = leadsStore.current
  if (!l) return false
  return l.assigned_agent?.id === auth.user?.id || auth.can('LEADS_VIEW_ALL') || auth.can('LEADS_VIEW_TEAM')
})
const canAssign = computed(() => auth.can('LEADS_ASSIGN'))
const isOwnLead = computed(() =>
  auth.hasRole('agent') && leadsStore.current?.assigned_agent?.id != null
  && leadsStore.current.assigned_agent.id === auth.user?.id,
)
const hasMoreActions = computed(() =>
  canAssign.value || canCrossSell.value || canFlagIssue.value || auth.can('LEADS_UPDATE') || auth.can('LEADS_DELETE'),
)

/* ── Previous / next within the list the user came from ──────
 * GET /leads/{id}/neighbours with the list's filters, so the arrows keep
 * working across list pages. Hidden when the lead was opened from elsewhere. */
const fromList = ref(leadsStore.list.some((l) => String(l.id) === String(route.params.id)))
const neighbours = ref(null)
const prevLead = computed(() => (neighbours.value?.prev_id ? { id: neighbours.value.prev_id } : null))
const nextLead = computed(() => (neighbours.value?.next_id ? { id: neighbours.value.next_id } : null))

async function loadNeighbours() {
  if (!fromList.value) return
  // eslint-disable-next-line no-unused-vars
  const { page, per_page, ...filters } = leadsStore.filters
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length : v !== '' && v !== null && v !== undefined)),
  )
  try {
    neighbours.value = (await leadsApi.neighbours(id.value, params)).data
  } catch {
    neighbours.value = null
  }
}

/* Reload the activity feed after anything that adds to it */
const activityKey = ref(0)
function refreshActivity() {
  activityKey.value++
}

/* ── Loading ───────────────────────────────────────────────── */
async function loadLead() {
  try {
    await leadsStore.fetchOne(id.value)
  } catch {
    router.replace({ name: 'leads' })
    return
  }
  loadSidePanels()
  loadNeighbours()
}

// The right-column cards (the activity feed loads itself)
async function loadSidePanels() {
  const jobs = [
    leadsStore.fetchLeadAppointments(id.value),
    leadsStore.fetchDossier(id.value),
  ]
  if (auth.can('PAYMENTS_VIEW')) jobs.push(leadsStore.fetchPayments(id.value))
  await Promise.allSettled(jobs)
}

function resetLeadData() {
  leadsStore.leadAppointments = []
  leadsStore.payments = []
  leadsStore.dossier = null
}

onMounted(() => {
  resetLeadData()
  loadLead()
})

/**
 * Vue Router reuses this component instance when navigating between two
 * leads' detail pages (same route, different :id) — onMounted does not
 * fire again, so without this watcher the page would keep showing the
 * previously-viewed lead's data.
 */
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (!newId || newId === oldId) return
    showMoreMenu.value = false
    neighbours.value = null
    resetLeadData()
    loadLead()
  },
)

/* ── Status ────────────────────────────────────────────────── */
function onStatusChange(status) {
  // Validating asks the contract total only when no payment gave it yet
  if (status === 'VALIDE' && leadsStore.current?.status !== 'VALIDE' && !hasRevenue.value) {
    pendingStatus.value = status
    showRevenuePrompt.value = true
    return
  }
  if (status === 'RAPPEL') {
    pendingStatus.value = status
    showRappelModal.value = true
    return
  }
  doStatusChange({ status })
}

async function onRappelConfirm({ scheduled_at, notes }) {
  rappelLoading.value = true
  try {
    await leadsStore.updateStatus(id.value, { status: 'RAPPEL' })
    const agentId = leadsStore.current?.assigned_agent?.id ?? leadsStore.current?.assigned_to ?? auth.user?.id
    await leadsStore.createLeadAppointment(id.value, {
      agent_id: agentId,
      scheduled_at,
      notes,
      status: 'PLANIFIE',
    })
    toast.showSuccess(t('leads.rappelModal.success'))
    showRappelModal.value = false
    pendingStatus.value = null
    await leadsStore.fetchLeadAppointments(id.value).catch(() => {})
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leads.errors.rappel')))
  } finally {
    rappelLoading.value = false
  }
}

async function onRevenueConfirm(expectedRevenue) {
  await doStatusChange({ status: pendingStatus.value, expected_revenue: expectedRevenue })
  showRevenuePrompt.value = false
  pendingStatus.value = null
  leadsStore.fetchPayments(id.value).catch(() => {})
}

async function doStatusChange(payload) {
  statusChanging.value = true
  try {
    await leadsStore.updateStatus(id.value, payload)
    toast.showSuccess(t('leads.statusUpdated'))
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leads.errors.status')))
  } finally {
    statusChanging.value = false
  }
}

/* ── Assignment ────────────────────────────────────────────── */
async function onAssign(assignedTo, agent) {
  try {
    await leadsStore.assign(id.value, assignedTo)
    if (agent && leadsStore.current) {
      leadsStore.current.assigned_agent = {
        id: agent.id,
        name: agent.name,
        email: agent.email,
      }
    }
    toast.showSuccess(t('leads.assignSuccess'))
    showAssignModal.value = false
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.assign')))
  }
}

/* ── Notes & calls ─────────────────────────────────────────── */
async function onAddNote(note) {
  noteSubmitting.value = true
  try {
    await leadsStore.addNote(id.value, note)
    toast.showSuccess(t('leads.noteAdded'))
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.note')))
  } finally {
    noteSubmitting.value = false
  }
}

async function onLogCall(payload) {
  callSubmitting.value = true
  try {
    await leadsStore.logCall(id.value, payload)
    toast.showSuccess(t('leads.callLogged'))
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.call')))
  } finally {
    callSubmitting.value = false
  }
}

/* ── Appointments ──────────────────────────────────────────── */
function isAptOverdue(apt) {
  if (!apt.scheduled_at) return false
  if (apt.status === 'REALISE' || apt.status === 'ANNULE') return false
  return new Date(apt.scheduled_at) < new Date()
}

// Planned appointments first (soonest first), then past ones (latest first)
const sortedAppointments = computed(() => {
  const list = [...leadsStore.leadAppointments]
  const planned = list.filter((a) => a.status === 'PLANIFIE').sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  const others = list.filter((a) => a.status !== 'PLANIFIE').sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
  return [...planned, ...others]
})

function scheduleAppointment() {
  router.push({ name: 'leads.appointments.create', params: { leadId: id.value } })
}

async function onAptDelete(apt) {
  const ok = await ui.confirm(t('appointments.deleteTitle'), t('appointments.deleteConfirm'), { confirmLabel: t('common.delete') })
  if (!ok) return
  aptActionId.value = apt.id
  try {
    await appointmentsStore.remove(apt.id)
    leadsStore.leadAppointments = leadsStore.leadAppointments.filter((a) => a.id !== apt.id)
    toast.showSuccess(t('appointments.deleteSuccess'))
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.appointmentDelete')))
  } finally {
    aptActionId.value = null
  }
}

/* ── Payments ──────────────────────────────────────────────── */
const collectedPct = computed(() => {
  const l = leadsStore.current
  if (!l || !Number(l.expected_revenue)) return 0
  return Math.min(100, Math.round((Number(l.total_received ?? 0) / Number(l.expected_revenue)) * 100))
})

async function onPaymentSubmit(payload) {
  try {
    await leadsStore.addPayment(id.value, payload)
    toast.showSuccess(t('leadDetail.payments.added'))
    showPaymentForm.value = false
    refreshActivity()
  } catch (e) {
    if (e?.errors) {
      paymentFormRef.value?.setServerErrors(e.errors)
    }
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.paymentAdd')))
  }
}

async function onPaymentStatus(payment, status) {
  try {
    await leadsStore.changePaymentStatus(id.value, payment.id, status)
    toast.showSuccess(t('paymentList.statusChanged', { status: t('statuses.paymentRecord.' + status) }))
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.paymentStatus')))
  } finally {
    paymentListRef.value?.clearBusy()
  }
}

async function onPaymentDelete(payment) {
  try {
    await leadsStore.removePayment(id.value, payment.id)
    toast.showSuccess(t('leadDetail.payments.deleted'))
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.paymentDelete')))
  }
}

/* ── Dossier ───────────────────────────────────────────────── */
async function onDossierUpload(formData) {
  try {
    await leadsStore.uploadDocument(id.value, formData)
    toast.showSuccess(t('leadDetail.dossier.uploaded'))
    refreshActivity()
    leadsStore.fetchOne(id.value).catch(() => {})
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.upload')))
  }
}

async function onDossierDelete(document) {
  try {
    await leadsStore.removeDocument(id.value, document.id)
    toast.showSuccess(t('leadDetail.dossier.deleted'))
    refreshActivity()
    leadsStore.fetchOne(id.value).catch(() => {})
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.documentDelete')))
  }
}

async function onDossierDownload(document) {
  try {
    await leadsStore.downloadDocument(id.value, document.id, document.original_filename)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.download')))
  }
}

async function onSetClientType(clientType) {
  updatingClientType.value = true
  try {
    await leadsStore.setClientType(id.value, clientType)
    await leadsStore.fetchDossier(id.value)
    toast.showSuccess(t('documents.clientTypeUpdated'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.update')))
  } finally {
    updatingClientType.value = false
  }
}

async function onDossierPreview(doc) {
  previewDoc.value = { ...doc.document, type_label: doc.type_label }
  previewBlobUrl.value = null
  previewLoading.value = true
  try {
    const response = await documentsApi.download(id.value, doc.document.id)
    previewBlobUrl.value = URL.createObjectURL(new Blob([response.data], { type: doc.document.mime_type }))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.preview')))
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

/* ── More actions ──────────────────────────────────────────── */
async function onCrossSellConfirm(payload) {
  crossSellLoading.value = true
  try {
    const newLead = await leadsStore.crossSell(id.value, payload)
    toast.showSuccess(t('leadDetail.crossSellDone'))
    showCrossSellModal.value = false
    router.push({ name: 'leads.detail', params: { id: newLead.id } })
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.crossSell')))
  } finally {
    crossSellLoading.value = false
  }
}

async function openFlagIssueModal() {
  if (!leadsStore.dossier) {
    await leadsStore.fetchDossier(id.value)
  }
  showFlagIssueModal.value = true
}

async function onFlagIssueConfirm(payload) {
  flagIssueLoading.value = true
  try {
    await leadsStore.flagIssue(id.value, payload)
    toast.showSuccess(t('leadDetail.flagDone'))
    showFlagIssueModal.value = false
    refreshActivity()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leadDetail.errors.flag')))
  } finally {
    flagIssueLoading.value = false
  }
}

async function handleDelete() {
  const ok = await ui.confirm(t('leads.deleteTitle'), t('leads.deleteNamed', { name: leadFullName.value }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await leadsStore.remove(id.value)
    toast.showSuccess(t('leads.deleteSuccess'))
    router.replace({ name: 'leads' })
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('leads.errors.delete')))
  }
}

function runMenu(action) {
  showMoreMenu.value = false
  action()
}

const moreMenuRef = ref(null)
function onDocClick(e) {
  if (showMoreMenu.value && !moreMenuRef.value?.contains(e.target)) showMoreMenu.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))

/* ── Display helpers ───────────────────────────────────────── */
function aptWhen(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const infoFields = computed(() => {
  const l = leadsStore.current
  if (!l) return []
  const rows = [
    { label: t('leads.filterInsurance'), value: l.insurance_type ? t('insuranceTypes.' + l.insurance_type, l.insurance_type) : '—' },
    { label: t('leadDetail.info.clientType'), value: l.client_type ? t('clientTypes.' + l.client_type, l.client_type) : '—' },
    { label: t('leads.filterSource'), value: l.lead_source?.name ?? '—' },
    { label: t('leads.receivedAt'), value: formatDateTime(l.created_at), mono: true },
  ]
  if (l.lead_submitted_at) rows.push({ label: t('leads.submittedAt'), value: formatDateTime(l.lead_submitted_at), mono: true })
  rows.push({ label: t('users.lastUpdated'), value: formatDateTime(l.updated_at), mono: true })
  if (l.city) rows.push({ label: t('leadDetail.info.city'), value: l.city })
  if (l.birth_date) rows.push({ label: t('leadDetail.info.birthDate'), value: l.birth_date, mono: true })
  return rows
})

const companyFields = computed(() => {
  const l = leadsStore.current
  if (!l || l.insurance_type !== 'DECENNALE') return []
  return [
    { label: t('leads.companyName'), value: l.company_name },
    { label: t('leads.address'), value: l.address },
    { label: t('leads.legalForm'), value: l.company_legal_form },
    { label: t('leads.sector'), value: l.company_sector },
    { label: t('leads.employeeCount'), value: l.company_employee_count },
    { label: t('leads.annualRevenue'), value: l.company_annual_revenue },
    { label: t('leads.applicantStatus'), value: l.company_status },
  ].filter((f) => f.value !== null && f.value !== undefined && f.value !== '')
})
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">

    <!-- Breadcrumb + prev/next -->
    <nav :aria-label="t('leadDetail.breadcrumb')" class="flex items-center gap-1.5 text-[13px] text-gray-500">
      <RouterLink :to="{ name: 'leads' }" class="text-gray-600 hover:text-gray-900">{{ t('leads.title') }}</RouterLink>
      <ChevronRight class="w-3.5 h-3.5" />
      <span class="text-gray-900 truncate">{{ leadFullName || '…' }}</span>
      <div class="flex-1" />
      <template v-if="fromList && neighbours?.position">
        <span class="text-[12.5px] hidden sm:inline">
          {{ t('leadDetail.position', { n: neighbours.position, total: neighbours.total }) }}
        </span>
        <RouterLink
          v-if="prevLead"
          :to="{ name: 'leads.detail', params: { id: prevLead.id } }"
          :aria-label="t('leadDetail.previous')"
          class="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:bg-gray-50"
        ><ChevronLeft class="w-3.5 h-3.5" /></RouterLink>
        <span v-else class="w-7 h-7 rounded-md border border-gray-100 text-gray-300 flex items-center justify-center"><ChevronLeft class="w-3.5 h-3.5" /></span>
        <RouterLink
          v-if="nextLead"
          :to="{ name: 'leads.detail', params: { id: nextLead.id } }"
          :aria-label="t('leadDetail.next')"
          class="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:bg-gray-50"
        ><ChevronRight class="w-3.5 h-3.5" /></RouterLink>
        <span v-else class="w-7 h-7 rounded-md border border-gray-100 text-gray-300 flex items-center justify-center"><ChevronRight class="w-3.5 h-3.5" /></span>
      </template>
    </nav>

    <!-- Loading -->
    <section v-if="!lead" class="bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
      <AppSkeleton width="52px" height="52px" rounded="rounded-full" />
      <div class="flex-1 space-y-2"><AppSkeleton height="22px" width="35%" /><AppSkeleton height="14px" width="55%" /></div>
    </section>

    <template v-else-if="lead">
      <!-- ── Header card ─────────────────────────────────────── -->
      <section class="bg-white border border-gray-200 rounded-xl">
        <div class="px-5 pt-5 pb-4 flex flex-wrap items-start gap-4">
          <AppAvatar :name="leadFullName" size="lg" tone="soft" class="!w-13 !h-13 !text-[17px]" />
          <div class="flex-1 min-w-[240px] flex flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 class="font-display text-2xl leading-[30px] font-semibold tracking-tight text-gray-900">{{ leadFullName }}</h1>
              <span v-if="lead.reference" class="font-mono text-xs text-gray-500">{{ lead.reference }}</span>
              <span
                v-if="lead.is_doublon"
                class="px-1.5 rounded text-[11px] leading-[18px] font-medium bg-danger-bg text-danger-text"
              >{{ lead.doublon_of ? t('leads.doublonOf', { ref: lead.doublon_of.reference }) : t('leads.doublon') }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-600">
              <a v-if="lead.phone" :href="`tel:${lead.phone}`" class="flex items-center gap-1.5 hover:text-gray-900">
                <Phone class="w-3.5 h-3.5" /><span class="font-mono text-[12.5px] text-gray-900">{{ lead.phone }}</span>
              </a>
              <a v-if="lead.email" :href="`mailto:${lead.email}`" class="flex items-center gap-1.5 min-w-0 hover:text-gray-900">
                <Mail class="w-3.5 h-3.5 shrink-0" /><span class="text-gray-900 truncate">{{ lead.email }}</span>
              </a>
              <span class="flex flex-wrap gap-1.5">
                <span v-if="lead.insurance_type" class="px-2 rounded-[5px] text-xs leading-5 bg-gray-100 text-gray-700">
                  {{ t('insuranceTypesShort.' + lead.insurance_type, lead.insurance_type) }}
                </span>
                <span v-if="lead.client_type" class="px-2 rounded-[5px] text-xs leading-5 bg-gray-100 text-gray-700">
                  {{ t('clientTypes.' + lead.client_type, lead.client_type) }}
                </span>
                <span v-if="lead.lead_source" class="px-2 rounded-[5px] text-xs leading-5 bg-gray-100 text-gray-700">
                  {{ lead.lead_source.name }}
                </span>
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <a
              v-if="lead.phone"
              :href="`tel:${lead.phone}`"
              class="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover"
            ><Phone class="w-3.5 h-3.5" />{{ t('leadDetail.call') }}</a>
            <button
              type="button"
              :disabled="statusChanging"
              class="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              @click="onStatusChange('RAPPEL')"
            ><Clock class="w-3.5 h-3.5" />{{ t('leads.rappelModal.title') }}</button>

            <div v-if="hasMoreActions" ref="moreMenuRef" class="relative">
              <button
                type="button"
                :aria-expanded="showMoreMenu"
                aria-haspopup="menu"
                :aria-label="t('leadDetail.moreActions')"
                :class="[
                  'w-9 h-9 rounded-lg border bg-white text-gray-900 flex items-center justify-center hover:bg-gray-50',
                  showMoreMenu ? 'border-gray-900' : 'border-gray-300',
                ]"
                @click="showMoreMenu = !showMoreMenu"
              ><MoreHorizontal class="w-4 h-4" /></button>
              <div
                v-if="showMoreMenu"
                role="menu"
                class="absolute right-0 top-full mt-1.5 z-30 w-60 bg-white border border-gray-200 rounded-[10px] shadow-dropdown p-1.5 flex flex-col"
              >
                <button v-if="canAssign" role="menuitem" class="h-8.5 flex items-center gap-2.5 px-2.5 rounded-md text-[13px] text-gray-900 hover:bg-gray-50 text-left" @click="runMenu(() => (showAssignModal = true))">
                  <UserPlus class="w-4 h-4 text-gray-500" />{{ t('leadDetail.reassign') }}
                </button>
                <button v-if="canCrossSell" role="menuitem" class="h-8.5 flex items-center gap-2.5 px-2.5 rounded-md text-[13px] text-gray-900 hover:bg-gray-50 text-left" @click="runMenu(() => (showCrossSellModal = true))">
                  <PackagePlus class="w-4 h-4 text-gray-500" />{{ t('leadDetail.crossSell') }}
                </button>
                <button v-if="canFlagIssue" role="menuitem" class="h-8.5 flex items-center gap-2.5 px-2.5 rounded-md text-[13px] text-gray-900 hover:bg-gray-50 text-left" @click="runMenu(openFlagIssueModal)">
                  <Flag class="w-4 h-4 text-gray-500" />{{ t('leadDetail.flagIssue') }}
                </button>
                <RouterLink v-if="auth.can('LEADS_UPDATE')" role="menuitem" :to="{ name: 'leads.edit', params: { id } }" class="h-8.5 flex items-center gap-2.5 px-2.5 rounded-md text-[13px] text-gray-900 hover:bg-gray-50">
                  <Pencil class="w-4 h-4 text-gray-500" />{{ t('leadDetail.editInfo') }}
                </RouterLink>
                <template v-if="auth.can('LEADS_DELETE')">
                  <div class="h-px bg-gray-100 my-1" />
                  <button role="menuitem" class="h-8.5 flex items-center gap-2.5 px-2.5 rounded-md text-[13px] text-danger-text hover:bg-danger-bg/50 text-left" @click="runMenu(handleDelete)">
                    <Trash2 class="w-4 h-4" />{{ t('leadDetail.deleteLead') }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage progress + status + agent -->
        <div class="border-t border-gray-100 px-5 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <LeadStageStepper :status="lead.status" class="flex-1 min-w-[440px]" />
          <div class="flex items-center gap-4 sm:pl-5 sm:border-l border-gray-100">
            <div class="flex flex-col gap-1">
              <span class="text-[11.5px] text-gray-500">{{ t('leads.status') }}</span>
              <LeadStatusDropdown :status="lead.status" :dvc-status="lead.dvc_status" :loading="statusChanging" @change="onStatusChange" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-[11.5px] text-gray-500">{{ t('leadDetail.dvc.label') }}</span>
              <button type="button" class="h-6 inline-flex items-center" :title="t('leadDetail.dvc.open')" @click="showDossierModal = true">
                <DvcStatusBadge :status="lead.dvc_status ?? 'A_GENERER'" dot />
              </button>
            </div>
            <div v-if="auth.can('PAYMENTS_VIEW')" class="flex flex-col gap-1">
              <span class="text-[11.5px] text-gray-500">{{ t('payments.title') }}</span>
              <span class="h-6 inline-flex items-center">
                <PaymentStatusBadge :status="lead.payment_status ?? 'NON_PAYE'" dot />
              </span>
            </div>
            <!-- An agent looking at their own lead doesn't need to see their own name -->
            <div v-if="!isOwnLead" class="flex flex-col gap-1">
              <span class="text-[11.5px] text-gray-500">{{ t('leads.filterAgent') }}</span>
              <component
                :is="canAssign ? 'button' : 'span'"
                :type="canAssign ? 'button' : undefined"
                :class="['h-6 inline-flex items-center gap-1.5 text-[13px] text-gray-900', canAssign ? 'hover:text-primary' : '']"
                @click="canAssign && (showAssignModal = true)"
              >
                <template v-if="lead.assigned_agent">
                  <AppAvatar :name="lead.assigned_agent.name" size="xs" />
                  {{ lead.assigned_agent.name }}
                </template>
                <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
                <ChevronDown v-if="canAssign" class="w-3 h-3 text-gray-500" />
              </component>
            </div>
          </div>
        </div>
      </section>

      <div class="flex flex-col xl:flex-row gap-5 items-start">

        <!-- ── Main column ─────────────────────────────────────── -->
        <div class="flex-1 min-w-0 w-full flex flex-col gap-4">

          <!-- Sent back by gestion -->
          <div
            v-if="lead.status === 'A_CORRIGER'"
            role="alert"
            class="flex flex-wrap items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200"
          >
            <AlertTriangle class="w-[18px] h-[18px] text-warning-text shrink-0 mt-0.5" />
            <div class="flex-1 min-w-[200px]">
              <p class="text-[13.5px] font-semibold text-amber-900">{{ t('leadDetail.flagged.title') }}</p>
              <p class="text-[13px] text-amber-900 mt-0.5">
                <!-- What gestion wrote when sending it back (last_flag), else the dossier's missing documents -->
                <template v-if="lead.last_flag?.documents?.length">
                  {{ t('leadDetail.flagged.missing', { docs: lead.last_flag.documents.join(', ') }) }}
                </template>
                <template v-else-if="missingDossierDocuments.length">
                  {{ t('leadDetail.flagged.missing', { docs: missingDossierDocuments.map((d) => d.type_label).join(', ') }) }}
                </template>
                <template v-else>{{ t('leadDetail.flagged.generic') }}</template>
              </p>
              <p v-if="lead.last_flag?.message" class="text-[13px] text-amber-900 mt-1.5 whitespace-pre-wrap">« {{ lead.last_flag.message }} »</p>
              <p v-if="lead.last_flag?.by" class="text-xs text-amber-800/80 mt-1">
                {{ t('leadDetail.flagged.by', { name: lead.last_flag.by.name, date: formatDateTime(lead.last_flag.at) }) }}
              </p>
            </div>
            <button
              type="button"
              class="h-8 px-3 rounded-lg bg-amber-800 text-white text-[13px] font-medium hover:bg-amber-900"
              @click="showDossierModal = true"
            >{{ t('leadDetail.dossier.open') }}</button>
          </div>

          <LeadComposer
            :submitting-note="noteSubmitting"
            :submitting-call="callSubmitting"
            :can-schedule="auth.can('APPOINTMENTS_CREATE')"
            :can-log-call="auth.can('LEAD_CALLS_MANAGE')"
            @add-note="onAddNote"
            @log-call="onLogCall"
            @schedule="scheduleAppointment"
          />

          <LeadActivityFeed
            :lead-id="id"
            :refresh-key="activityKey"
            :show-payments="hasRevenue"
          />
        </div>

        <!-- ── Right column ────────────────────────────────────── -->
        <aside class="w-full xl:w-[340px] shrink-0 flex flex-col gap-4">

          <!-- Information -->
          <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('leadDetail.info.title') }}</h2>
              <RouterLink
                v-if="auth.can('LEADS_UPDATE')"
                :to="{ name: 'leads.edit', params: { id } }"
                class="text-[13px] font-medium text-primary hover:text-primary-hover"
              >{{ t('common.edit') }}</RouterLink>
            </div>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
              <div v-for="f in infoFields" :key="f.label" class="min-w-0">
                <dt class="text-xs text-gray-500">{{ f.label }}</dt>
                <dd :class="['mt-0.5 text-[13px] text-gray-900 break-words', f.mono ? 'font-mono text-[12.5px]' : '']">{{ f.value }}</dd>
              </div>
            </dl>

            <template v-if="companyFields.length">
              <p class="pt-2 border-t border-gray-100 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">{{ t('leads.companyInfo') }}</p>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
                <div v-for="f in companyFields" :key="f.label" class="min-w-0">
                  <dt class="text-xs text-gray-500">{{ f.label }}</dt>
                  <dd class="mt-0.5 text-[13px] text-gray-900 break-words">{{ f.value }}</dd>
                </div>
              </dl>
            </template>

            <template v-if="sheetExtraFields || lead.comment">
              <button
                type="button"
                :aria-expanded="showFormDetails"
                class="h-8 flex items-center justify-center gap-1.5 border-t border-gray-100 pt-2 text-[13px] text-gray-600 hover:text-gray-900"
                @click="showFormDetails = !showFormDetails"
              >
                {{ t('leads.sheetDetails') }}
                <ChevronDown :class="['w-3.5 h-3.5 transition-transform', showFormDetails ? 'rotate-180' : '']" />
              </button>
              <template v-if="showFormDetails">
                <dl v-if="sheetExtraFields" class="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div v-for="field in sheetExtraFields" :key="field.key" class="min-w-0">
                    <dt class="text-xs text-gray-500">{{ field.label }}</dt>
                    <dd class="mt-0.5 text-[13px] text-gray-900 break-words">{{ field.value }}</dd>
                  </div>
                </dl>
                <p v-else class="text-[13px] text-gray-700 whitespace-pre-wrap">{{ lead.comment }}</p>
              </template>
            </template>
          </section>
          <!-- Dossier -->
          <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('leads.history.dossier') }}</h2>
              <span v-if="leadsStore.dossier?.total_required" class="font-mono text-[12.5px] text-gray-600">
                {{ leadsStore.dossier.total_uploaded }} / {{ leadsStore.dossier.total_required }}
              </span>
            </div>

            <!-- DVC: generate → client signs → signed copy uploaded (unlocks Gestion / Validé) -->
            <div
              :class="[
                'rounded-lg px-3 py-2.5 flex flex-col gap-2',
                lead.dvc_status === 'SIGNE' ? 'bg-success-bg/60' : 'bg-amber-50 border border-amber-200',
              ]"
            >
              <div class="flex items-center justify-between gap-2">
                <DvcStatusBadge :status="lead.dvc_status ?? 'A_GENERER'" dot />
                <span v-if="lead.dvc_signed_at" class="text-xs text-gray-600">{{ formatDateTime(lead.dvc_signed_at) }}</span>
              </div>
              <p v-if="lead.dvc_status !== 'SIGNE'" class="text-[12.5px] leading-[18px] text-amber-900">
                {{ auth.can('LEADS_SET_REVIEW_STATUS') && !auth.can('CONTRACTS_GENERATE')
                  ? t('leadDetail.dvc.reviewHint')
                  : lead.dvc_status === 'EN_ATTENTE_SIGNATURE' ? t('leadDetail.dvc.waitingHint') : t('leadDetail.dvc.generateHint') }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <RouterLink
                  v-if="lead.dvc_status === 'A_GENERER' && auth.can('CONTRACTS_GENERATE')"
                  :to="{ name: 'contracts.create', query: { lead_id: lead.id } }"
                  class="h-7.5 inline-flex items-center px-2.5 rounded-md bg-white border border-gray-300 text-[12.5px] text-gray-900 hover:bg-gray-50"
                >{{ t('leadDetail.dvc.generate') }}</RouterLink>
                <button
                  v-if="lead.dvc_status !== 'SIGNE' && auth.can('DOCUMENTS_UPLOAD')"
                  type="button"
                  class="h-7.5 px-2.5 rounded-md bg-white border border-gray-300 text-[12.5px] text-gray-900 hover:bg-gray-50"
                  @click="showDossierModal = true"
                >{{ t('leadDetail.dvc.upload') }}</button>
                <!-- Next step once signed: agents send to gestion, gestion validates -->
                <template v-if="lead.dvc_status === 'SIGNE'">
                  <button
                    v-if="auth.can('LEADS_SET_REVIEW_STATUS') && lead.status !== 'VALIDE'"
                    type="button"
                    :disabled="statusChanging"
                    class="h-7.5 px-2.5 rounded-md bg-white border border-gray-300 text-[12.5px] text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                    @click="onStatusChange('VALIDE')"
                  >{{ t('leadDetail.payments.validate') }}</button>
                  <p v-else-if="lead.status === 'GESTION'" class="text-[12.5px] text-info-text">{{ t('leadDetail.payments.inReview') }}</p>
                  <button
                    v-else-if="auth.can('LEADS_UPDATE_STATUS') && !['VALIDE', 'CALL2_OK', 'CALL2_KO', 'PDG_OK', 'PDG_KO'].includes(lead.status)"
                    type="button"
                    :disabled="statusChanging"
                    class="h-7.5 px-2.5 rounded-md bg-white border border-gray-300 text-[12.5px] text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                    @click="onStatusChange('GESTION')"
                  >{{ t('leadDetail.payments.sendToGestion') }}</button>
                </template>
              </div>
            </div>

            <div v-if="leadsStore.loading.dossier && !leadsStore.dossier" class="space-y-2">
              <AppSkeleton v-for="n in 3" :key="n" height="18px" />
            </div>
            <template v-else-if="leadsStore.dossier">
              <p v-if="!leadsStore.dossier.documents?.length" class="text-[13px] text-gray-500">
                {{ lead.client_type ? t('documents.noDocumentsRequired') : t('documents.clientTypeRequired') }}
              </p>
              <ul v-else class="flex flex-col">
                <li
                  v-for="doc in leadsStore.dossier.documents"
                  :key="doc.type"
                  class="h-9 flex items-center gap-2.5 border-b border-gray-100 last:border-b-0 text-[13px]"
                >
                  <span
                    v-if="doc.status !== 'missing'"
                    class="w-[18px] h-[18px] rounded-full bg-success text-white flex items-center justify-center shrink-0"
                  ><Check class="w-2.5 h-2.5" stroke-width="3" /></span>
                  <span v-else class="w-[18px] h-[18px] rounded-full border-[1.5px] border-dashed border-warning-text shrink-0" />
                  <span :class="['flex-1 truncate', doc.status === 'missing' ? 'text-amber-900 font-medium' : 'text-gray-900']">{{ doc.type_label }}</span>
                  <span v-if="doc.status === 'missing'" class="text-xs text-warning-text">{{ t('documents.missing') }}</span>
                </li>
              </ul>
            </template>
            <p v-else class="text-[13px] text-gray-500">{{ t('documents.loadFailed') }}</p>
            <button
              type="button"
              class="h-8 mt-1 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
              @click="showDossierModal = true"
            >{{ t('leadDetail.dossier.manage') }}</button>
          </section>

          <!-- Payments (independent of the pipeline: before or after the DVC signature) -->
          <section v-if="auth.can('PAYMENTS_VIEW')" class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('payments.title') }}</h2>
              <PaymentStatusBadge :status="lead.payment_status ?? 'NON_PAYE'" />
            </div>
            <!-- No contract total yet: the first payment asks for it -->
            <template v-if="!hasRevenue">
              <p class="text-[13px] leading-[19px] text-gray-600">{{ t('leadDetail.payments.notYet') }}</p>
              <button
                v-if="canAddPayment"
                type="button"
                class="h-8 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
                @click="showPaymentForm = true"
              >{{ t('leadDetail.payments.addFirst') }}</button>
              <PaymentList
                v-if="leadsStore.payments.length"
                ref="paymentListRef"
                :payments="leadsStore.payments"
                class="border-t border-gray-100 pt-2"
                @delete="onPaymentDelete"
                @status="onPaymentStatus"
              />
            </template>
            <template v-else>
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-mono text-[22px] font-medium">{{ formatCurrency(lead.total_received ?? 0) }}</span>
              <span class="text-[13px] text-gray-600">
                {{ t('leadDetail.payments.of') }} <span class="font-mono">{{ formatCurrency(lead.expected_revenue ?? 0) }}</span>
              </span>
            </div>
            <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div class="h-full rounded-full bg-success" :style="{ width: `${collectedPct}%` }" />
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[13px] text-gray-600">
                {{ t('leadDetail.payments.remaining') }} <span class="font-mono text-gray-900">{{ formatCurrency(lead.remaining_amount ?? 0) }}</span>
              </span>
              <button
                v-if="canAddPayment && Number(lead.remaining_amount ?? 0) > 0"
                type="button"
                class="h-7.5 px-2.5 rounded-md border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
                @click="showPaymentForm = true"
              >{{ t('leadDetail.payments.add') }}</button>
            </div>
            <PaymentList
              v-if="leadsStore.payments.length || leadsStore.loading.payments"
              ref="paymentListRef"
              :payments="leadsStore.payments"
              :loading="leadsStore.loading.payments"
              class="border-t border-gray-100 pt-2"
              @delete="onPaymentDelete"
              @status="onPaymentStatus"
            />
            </template>
          </section>

          <!-- Appointments -->
          <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('nav.appointments') }}</h2>
              <button
                v-if="auth.can('APPOINTMENTS_CREATE')"
                type="button"
                class="h-7.5 inline-flex items-center gap-1 px-2 rounded-md text-[13px] font-medium text-primary hover:bg-primary-light"
                @click="scheduleAppointment"
              ><Plus class="w-3.5 h-3.5" />{{ t('leadDetail.plan') }}</button>
            </div>
            <div v-if="leadsStore.loading.appointments && !sortedAppointments.length" class="space-y-2">
              <AppSkeleton v-for="n in 2" :key="n" height="44px" />
            </div>
            <p v-else-if="!sortedAppointments.length" class="text-[13px] text-gray-500 py-1">{{ t('appointments.noScheduled') }}</p>
            <template v-else>
            <div
              v-for="apt in sortedAppointments"
              :key="apt.id"
              :class="[
                'flex items-start gap-2.5 p-2.5 -mx-1 rounded-lg',
                isAptOverdue(apt) ? 'bg-danger-bg/40' : 'hover:bg-gray-50',
              ]"
            >
              <CalendarDays :class="['w-4 h-4 mt-0.5 shrink-0', isAptOverdue(apt) ? 'text-danger-text' : 'text-gray-500']" />
              <div class="flex-1 min-w-0">
                <RouterLink
                  :to="{ name: 'appointments.detail', params: { id: apt.id } }"
                  :class="['block text-[13px] font-medium hover:text-primary', isAptOverdue(apt) ? 'text-danger-text' : 'text-gray-900']"
                >{{ aptWhen(apt.scheduled_at) }}</RouterLink>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                  <AppointmentStatusBadge :status="apt.status" />
                  <span v-if="isAptOverdue(apt)" class="text-[11px] font-semibold uppercase text-danger-text">{{ t('appointments.overdue') }}</span>
                  <span v-if="apt.agent" class="text-xs text-gray-500 truncate">{{ apt.agent.name }}</span>
                </div>
              </div>
              <div class="flex items-center shrink-0">
                <RouterLink
                  v-if="auth.can('APPOINTMENTS_UPDATE')"
                  :to="{ name: 'appointments.edit', params: { id: apt.id } }"
                  :aria-label="t('common.edit')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                ><Pencil class="w-3.5 h-3.5" /></RouterLink>
                <button
                  v-if="auth.can('APPOINTMENTS_DELETE')"
                  type="button"
                  :disabled="aptActionId === apt.id"
                  :aria-label="t('common.delete')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg disabled:opacity-50"
                  @click="onAptDelete(apt)"
                >
                  <AppSpinner v-if="aptActionId === apt.id" :size="14" />
                  <Trash2 v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            </template>
          </section>

        </aside>
      </div>
    </template>

    <!-- Dossier manager -->
    <AppModal :open="showDossierModal" :title="t('leads.history.dossier')" size="lg" @close="showDossierModal = false">
      <DossierTab
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
    </AppModal>

    <CrossSellModal
      :open="showCrossSellModal"
      :loading="crossSellLoading"
      :current-insurance-type="leadsStore.current?.insurance_type"
      @close="showCrossSellModal = false"
      @confirm="onCrossSellConfirm"
    />

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

    <RappelScheduleModal
      :open="showRappelModal"
      :loading="rappelLoading"
      :lead-name="leadFullName"
      @close="showRappelModal = false; pendingStatus = null"
      @confirm="onRappelConfirm"
    />

    <PaymentForm
      ref="paymentFormRef"
      :open="showPaymentForm"
      :remaining-amount="leadsStore.current?.remaining_amount ?? 0"
      :needs-total="!hasRevenue"
      :loading="leadsStore.loading.payments"
      @close="showPaymentForm = false"
      @submit="onPaymentSubmit"
    />

    <!-- Flag issue modal (gestion only) -->
    <FlagIssueModal
      :open="showFlagIssueModal"
      :loading="flagIssueLoading"
      :missing-documents="missingDossierDocuments"
      @close="showFlagIssueModal = false"
      @confirm="onFlagIssueConfirm"
    />

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
