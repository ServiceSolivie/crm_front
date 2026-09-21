<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Plus, Search, Phone, Pencil, Trash2, X, SearchX, ChevronUp, ChevronDown, CalendarClock, FileWarning,
} from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useUsersStore } from '@/stores/users.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import RevenuePromptModal from '@/components/modules/payments/RevenuePromptModal.vue'
import RappelScheduleModal from '@/components/modules/leads/RappelScheduleModal.vue'
import LeadAssignModal from '@/components/modules/leads/LeadAssignModal.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import LeadStatusDropdown from '@/components/modules/leads/LeadStatusDropdown.vue'
import { LEAD_STATUS, LEAD_STAGES, INSURANCE_TYPE, REVIEW_STATUSES, DVC_STATUS, PAYMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatDateTime } from '@/utils/formatters'

const router = useRouter()
const route = useRoute()
const leadsStore = useLeadsStore()
const sourcesStore = useLeadSourcesStore()
const usersStore = useUsersStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()

const statusChangingId = ref(null)
const showRevenuePrompt = ref(false)
const showRappelModal = ref(false)
const rappelLoading = ref(false)
const pendingValidateLead = ref(null)
const pendingRappelLead = ref(null)

/* Saved views — each one is a set of list filters; counts come from GET /leads/counts */
// "Mine" and "Unassigned" are about agent assignment: only for those who assign leads.
const myId = computed(() => String(auth.user?.id ?? ''))
// Gestion works on leads assigned to it in the back office, not on agent assignment
const showAssignmentViews = computed(() => auth.can('LEADS_ASSIGN'))
const showDueView = computed(() => !auth.hasRole('gestion'))
const views = computed(() => [
  { key: 'all', label: t('leads.views.all'), count: leadsStore.counts?.all },
  ...(showAssignmentViews.value ? [{ key: 'mine', label: t('leads.views.mine'), count: leadsStore.counts?.mine }] : []),
  ...(showDueView.value ? [{ key: 'due', label: t('leads.views.due'), count: leadsStore.counts?.due_today }] : []),
  ...(showAssignmentViews.value ? [{ key: 'unassigned', label: t('leads.views.unassigned'), count: leadsStore.counts?.unassigned }] : []),
  { key: 'doublons', label: t('leads.views.doublons'), count: leadsStore.counts?.doublons },
])
const activeView = computed(() => {
  const f = leadsStore.filters
  if (f.due === 'today') return 'due'
  if (f.unassigned) return 'unassigned'
  if (f.is_doublon) return 'doublons'
  if (myId.value && String(f.assigned_to) === myId.value) return 'mine'
  return 'all'
})
function selectView(key) {
  const f = leadsStore.filters
  const wasMine = activeView.value === 'mine'
  f.due = key === 'due' ? 'today' : ''
  f.unassigned = key === 'unassigned' ? 1 : ''
  f.is_doublon = key === 'doublons' ? 1 : ''
  if (key === 'mine') f.assigned_to = myId.value
  else if (wasMine || key === 'unassigned') f.assigned_to = ''
  // "À rappeler" is most useful with the earliest appointment first
  if (key === 'due') {
    f.sort_by = 'next_action_at'
    f.sort_dir = 'asc'
  }
  leadsStore.setFilter('page', 1)
}

/* Filters */
const leadStatusOptions = useEnumOptions(LEAD_STATUS, 'statuses.lead')
const stageOptions = computed(() =>
  Object.entries(LEAD_STAGES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => ({ value: key, label: t('stages.' + key) })),
)
const insuranceTypeOptions = useEnumOptions(INSURANCE_TYPE, 'insuranceTypes')
const dvcOptions = useEnumOptions(DVC_STATUS, 'statuses.dvc')
const paymentOptions = useEnumOptions(PAYMENT_STATUS, 'statuses.payment')
const sourceOptions = computed(() => sourcesStore.list.map((s) => ({ value: s.id, label: s.name })))
const agentOptions = computed(() => usersStore.list.map((u) => ({ value: u.id, label: u.name })))

// "Créé le" presets map onto the API's from/to (created_at)
const createdPreset = ref('')
const createdOptions = computed(() => [
  { value: 'today', label: t('leads.created.today') },
  { value: '7d', label: t('leads.created.last7') },
  { value: '30d', label: t('leads.created.last30') },
  { value: 'month', label: t('leads.created.thisMonth') },
])
function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function setCreatedPreset(key) {
  createdPreset.value = key
  const now = new Date()
  let from = ''
  if (key === 'today') from = isoDay(now)
  else if (key === '7d') from = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  else if (key === '30d') from = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))
  else if (key === 'month') from = isoDay(new Date(now.getFullYear(), now.getMonth(), 1))
  leadsStore.filters.to = ''
  leadsStore.setFilter('from', from)
}

const searchText = ref(leadsStore.filters.search ?? '')
let searchTimer = null
watch(searchText, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => leadsStore.setFilter('search', v), 300)
})

// Chips other than the view tabs (assigned_to is shown as the "Agent" chip only when not "Mine")
const hasChipFilters = computed(() => {
  const f = leadsStore.filters
  return !!(f.status.length || f.stage || f.insurance_type.length || f.source_id.length || f.from || f.to
    || f.dvc_status.length || f.payment_status.length
    || (f.assigned_to && activeView.value !== 'mine'))
})
function clearChips() {
  const view = activeView.value
  createdPreset.value = ''
  searchText.value = ''
  leadsStore.resetFilters()
  if (view !== 'all') selectView(view)
}

onMounted(() => {
  // Dashboard pipeline links open the list on one stage (?stage=follow_up)
  if (route.query.stage && LEAD_STAGES[route.query.stage]) {
    leadsStore.filters.stage = String(route.query.stage)
    leadsStore.filters.status = []
    leadsStore.filters.page = 1
    router.replace({ query: { ...route.query, stage: undefined } })
  }
  leadsStore.fetchList()
  leadsStore.fetchCounts()
  sourcesStore.fetchList()
  if (auth.can('LEADS_ASSIGN')) usersStore.fetchList({ per_page: 100 })
})

/* Sorting  */
const SORT_KEY_MAP = { name: 'first_name', next_action: 'next_action_at' }
function sortIcon(key) {
  const apiKey = SORT_KEY_MAP[key] ?? key
  if (leadsStore.filters.sort_by !== apiKey) return null
  return leadsStore.filters.sort_dir === 'asc' ? ChevronUp : ChevronDown
}
function toggleSort(key) {
  const apiKey = SORT_KEY_MAP[key] ?? key
  const dir = leadsStore.filters.sort_by === apiKey && leadsStore.filters.sort_dir === 'asc' ? 'desc' : 'asc'
  leadsStore.filters.sort_by = apiKey
  leadsStore.filters.sort_dir = dir
  leadsStore.fetchList()
}

/* Status changes */
function onStatusChange(lead, status) {
  // Validating asks the contract total only when no payment gave it yet
  if (status === 'VALIDE' && lead.status !== 'VALIDE' && lead.expected_revenue == null) {
    pendingValidateLead.value = lead
    showRevenuePrompt.value = true
    return
  }
  if (status === 'RAPPEL') {
    pendingRappelLead.value = lead
    showRappelModal.value = true
    return
  }
  doStatusChange(lead, { status })
}

async function onRappelConfirm({ scheduled_at, notes }) {
  const lead = pendingRappelLead.value
  rappelLoading.value = true
  try {
    await leadsStore.updateStatus(lead.id, { status: 'RAPPEL' })
    const agentId = lead.assigned_agent?.id ?? lead.assigned_to ?? auth.user?.id
    await leadsStore.createLeadAppointment(lead.id, {
      agent_id: agentId,
      scheduled_at,
      notes,
      status: 'PLANIFIE',
    })
    toast.showSuccess(t('leads.rappelModal.success'))
    showRappelModal.value = false
    pendingRappelLead.value = null
  } catch (e) {
    toast.showError(e?.message ?? t('leads.errors.rappel'))
  } finally {
    rappelLoading.value = false
  }
}

async function onRevenueConfirm(expectedRevenue) {
  const lead = pendingValidateLead.value
  await doStatusChange(lead, { status: 'VALIDE', expected_revenue: expectedRevenue })
  showRevenuePrompt.value = false
  pendingValidateLead.value = null
}

async function doStatusChange(lead, payload) {
  statusChangingId.value = lead.id
  try {
    await leadsStore.updateStatus(lead.id, payload)
    toast.showSuccess(t('leads.statusUpdated'))
  } catch (e) {
    toast.showError(e?.message ?? t('leads.errors.status'))
  } finally {
    statusChangingId.value = null
  }
}

function receivedDay(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: '2-digit' }),
  })
}
function receivedTime(value) {
  const d = new Date(value)
  if (!value || isNaN(d)) return ''
  return d.toLocaleTimeString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
}

/* "Prochaine action" column (next_action from the API) */
function nextAction(row) {
  const a = row.next_action
  if (!a) return null
  if (a.type === 'missing_document') return { icon: FileWarning, text: t('leads.next.missingDocument'), tone: 'warning' }
  const d = new Date(a.at)
  const loc = locale.value === 'fr' ? 'fr-FR' : 'en-GB'
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  let when
  if (d.toDateString() === today.toDateString()) when = time
  else if (d.toDateString() === yesterday.toDateString()) when = t('leads.next.yesterday')
  else if (d.toDateString() === tomorrow.toDateString()) when = t('leads.next.tomorrow', { time })
  else when = d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })
  return {
    icon: CalendarClock,
    text: a.overdue ? t('leads.next.overdue', { when }) : t('leads.next.appointment', { when }),
    tone: a.overdue ? 'danger' : 'info',
    title: formatDateTime(a.at),
  }
}

function fullName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.reference || '—'
}

async function handleDelete(row) {
  const ok = await ui.confirm(t('leads.deleteTitle'), t('leads.deleteNamed', { name: fullName(row) }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await leadsStore.remove(row.id)
    toast.showSuccess(t('leads.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('leads.errors.delete'))
  }
}

/* bulk actions */
const canBulkAssign = computed(() => auth.can('LEADS_ASSIGN'))
const canBulkDelete = computed(() => auth.can('LEADS_DELETE'))
const canBulkStatus = computed(() => auth.can('LEADS_UPDATE_STATUS'))
const canSelect = computed(() => canBulkAssign.value || canBulkDelete.value || canBulkStatus.value)

// Validation needs a revenue per lead, so it is never offered in bulk;
// back-office statuses only for users who may set them.
const bulkStatusOptions = computed(() =>
  Object.keys(LEAD_STATUS)
    .filter((k) => k !== 'VALIDE' && (auth.can('LEADS_SET_REVIEW_STATUS') || !REVIEW_STATUSES.includes(k)))
    .map((k) => ({ value: k, label: t('statuses.lead.' + k, k) })),
)
const showBulkStatus = ref(false)

const selected = ref(new Set())
watch(() => leadsStore.list, () => { selected.value = new Set() })

const allOnPageSelected = computed(() =>
  leadsStore.list.length > 0 && leadsStore.list.every((l) => selected.value.has(l.id)),
)
function toggleRow(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
function toggleAll() {
  selected.value = allOnPageSelected.value ? new Set() : new Set(leadsStore.list.map((l) => l.id))
}

const bulkBusy = ref(false)
const showBulkAssign = ref(false)

/** POST /leads/bulk — one call, per-lead results */
async function runBulk(payload) {
  bulkBusy.value = true
  try {
    const { done, failed, results } = await leadsStore.bulk({ ids: [...selected.value], ...payload })
    if (failed) {
      const reason = results.find((r) => !r.ok)?.error
      toast.showError(t('leads.bulk.partial', { ok: done, fail: failed }) + (reason ? ` — ${reason}` : ''))
    } else {
      toast.showSuccess(t('leads.bulk.done', { n: done }))
    }
    selected.value = new Set()
  } catch (e) {
    toast.showError(e?.message ?? t('leads.errors.status'))
  } finally {
    bulkBusy.value = false
    leadsStore.fetchList()
    leadsStore.fetchCounts()
  }
}

async function onBulkAssign(assignedTo) {
  showBulkAssign.value = false
  await runBulk({ action: 'assign', assigned_to: assignedTo })
}

async function onBulkStatus(status) {
  showBulkStatus.value = false
  await runBulk({ action: 'status', status })
}

async function onBulkDelete() {
  const n = selected.value.size
  const ok = await ui.confirm(t('leads.deleteTitle'), t('leads.bulk.deleteConfirm', { n }), { confirmLabel: t('common.delete') })
  if (!ok) return
  await runBulk({ action: 'delete' })
}

/* ── Pagination ────────────────────────────────────────────── */
const from = computed(() =>
  leadsStore.meta.total === 0 ? 0 : (leadsStore.meta.current_page - 1) * leadsStore.meta.per_page + 1,
)
const to = computed(() =>
  Math.min(leadsStore.meta.current_page * leadsStore.meta.per_page, leadsStore.meta.total),
)

// An agent only sees their own leads: the Agent column would repeat their name on every row
const showAgentColumn = computed(() => !auth.hasRole('agent'))
// Written out in full so Tailwind generates them: [select column] × [agent column]
const GRIDS = {
  selectAgent: 'grid-cols-[44px_minmax(210px,1.6fr)_minmax(150px,1fr)_minmax(80px,0.5fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(100px,0.7fr)_56px_76px]',
  select: 'grid-cols-[44px_minmax(210px,1.6fr)_minmax(150px,1fr)_minmax(80px,0.5fr)_minmax(160px,1fr)_minmax(150px,1fr)_minmax(100px,0.7fr)_56px_76px]',
  agent: 'grid-cols-[16px_minmax(210px,1.6fr)_minmax(150px,1fr)_minmax(80px,0.5fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(100px,0.7fr)_56px_76px]',
  none: 'grid-cols-[16px_minmax(210px,1.6fr)_minmax(150px,1fr)_minmax(80px,0.5fr)_minmax(160px,1fr)_minmax(150px,1fr)_minmax(100px,0.7fr)_56px_76px]',
}
const gridCols = computed(() =>
  GRIDS[canSelect.value ? (showAgentColumn.value ? 'selectAgent' : 'select') : (showAgentColumn.value ? 'agent' : 'none')],
)
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-baseline gap-2.5">
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('leads.title') }}</h1>
        <span class="font-mono text-sm text-gray-500">{{ leadsStore.meta.total }}</span>
      </div>
      <div class="flex items-center gap-2.5">
        <RouterLink
          v-if="auth.can('LEADS_CREATE')"
          :to="{ name: 'leads.create' }"
          class="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover"
        >
          <Plus class="w-4 h-4" />{{ t('leads.newLead') }}
        </RouterLink>
      </div>
    </div>

    <!-- Saved views -->
    <div v-if="views.length > 1" role="tablist" :aria-label="t('leads.views.label')" class="flex items-end gap-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
      <button
        v-for="v in views"
        :key="v.key"
        role="tab"
        :aria-selected="activeView === v.key"
        :class="[
          'h-9.5 -mb-px px-0.5 border-b-2 text-[13.5px] flex items-center gap-2',
          activeView === v.key ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
        @click="selectView(v.key)"
      >
        {{ v.label }}
        <span v-if="activeView === v.key && !leadsStore.loading.list" class="font-mono text-xs text-gray-500">{{ leadsStore.meta.total }}</span>
        <span v-else-if="v.count !== undefined && v.count !== null" class="font-mono text-xs text-gray-500">{{ v.count }}</span>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <label class="h-9 w-full sm:w-[300px] flex items-center gap-2 px-2.5 rounded-lg border border-gray-300 bg-white text-gray-500 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft/20">
        <Search class="w-4 h-4 shrink-0" />
        <span class="sr-only">{{ t('common.search') }}</span>
        <input
          v-model="searchText"
          type="search"
          :placeholder="t('leads.searchPlaceholder')"
          class="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-gray-900"
        >
      </label>
      <AppFilterChip
        :label="t('leads.stage')"
        :model-value="leadsStore.filters.stage"
        :options="stageOptions"
        :searchable="false"
        @update:model-value="leadsStore.setFilter('stage', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('leads.status')"
        :model-value="leadsStore.filters.status"
        :options="leadStatusOptions"
        @update:model-value="leadsStore.setFilter('status', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('leads.filterInsurance')"
        :model-value="leadsStore.filters.insurance_type"
        :options="insuranceTypeOptions"
        @update:model-value="leadsStore.setFilter('insurance_type', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('leads.filterSource')"
        :model-value="leadsStore.filters.source_id"
        :options="sourceOptions"
        @update:model-value="leadsStore.setFilter('source_id', $event)"
      />
      <AppFilterChip
        v-if="agentOptions.length && activeView !== 'mine' && activeView !== 'unassigned'"
        :label="t('leads.filterAgent')"
        :model-value="leadsStore.filters.assigned_to"
        :options="agentOptions"
        @update:model-value="leadsStore.setFilter('assigned_to', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('leads.filterDvc')"
        :model-value="leadsStore.filters.dvc_status"
        :options="dvcOptions"
        :searchable="false"
        @update:model-value="leadsStore.setFilter('dvc_status', $event)"
      />
      <AppFilterChip
        v-if="auth.can('PAYMENTS_VIEW')"
        multiple
        :label="t('leads.filterPayment')"
        :model-value="leadsStore.filters.payment_status"
        :options="paymentOptions"
        :searchable="false"
        @update:model-value="leadsStore.setFilter('payment_status', $event)"
      />
      <AppFilterChip
        :label="t('leads.createdAt')"
        :model-value="leadsStore.filters.from ? createdPreset : ''"
        :options="createdOptions"
        @update:model-value="setCreatedPreset"
      />
      <button
        v-if="hasChipFilters || searchText"
        type="button"
        class="h-9 px-2 text-[13px] text-gray-600 hover:text-gray-900"
        @click="clearChips"
      >
        {{ t('common.clear') }}
      </button>
    </div>

    <!-- Table -->
    <section class="relative bg-white border border-gray-200 rounded-xl">
      <div class="overflow-x-auto rounded-t-xl">
        <div class="min-w-[1200px] text-[13px]" role="table" :aria-label="t('leads.title')">
          <!-- Head -->
          <div role="row" :class="['grid items-center h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600', gridCols]">
            <div role="columnheader" class="pl-4">
              <input
                v-if="canSelect"
                type="checkbox"
                :checked="allOnPageSelected"
                :aria-label="t('leads.selectAll')"
                class="w-[15px] h-[15px] accent-primary"
                @change="toggleAll"
              >
            </div>
            <button role="columnheader" class="px-3 h-full flex items-center gap-1 text-left hover:text-gray-900" @click="toggleSort('name')">
              {{ t('leads.lead') }} <component :is="sortIcon('name')" v-if="sortIcon('name')" class="w-3.5 h-3.5" />
            </button>
            <div role="columnheader" class="px-3">{{ t('leads.phone') }}</div>
            <div role="columnheader" class="px-3">{{ t('leads.filterInsurance') }}</div>
            <div role="columnheader" class="px-3">{{ t('leads.status') }}</div>
            <div v-if="showAgentColumn" role="columnheader" class="px-3">{{ t('leads.filterAgent') }}</div>
            <button role="columnheader" class="px-3 h-full flex items-center gap-1 text-left hover:text-gray-900" @click="toggleSort('next_action')">
              {{ t('leads.nextAction') }} <component :is="sortIcon('next_action')" v-if="sortIcon('next_action')" class="w-3.5 h-3.5" />
            </button>
            <button role="columnheader" class="px-3 h-full flex items-center gap-1 text-left hover:text-gray-900" @click="toggleSort('created_at')">
              {{ t('leads.receivedAt') }} <component :is="sortIcon('created_at')" v-if="sortIcon('created_at')" class="w-3.5 h-3.5" />
            </button>
            <div role="columnheader" class=" text-left">{{ t('leads.calls') }}</div>
            <div role="columnheader"><span class="sr-only">{{ t('common.actions') }}</span></div>
          </div>

          <!-- Loading -->
          <template v-if="leadsStore.loading.list">
            <div v-for="n in 8" :key="n" :class="['grid items-center h-[54px] border-b border-gray-100', gridCols]">
              <div />
              <div class="px-3 flex items-center gap-2.5">
                <AppSkeleton width="30px" height="30px" rounded="rounded-full" />
                <div class="flex-1 space-y-1.5"><AppSkeleton height="10px" width="70%" /><AppSkeleton height="8px" width="45%" /></div>
              </div>
              <div class="px-3"><AppSkeleton height="10px" width="80%" /></div>
              <div class="px-3"><AppSkeleton height="10px" width="60%" /></div>
              <div class="px-3"><AppSkeleton height="22px" width="90px" /></div>
              <div v-if="showAgentColumn" class="px-3"><AppSkeleton height="10px" width="70%" /></div>
              <div class="px-3"><AppSkeleton height="10px" width="60%" /></div>
              <div class="px-3"><AppSkeleton height="10px" width="80%" /></div>
              <div /><div />
            </div>
          </template>

          <!-- Empty -->
          <div v-else-if="!leadsStore.list.length" class="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center">
              <SearchX class="w-5 h-5" />
            </span>
            <p class="font-display text-base font-semibold text-gray-900 mt-1">
              {{ hasChipFilters || searchText ? t('leads.noMatch') : t('leads.noLeads') }}
            </p>
            <p class="text-[13px] text-gray-600 max-w-sm">
              {{ hasChipFilters || searchText ? t('leads.noMatchDesc') : t('leads.noLeadsDesc') }}
            </p>
            <button
              v-if="hasChipFilters || searchText"
              type="button"
              class="mt-1.5 h-8.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
              @click="clearChips"
            >{{ t('leads.clearFilters') }}</button>
          </div>

          <!-- Rows -->
          <template v-else>
          <div
            v-for="row in leadsStore.list"
            :key="row.id"
            role="row"
            :class="[
              'grid items-center h-[54px] border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors',
              gridCols,
              selected.has(row.id) ? 'bg-primary-light/60' : 'hover:bg-gray-50',
            ]"
            @click="router.push({ name: 'leads.detail', params: { id: row.id } })"
          >
            <div role="cell" class="pl-4" @click.stop>
              <input
                v-if="canSelect"
                type="checkbox"
                :checked="selected.has(row.id)"
                :aria-label="t('leads.selectRow', { name: fullName(row) })"
                class="w-[15px] h-[15px] accent-primary"
                @change="toggleRow(row.id)"
              >
            </div>
            <div role="cell" class="px-3 flex items-center gap-2.5 min-w-0">
              <AppAvatar :name="fullName(row)" size="sm" tone="soft" />
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 min-w-0">
                  <RouterLink
                    :to="{ name: 'leads.detail', params: { id: row.id } }"
                    class="font-medium text-gray-900 hover:text-primary truncate"
                    @click.stop
                  >{{ fullName(row) }}</RouterLink>
                  <span
                    v-if="row.is_doublon"
                    class="shrink-0 px-1.5 rounded text-[11px] leading-[17px] font-medium bg-danger-bg text-danger-text"
                    :title="row.doublon_of ? t('leads.doublonOf', { ref: row.doublon_of.reference }) : ''"
                  >{{ t('leads.doublon') }}</span>
                </div>
                <p class="text-xs text-gray-500 truncate">
                  {{ row.lead_source?.name || row.reference || '—' }}
                </p>
              </div>
            </div>
            <div role="cell" class="px-3 flex items-center gap-1 min-w-0">
              <span class="font-mono text-[12.5px] text-gray-900 truncate">{{ row.phone || '—' }}</span>
              <a
                v-if="row.phone"
                :href="`tel:${row.phone}`"
                class="shrink-0 w-6.5 h-6.5 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                :aria-label="t('leads.callName', { name: fullName(row) })"
                @click.stop
              ><Phone class="w-3.5 h-3.5" /></a>
            </div>
            <div role="cell" class="px-3 min-w-0">
              <span
                v-if="row.insurance_type"
                class="inline-block max-w-full truncate px-1.5 rounded text-xs leading-5 font-medium bg-gray-100 text-gray-700"
                :title="t('insuranceTypes.' + row.insurance_type, row.insurance_type)"
              >{{ t('insuranceTypesShort.' + row.insurance_type, row.insurance_type) }}</span>
              <span v-else class="text-gray-400">—</span>
            </div>
            <div role="cell" class="px-3" @click.stop>
              <LeadStatusDropdown
                :status="row.status"
                :dvc-status="row.dvc_status"
                :loading="statusChangingId === row.id"
                @change="(s) => onStatusChange(row, s)"
              />
            </div>
            <div v-if="showAgentColumn" role="cell" class="px-3 min-w-0">
              <div v-if="row.assigned_agent" class="flex items-center gap-2 min-w-0">
                <AppAvatar :name="row.assigned_agent.name" size="xs" />
                <span class="text-gray-900 truncate">{{ row.assigned_agent.name }}</span>
              </div>
              <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
            </div>
            <div role="cell" class="px-3 min-w-0">
              <span
                v-if="nextAction(row)"
                :title="nextAction(row).title"
                :class="[
                  'inline-flex items-center gap-1.5 max-w-full text-[12.5px]',
                  { danger: 'text-danger-text font-medium', warning: 'text-warning-text', info: 'text-gray-900' }[nextAction(row).tone],
                ]"
              >
                <component :is="nextAction(row).icon" class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate">{{ nextAction(row).text }}</span>
              </span>
              <span v-else class="text-gray-400">—</span>
            </div>
            <div role="cell" class="px-3 min-w-0" :title="formatDateTime(row.created_at)">
              <p class="font-mono text-[12.5px] text-gray-900 whitespace-nowrap">{{ receivedDay(row.created_at) }}</p>
              <p class="font-mono text-[11.5px] text-gray-500">{{ receivedTime(row.created_at) }}</p>
            </div>
            <div role="cell" class="px-3 font-mono text-gray-600">{{ row.calls_count ?? 0 }}</div>
            <div role="cell" class="pr-3 flex items-center justify-end gap-0.5" @click.stop>
              <RouterLink
                v-if="auth.can('LEADS_UPDATE')"
                :to="{ name: 'leads.edit', params: { id: row.id } }"
                :title="t('common.edit')"
                :aria-label="t('common.edit')"
                class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
              ><Pencil class="w-3.5 h-3.5" /></RouterLink>
              <button
                v-if="auth.can('LEADS_DELETE')"
                type="button"
                :title="t('common.delete')"
                :aria-label="t('common.delete')"
                class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
                @click="handleDelete(row)"
              ><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
          </div>
          </template>
        </div>
      </div>

      <div class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="leadsStore.meta.current_page"
          :last-page="leadsStore.meta.last_page"
          :total="leadsStore.meta.total"
          :from="from"
          :to="to"
          :per-page="leadsStore.meta.per_page"
          @page-change="leadsStore.setFilter('page', $event)"
          @per-page-change="leadsStore.setFilter('per_page', $event)"
        />
      </div>

      <!-- Bulk action bar -->
      <Transition name="modal">
        <div
          v-if="selected.size"
          class="fixed left-1/2 lg:left-[calc(50%+116px)] -translate-x-1/2 bottom-6 z-30 flex items-center gap-1 pl-4 pr-1.5 py-1.5 rounded-xl bg-sidebar text-white text-[13px] shadow-[0_10px_30px_rgba(17,24,39,0.25)] whitespace-nowrap"
        >
          <span class="font-medium pr-3 mr-1 border-r border-white/15">{{ t('leads.bulk.selected', { n: selected.size }, selected.size) }}</span>
          <button
            v-if="canBulkAssign"
            type="button"
            :disabled="bulkBusy"
            class="h-8 px-2.5 rounded-lg hover:bg-white/10 disabled:opacity-50"
            @click="showBulkAssign = true"
          >{{ t('leads.assign') }}</button>
          <div v-if="canBulkStatus" class="relative">
            <button
              type="button"
              :disabled="bulkBusy"
              :aria-expanded="showBulkStatus"
              class="h-8 px-2.5 rounded-lg hover:bg-white/10 disabled:opacity-50"
              @click="showBulkStatus = !showBulkStatus"
            >{{ t('leads.bulk.changeStatus') }}</button>
            <div
              v-if="showBulkStatus"
              role="listbox"
              class="absolute bottom-full mb-2 left-0 w-56 max-h-72 overflow-y-auto bg-white text-gray-900 border border-gray-200 rounded-xl shadow-modal p-1.5"
            >
              <button
                v-for="o in bulkStatusOptions"
                :key="o.value"
                type="button"
                role="option"
                class="w-full px-2 py-1.5 rounded-md text-left text-[13px] hover:bg-gray-50"
                @click="onBulkStatus(o.value)"
              >{{ o.label }}</button>
            </div>
          </div>
          <button
            v-if="canBulkDelete"
            type="button"
            :disabled="bulkBusy"
            class="h-8 px-2.5 rounded-lg text-red-300 hover:bg-white/10 disabled:opacity-50"
            @click="onBulkDelete"
          >{{ t('common.delete') }}</button>
          <button
            type="button"
            class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center"
            :aria-label="t('leads.bulk.deselect')"
            @click="selected = new Set(); showBulkStatus = false"
          ><X class="w-3.5 h-3.5" /></button>
        </div>
      </Transition>
    </section>

    <RevenuePromptModal
      :open="showRevenuePrompt"
      :loading="statusChangingId !== null"
      @close="showRevenuePrompt = false; pendingValidateLead = null"
      @confirm="onRevenueConfirm"
    />

    <RappelScheduleModal
      :open="showRappelModal"
      :loading="rappelLoading"
      :lead-name="pendingRappelLead ? fullName(pendingRappelLead) : ''"
      @close="showRappelModal = false; pendingRappelLead = null"
      @confirm="onRappelConfirm"
    />

    <LeadAssignModal
      :open="showBulkAssign"
      :current-assignee-id="null"
      :loading="bulkBusy"
      @close="showBulkAssign = false"
      @assign="onBulkAssign"
    />
  </div>
</template>
