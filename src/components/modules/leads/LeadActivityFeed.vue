<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MessageSquare, Phone, ArrowLeftRight, UserPlus, CalendarDays, Euro, FileText,
} from 'lucide-vue-next'
import LeadStatusBadge from './LeadStatusBadge.vue'
import AppointmentStatusBadge from '@/components/modules/appointments/AppointmentStatusBadge.vue'
import PaymentRecordStatusBadge from '@/components/modules/payments/PaymentRecordStatusBadge.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { leadsApi } from '@/api/leads'
import { formatCurrency } from '@/utils/formatters'

/**
 * One chronological feed for everything that happened on a lead: notes,
 * calls, status changes, (re)assignments, appointments, payments and
 * documents — one paginated call (GET /leads/{id}/activity), grouped by day.
 * Bump `refreshKey` after an action on the lead to reload it.
 */
const props = defineProps({
  leadId: { type: [String, Number], required: true },
  refreshKey: { type: Number, default: 0 },
  showPayments: { type: Boolean, default: false },
})

const { t, locale } = useI18n()
const filter = ref('')
const items = ref([])
const meta = ref(null)
const loading = ref(false)
const loadingMore = ref(false)
const failed = ref(false)
const PER_PAGE = 30
let requestId = 0

const filterOptions = computed(() => [
  { value: 'note', label: t('leadDetail.activity.notes') },
  { value: 'call', label: t('leadDetail.activity.calls') },
  { value: 'status', label: t('leadDetail.activity.statuses') },
  { value: 'appointment', label: t('leadDetail.activity.appointments') },
  ...(props.showPayments ? [{ value: 'payment', label: t('leadDetail.activity.payments') }] : []),
  { value: 'document', label: t('leadDetail.activity.documents') },
])

const ICONS = {
  note: { icon: MessageSquare, cls: 'bg-gray-100 text-gray-600' },
  call: { icon: Phone, cls: 'bg-primary-light text-indigo-800' },
  status: { icon: ArrowLeftRight, cls: 'bg-gray-100 text-gray-600' },
  assignment: { icon: UserPlus, cls: 'bg-gray-100 text-gray-600' },
  appointment: { icon: CalendarDays, cls: 'bg-info-bg text-info-text' },
  payment: { icon: Euro, cls: 'bg-success-bg text-success-text' },
  document: { icon: FileText, cls: 'bg-gray-100 text-gray-600' },
}

/** API item → the shape each template branch reads */
function toEvent(i) {
  const d = i.data ?? {}
  const raw = {
    note: { user: i.user, note: d.note },
    call: { user: i.user, outcome: d.outcome, note: d.note },
    status: { changed_by: i.user, from_status: d.from, to_status: d.to, comment: d.comment },
    assignment: { assigned_by: i.user, to_user: d.to, from_user: d.from },
    appointment: { scheduled_at: d.scheduled_at, status: d.status, agent: d.agent, notes: d.notes },
    payment: { amount: d.amount, status: d.status, payment_method: d.payment_method, custom_payment_method: d.custom_payment_method, notes: d.notes },
    document: { user: i.user, document_type: d.document_type, document_label: d.document_label, original_filename: d.original_filename },
  }[i.type]
  return { kind: i.type, id: `${i.type}-${i.id}`, at: i.at, raw }
}

async function load(page = 1) {
  const id = ++requestId
  if (page === 1) loading.value = true
  else loadingMore.value = true
  failed.value = false
  try {
    const res = await leadsApi.activity(props.leadId, { page, per_page: PER_PAGE, type: filter.value || undefined })
    if (id !== requestId) return
    const next = (res.data ?? []).filter((i) => ICONS[i.type]).map(toEvent)
    items.value = page === 1 ? next : [...items.value, ...next]
    meta.value = res.meta ?? null
  } catch {
    if (id === requestId) failed.value = true
  } finally {
    if (id === requestId) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

watch(() => [props.leadId, props.refreshKey, filter.value], () => load(1), { immediate: true })

const hasMore = computed(() => meta.value && meta.value.current_page < meta.value.last_page)
const events = computed(() => items.value.filter((e) => e.at))

const loc = computed(() => (locale.value === 'fr' ? 'fr-FR' : 'en-GB'))

function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t('leadDetail.activity.today')
  if (d.toDateString() === yesterday.toDateString()) return t('leadDetail.activity.yesterday')
  return d.toLocaleDateString(loc.value, {
    day: 'numeric', month: 'long', ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  })
}

const groups = computed(() => {
  const out = []
  for (const e of events.value) {
    const key = dayKey(e.at)
    if (!out.length || out[out.length - 1].key !== key) out.push({ key, label: dayLabel(e.at), items: [] })
    out[out.length - 1].items.push(e)
  }
  return out
})

function time(iso) {
  return new Date(iso).toLocaleTimeString(loc.value, { hour: '2-digit', minute: '2-digit' })
}
function dateTime(iso) {
  return new Date(iso).toLocaleString(loc.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
// Document types are free codes (RIB, CARTE_GRISE…): show them readably
function docType(code) {
  if (!code) return ''
  const text = String(code).replace(/_/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
function paymentMethod(p) {
  return p.custom_payment_method || t('paymentMethods.' + p.payment_method, p.payment_method ?? '')
}
</script>

<template>
  <section class="bg-white border border-gray-200 rounded-xl px-5 pt-4 pb-2">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="font-display text-base font-semibold text-gray-900">{{ t('leadDetail.activity.title') }}</h2>
      <AppFilterChip
        v-model="filter"
        :label="t('leadDetail.activity.show')"
        :options="filterOptions"
        :searchable="false"
      />
    </div>

    <div v-if="loading" class="py-2 space-y-4">
      <div v-for="n in 4" :key="n" class="flex gap-3.5">
        <AppSkeleton width="28px" height="28px" rounded="rounded-full" />
        <div class="flex-1 space-y-1.5"><AppSkeleton height="12px" width="55%" /><AppSkeleton height="10px" width="35%" /></div>
      </div>
    </div>

    <p v-else-if="failed && !items.length" class="py-8 text-center text-sm text-gray-500">
      {{ t('leadDetail.activity.loadFailed') }}
      <button type="button" class="ml-1 font-medium text-primary hover:underline" @click="load(1)">{{ t('common.retry') }}</button>
    </p>

    <p v-else-if="!groups.length" class="py-8 text-center text-sm text-gray-500">
      {{ filter ? t('leadDetail.activity.emptyFiltered') : t('leadDetail.activity.empty') }}
    </p>

    <template v-else>
      <div v-for="(group, gi) in groups" :key="group.key">
        <p
          :class="[
            'text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 pt-2 pb-1',
            gi > 0 ? 'border-t border-gray-100 mt-1 pt-3' : '',
          ]"
        >{{ group.label }}</p>

        <div v-for="e in group.items" :key="e.id" class="flex gap-3.5 py-2.5">
          <span :class="['w-7 h-7 shrink-0 rounded-full flex items-center justify-center', ICONS[e.kind].cls]">
            <component :is="ICONS[e.kind].icon" class="w-3.5 h-3.5" />
          </span>

          <div class="flex-1 min-w-0 text-[13.5px]">
            <!-- Note -->
            <template v-if="e.kind === 'note'">
              <p>
                <span class="font-medium">{{ e.raw.user?.name ?? e.raw.author?.name ?? '—' }}</span>
                <span class="text-gray-600"> · {{ t('leadDetail.activity.addedNote') }}</span>
              </p>
              <p class="mt-1.5 text-[13px] leading-[19px] text-gray-900 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{{ e.raw.note }}</p>
            </template>

            <!-- Call -->
            <template v-else-if="e.kind === 'call'">
              <p>
                <span class="font-medium">{{ t('leadDetail.activity.call') }}</span>
                <span class="text-gray-600">
                  · {{ e.raw.user?.name ?? '—' }}<template v-if="e.raw.outcome"> · {{ t('leads.callOutcomes.' + e.raw.outcome, e.raw.outcome) }}</template>
                </span>
              </p>
              <p v-if="e.raw.note" class="mt-1.5 text-[13px] leading-[19px] text-gray-900 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{{ e.raw.note }}</p>
            </template>

            <!-- Status change -->
            <template v-else-if="e.kind === 'status'">
              <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-medium">{{ e.raw.changed_by?.name ?? t('leads.history.importSource') }}</span>
                <span class="text-gray-600">{{ t('leadDetail.activity.changedStatus') }}</span>
                <template v-if="e.raw.from_status">
                  <LeadStatusBadge :status="e.raw.from_status" />
                  <span class="text-gray-500">→</span>
                </template>
                <LeadStatusBadge :status="e.raw.to_status" />
              </p>
              <p v-if="e.raw.comment" class="mt-1.5 text-[13px] leading-[19px] text-gray-900 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{{ e.raw.comment }}</p>
            </template>

            <!-- Assignment -->
            <template v-else-if="e.kind === 'assignment'">
              <p>
                <span class="font-medium">{{ e.raw.assigned_by?.name ?? t('leads.history.importSource') }}</span>
                <span class="text-gray-600"> {{ t('leadDetail.activity.assignedTo') }} </span>
                <span class="font-medium">{{ e.raw.to_user?.name ?? '—' }}</span>
                <span v-if="e.raw.from_user || e.raw.from_agent_name" class="text-gray-500">
                  · {{ t('leads.history.previously') }} {{ e.raw.from_user?.name ?? e.raw.from_agent_name }}
                </span>
              </p>
            </template>

            <!-- Appointment -->
            <template v-else-if="e.kind === 'appointment'">
              <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-medium">{{ t('leadDetail.activity.appointmentFor', { date: dateTime(e.raw.scheduled_at) }) }}</span>
                <AppointmentStatusBadge :status="e.raw.status" />
                <span v-if="e.raw.agent" class="text-gray-600">· {{ e.raw.agent.name }}</span>
              </p>
              <p v-if="e.raw.notes" class="mt-1 text-[13px] text-gray-600 line-clamp-2">{{ e.raw.notes }}</p>
            </template>

            <!-- Document -->
            <template v-else-if="e.kind === 'document'">
              <p>
                <span class="font-medium">{{ e.raw.user?.name ?? '—' }}</span>
                <span class="text-gray-600"> · {{ t('leadDetail.activity.uploadedDocument') }}</span>
              </p>
              <p class="mt-1 text-[13px] text-gray-600 truncate">
                {{ e.raw.document_label ?? docType(e.raw.document_type) }}<template v-if="e.raw.original_filename"> · {{ e.raw.original_filename }}</template>
              </p>
            </template>

            <!-- Payment -->
            <template v-else-if="e.kind === 'payment'">
              <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-medium">{{ t('leadDetail.activity.paymentRecorded') }}</span>
                <span class="text-gray-600">
                  · <span class="font-mono text-gray-900">{{ formatCurrency(e.raw.amount) }}</span> · {{ paymentMethod(e.raw) }}
                </span>
                <PaymentRecordStatusBadge v-if="e.raw.status" :status="e.raw.status" />
              </p>
              <p v-if="e.raw.notes" class="mt-1 text-[13px] text-gray-600">{{ e.raw.notes }}</p>
            </template>
          </div>

          <span class="shrink-0 font-mono text-xs text-gray-500 pt-0.5">{{ time(e.at) }}</span>
        </div>
      </div>
      <div v-if="hasMore" class="border-t border-gray-100 py-2 text-center">
        <button
          type="button"
          :disabled="loadingMore"
          class="h-8 px-3 rounded-lg text-[13px] font-medium text-primary hover:bg-primary-light disabled:opacity-50"
          @click="load(meta.current_page + 1)"
        >{{ loadingMore ? t('common.loading') : t('leadDetail.activity.loadMore', { n: meta.total - items.length }) }}</button>
      </div>
    </template>
  </section>
</template>
