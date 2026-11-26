<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useInsuranceTypes } from '@/composables/useInsuranceTypes'
import { Eye, Phone, RefreshCw, Inbox } from 'lucide-vue-next'
import { useGestionDashboardStore } from '@/stores/gestionDashboard.store'
import { useAuthStore } from '@/stores/auth.store'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import KpiStripCell from '@/components/modules/dashboard/KpiStripCell.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'
import DvcStatusBadge from '@/components/modules/leads/DvcStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters'
import CallButton from '@/components/modules/calls/CallButton.vue'
import { dialNumber } from '@/utils/phone'
import { useReportAccess } from '@/composables/useReportAccess'
import { useLeadStatuses } from '@/composables/useLeadStatuses'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppPagination from '@/components/base/AppPagination.vue'

/**
 * Gestion's workspace: headline figures, then every lead currently with
 * this gestion user — oldest in its status first — with the next step.
 */
const { t, locale } = useI18n()
const { typeShort } = useInsuranceTypes()
const router = useRouter()
const auth = useAuthStore()
const store = useGestionDashboardStore()
const { statusLabel } = useLeadStatuses()

onMounted(() => store.fetchDashboard())

const stats = computed(() => store.stats)
const queue = computed(() => stats.value?.queue ?? [])
const nf = computed(() => new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB'))
const num = (v) => (v === null || v === undefined ? '—' : nf.value.format(v))

/* ── Queue groups (tabs) ───────────────────────────────────── */
const GROUPS = {
  todo: ['GESTION'],
  control: ['CALL2_OK', 'PDG_OK'],
  blocked: ['CALL2_KO', 'PDG_KO'],
  agent: ['A_CORRIGER'],
  // Supervisor only: his team's « Souscrit » leads, before they reach gestion
  subscribed: ['SOUSCRIS'],
}
const activeGroup = ref('all')

/* ── Filters (agent, team, status, search) + pagination ────── */
const filters = reactive({ agent: '', team: '', status: '', q: '' })
const hasFilters = computed(() => !!(filters.agent || filters.team || filters.status || filters.q))
function resetFilters() {
  Object.assign(filters, { agent: '', team: '', status: '', q: '' })
}
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
function matches(lead) {
  if (filters.agent && String(lead.agent?.id ?? 'none') !== filters.agent) return false
  if (filters.team && String(lead.team?.id ?? 'none') !== filters.team) return false
  if (filters.status && lead.status !== filters.status) return false
  const q = fold(filters.q).trim()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  return fold(`${lead.first_name ?? ''} ${lead.last_name ?? ''} ${lead.last_name ?? ''} ${lead.first_name ?? ''} ${lead.reference ?? ''}`).includes(q)
    || (digits.length >= 4 && String(lead.phone ?? '').replace(/\D/g, '').includes(digits))
}
const filteredQueue = computed(() => queue.value.filter(matches))
const filteredValidated = computed(() => validated.value.filter(matches))

const byLabel = (a, b) => a.label.localeCompare(b.label, 'fr')
function uniqueOptions(key) {
  const seen = new Map()
  for (const l of [...queue.value, ...validated.value]) {
    const v = l[key]
    seen.set(String(v?.id ?? 'none'), v?.name ?? t('common.unassigned'))
  }
  return [...seen].map(([value, label]) => ({ value, label })).sort(byLabel)
}
const agentOptions = computed(() => [{ value: '', label: t('gestion.filters.allAgents') }, ...uniqueOptions('agent')])
const teamOptions = computed(() => [{ value: '', label: t('gestion.filters.allTeams') }, ...uniqueOptions('team')])
const statusOptions = computed(() => {
  const codes = new Set([...queue.value, ...validated.value].map((l) => l.status))
  return [{ value: '', label: t('gestion.filters.allStatuses') }, ...[...codes].map((c) => ({ value: c, label: statusLabel(c) })).sort(byLabel)]
})

const tabs = computed(() => [
  { key: 'all', label: t('gestion.tabs.all'), count: filteredQueue.value.length },
  ...Object.entries(GROUPS).filter(([key]) => key !== 'subscribed' || readOnly.value).map(([key, statuses]) => ({
    key,
    label: t('gestion.tabs.' + key),
    count: filteredQueue.value.filter((l) => statuses.includes(l.status)).length,
  })),
  ...(readOnly.value ? [{ key: 'validated', label: t('gestion.tabs.validated'), count: filteredValidated.value.length }] : []),
])
const rows = computed(() => {
  if (activeGroup.value === 'validated') return filteredValidated.value
  return activeGroup.value === 'all'
    ? filteredQueue.value
    : filteredQueue.value.filter((l) => GROUPS[activeGroup.value]?.includes(l.status))
})

const page = ref(1)
const perPage = ref(20)
const lastPage = computed(() => Math.max(1, Math.ceil(rows.value.length / perPage.value)))
const pagedRows = computed(() => rows.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
watch([activeGroup, perPage, () => ({ ...filters })], () => { page.value = 1 })
watch(lastPage, (n) => { if (page.value > n) page.value = n })

/* ── Supervisor: his team's leads, read-only ───────────────── */
const readOnly = computed(() => !!stats.value?.read_only)
const validated = computed(() => stats.value?.validated ?? [])
const { canOpenLead } = useReportAccess()
const opensLead = (lead) => !readOnly.value || canOpenLead(lead.agent?.id)
function openLead(lead) {
  if (opensLead(lead)) router.push({ name: 'leads.detail', params: { id: lead.id } })
}
// Super admin: every team's leads, read-only
const overview = computed(() => !!stats.value?.overview)
const pageTitle = computed(() => {
  if (overview.value) return t('gestion.overview.title')
  return readOnly.value
    ? t('gestion.supervisor.title', { team: stats.value?.team?.name ?? '—' })
    : t('gestion.dashboardTitle')
})

/* ── What gestion has to do next on each lead ──────────────── */
function nextStep(lead) {
  const signed = lead.dvc_status === 'SIGNE'
  switch (lead.status) {
    case 'GESTION': return signed ? { text: t('gestion.next.review'), tone: 'info' } : { text: t('gestion.next.dvcMissing'), tone: 'warning' }
    case 'CALL2_OK': return { text: t('gestion.next.pdg'), tone: 'info' }
    case 'PDG_OK': return signed ? { text: t('gestion.next.validate'), tone: 'success' } : { text: t('gestion.next.dvcToValidate'), tone: 'warning' }
    case 'CALL2_KO': return { text: t('gestion.next.call2Again'), tone: 'danger' }
    case 'PDG_KO': return { text: t('gestion.next.pdgKo'), tone: 'danger' }
    case 'A_CORRIGER': return { text: t('gestion.next.waitingAgent'), tone: 'muted' }
    case 'SOUSCRIS': return { text: t('gestion.next.subscribed'), tone: 'muted' }
    default: return { text: '—', tone: 'muted' }
  }
}
const TONES = {
  info: 'text-gray-900',
  success: 'text-success-text font-medium',
  warning: 'text-warning-text',
  danger: 'text-danger-text font-medium',
  muted: 'text-gray-500',
}

/* ── Time in the current status (late after 48 h) ──────────── */
const now = Date.now()
function hoursIn(lead) {
  return lead.status_since ? (now - new Date(lead.status_since).getTime()) / 3600000 : 0
}
function since(lead) {
  const h = hoursIn(lead)
  if (h < 1) return t('gestion.since.minutes', { n: Math.max(1, Math.round(h * 60)) })
  if (h < 24) return t('gestion.since.hours', { n: Math.round(h) })
  return t('gestion.since.days', { n: Math.floor(h / 24) })
}

const fullName = (l) => [l.first_name, l.last_name].filter(Boolean).join(' ') || l.reference

const GRID_FULL = 'grid grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_110px_minmax(190px,1.3fr)_44px] items-center gap-x-4 px-5'
// Read-only: a « Gestionnaire » column instead of the call button
const GRID_READ = 'grid grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_110px_minmax(190px,1.3fr)] items-center gap-x-4 px-5'
const GRID = computed(() => (readOnly.value ? GRID_READ : GRID_FULL))
const GRID_VALIDATED = 'grid grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(110px,0.8fr)] items-center gap-x-4 px-5'
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1440px] mx-auto">
    <AppPageHeader :title="pageTitle" :subtitle="overview ? t('gestion.overview.subtitle') : readOnly ? t('gestion.supervisor.subtitle') : t('gestion.dashboardSubtitle')">
      <template #actions>
        <span v-if="readOnly" class="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-gray-100 text-[13px] text-gray-700">
          <Eye class="w-4 h-4 text-gray-500" />{{ t('gestion.supervisor.readOnly') }}
        </span>
        <button
          type="button"
          :disabled="store.loading"
          class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          @click="store.fetchDashboard()"
        ><RefreshCw :class="['w-4 h-4 text-gray-500', store.loading ? 'animate-spin' : '']" />{{ t('common.refresh') }}</button>
      </template>
    </AppPageHeader>

    <!-- KPI strip -->
    <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 xl:divide-y-0 xl:divide-x">
      <KpiStripCell :label="t('gestion.kpi.todo')" :value="num(stats?.backlog_count)" :hint="t('gestion.kpi.todoHint')" :loading="store.loading && !stats" />
      <KpiStripCell
        :label="t('gestion.kpi.control')"
        :value="num((stats?.awaiting_pdg_count ?? 0) + (stats?.pdg_ok_count ?? 0))"
        :hint="stats?.pdg_ok_count ? t('gestion.kpi.readyToValidate', { n: stats.pdg_ok_count }) : ''"
        hint-tone="success"
        :loading="store.loading && !stats"
      />
      <KpiStripCell
        :label="t('gestion.kpi.blocked')"
        :value="num(stats?.stuck_count)"
        :hint="stats ? t('gestion.kpi.blockedHint', { call2: stats.call2_ko_count ?? 0, pdg: stats.pdg_ko_count ?? 0 }) : ''"
        :hint-tone="stats?.stuck_count ? 'danger' : 'muted'"
        :loading="store.loading && !stats"
      />
      <KpiStripCell :label="t('gestion.kpi.waitingAgent')" :value="num(stats?.waiting_on_agent_count)" :hint="t('gestion.kpi.waitingAgentHint')" :loading="store.loading && !stats" />
      <KpiStripCell
        :label="t('gestion.kpi.validated')"
        :value="num(stats?.validated_this_week)"
        :hint="stats?.avg_hours_in_gestion != null ? t('gestion.avgHours', { hours: stats.avg_hours_in_gestion }) : ''"
        :loading="store.loading && !stats"
      />
    </section>

    <!-- Work queue -->
    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="px-5 pt-4 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200">
        <div class="pb-3">
          <h2 class="font-display text-base font-semibold text-gray-900">{{ activeGroup === 'validated' ? t('gestion.supervisor.validatedTitle') : t('gestion.queueTitle') }}</h2>
          <p class="text-[12.5px] text-gray-500 mt-0.5">{{ activeGroup === 'validated' ? t('gestion.supervisor.validatedSubtitle') : readOnly ? t('gestion.supervisor.queueSubtitle') : t('gestion.queueSubtitle') }}</p>
        </div>
        <div role="tablist" class="flex items-end gap-5 overflow-x-auto whitespace-nowrap">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            role="tab"
            :aria-selected="activeGroup === tab.key"
            :class="[
              'h-9.5 -mb-px px-0.5 border-b-2 text-[13px] flex items-center gap-1.5',
              activeGroup === tab.key ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900',
            ]"
            @click="activeGroup = tab.key"
          >
            {{ tab.label }}
            <span class="font-mono text-xs text-gray-500">{{ tab.count }}</span>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="px-5 py-3 flex flex-wrap items-center gap-2.5 border-b border-gray-200">
        <AppSelect v-model="filters.agent" :options="agentOptions" class="w-48" :aria-label="t('leads.filterAgent')" />
        <AppSelect v-if="overview" v-model="filters.team" :options="teamOptions" class="w-44" :aria-label="t('gestion.filters.team')" />
        <AppSelect v-model="filters.status" :options="statusOptions" class="w-48" :aria-label="t('leads.status')" />
        <AppSearchInput v-model="filters.q" :placeholder="t('gestion.filters.search')" class="flex-1 min-w-[220px]" />
        <button
          v-if="hasFilters"
          type="button"
          class="h-10 px-3 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          @click="resetFilters"
        >{{ t('gestion.filters.reset') }}</button>
      </div>

      <!-- Supervisor: his team's leads validated lately -->
      <div v-if="activeGroup === 'validated'" class="overflow-x-auto">
        <div class="min-w-[880px] text-[13px]" role="table" :aria-label="t('gestion.tabs.validated')">
          <div role="row" :class="[GRID_VALIDATED, 'h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
            <span role="columnheader">{{ t('leads.lead') }}</span>
            <span role="columnheader">{{ t('leads.filterAgent') }}</span>
            <span role="columnheader">{{ t('gestion.supervisor.gestionnaire') }}</span>
            <span role="columnheader">{{ t('gestion.supervisor.validatedAt') }}</span>
            <span role="columnheader">{{ t('leads.status') }}</span>
          </div>
          <div v-if="!rows.length" class="flex flex-col items-center gap-2 py-14 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><Inbox class="w-5 h-5" /></span>
            <p class="text-[13px] text-gray-600">{{ hasFilters ? t('gestion.filters.noMatch') : t('gestion.supervisor.validatedEmpty') }}</p>
          </div>
          <div
            v-for="lead in pagedRows"
            v-else
            :key="lead.id"
            role="row"
            :class="[GRID_VALIDATED, 'min-h-[52px] py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50', opensLead(lead) ? 'cursor-pointer' : '']"
            @click="openLead(lead)"
          >
            <div role="cell" class="flex items-center gap-2.5 min-w-0">
              <AppAvatar :name="fullName(lead)" size="sm" tone="soft" />
              <div class="min-w-0">
                <p :class="['font-medium text-gray-900 truncate', opensLead(lead) ? 'hover:text-primary' : '']">{{ fullName(lead) }}</p>
                <p class="text-xs text-gray-500 truncate">
                  {{ lead.insurance_type ? typeShort(lead.insurance_type) : '' }}
                  <span class="font-mono">· {{ lead.reference }}</span>
                </p>
              </div>
            </div>
            <span role="cell" class="min-w-0">
              <span class="block truncate">{{ lead.agent?.name ?? t('common.unassigned') }}</span>
              <span v-if="overview && lead.team" class="block text-xs text-gray-500 truncate">{{ lead.team.name }}</span>
            </span>
            <span role="cell" class="truncate text-gray-700">{{ lead.gestionnaire?.name ?? '—' }}</span>
            <span role="cell" class="font-mono text-[12.5px] text-gray-700">{{ formatDateTime(lead.validated_at) }}</span>
            <span role="cell"><LeadStatusBadge :status="lead.status" /></span>
          </div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <div class="min-w-[1080px] text-[13px]" role="table" :aria-label="t('gestion.queueTitle')">
          <div role="row" :class="[GRID, 'h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
            <span role="columnheader">{{ t('leads.lead') }}</span>
            <span role="columnheader">{{ t('leads.status') }}</span>
            <span role="columnheader">{{ t('leadDetail.dvc.label') }}</span>
            <span role="columnheader">{{ t('leads.filterAgent') }}</span>
            <span v-if="readOnly" role="columnheader">{{ t('gestion.supervisor.gestionnaire') }}</span>
            <span role="columnheader">{{ t('gestion.since.column') }}</span>
            <span role="columnheader">{{ t('gestion.next.column') }}</span>
            <span v-if="!readOnly" role="columnheader"><span class="sr-only">{{ t('common.actions') }}</span></span>
          </div>

          <template v-if="store.loading && !stats">
            <div v-for="n in 5" :key="n" :class="[GRID, 'h-[56px] border-b border-gray-100']">
              <AppSkeleton height="12px" width="70%" /><AppSkeleton height="20px" width="90px" /><AppSkeleton height="20px" width="90px" />
              <AppSkeleton height="10px" width="70%" /><AppSkeleton height="10px" width="50%" /><AppSkeleton height="10px" width="80%" /><span />
            </div>
          </template>

          <div v-else-if="!rows.length" class="flex flex-col items-center gap-2 py-14 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><Inbox class="w-5 h-5" /></span>
            <p class="text-[13px] text-gray-600">{{ hasFilters ? t('gestion.filters.noMatch') : activeGroup === 'all' ? t('gestion.queueEmpty') : t('gestion.queueEmptyTab') }}</p>
          </div>

          <template v-else>
            <div
              v-for="lead in pagedRows"
              :key="lead.id"
              role="row"
              :class="[GRID, 'min-h-[56px] py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50', opensLead(lead) ? 'cursor-pointer' : '']"
              @click="openLead(lead)"
            >
              <div role="cell" class="flex items-center gap-2.5 min-w-0">
                <AppAvatar :name="fullName(lead)" size="sm" tone="soft" />
                <div class="min-w-0">
                  <RouterLink
                    v-if="opensLead(lead)"
                    :to="{ name: 'leads.detail', params: { id: lead.id } }"
                    class="block font-medium text-gray-900 hover:text-primary truncate"
                    @click.stop
                  >{{ fullName(lead) }}</RouterLink>
                  <p v-else class="font-medium text-gray-900 truncate">{{ fullName(lead) }}</p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ lead.insurance_type ? typeShort(lead.insurance_type) : '' }}
                    <span class="font-mono">· {{ lead.reference }}</span>
                  </p>
                </div>
              </div>
              <span role="cell"><LeadStatusBadge :status="lead.status" /></span>
              <span role="cell"><DvcStatusBadge :status="lead.dvc_status ?? 'A_GENERER'" /></span>
              <span role="cell" class="min-w-0">
                <span v-if="lead.agent" class="flex items-center gap-2 min-w-0">
                  <AppAvatar :name="lead.agent.name" size="xs" />
                  <span class="min-w-0">
                    <span class="block truncate">{{ lead.agent.name }}</span>
                    <span v-if="overview && lead.team" class="block text-xs text-gray-500 truncate">{{ lead.team.name }}</span>
                  </span>
                </span>
                <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
              </span>
              <span v-if="readOnly" role="cell" class="truncate text-gray-700">{{ lead.gestionnaire?.name ?? '—' }}</span>
              <span
                role="cell"
                :title="formatDateTime(lead.status_since)"
                :class="['font-mono text-[12.5px]', hoursIn(lead) > 48 ? 'text-danger-text font-medium' : 'text-gray-700']"
              >{{ since(lead) }}</span>
              <span role="cell" :class="['text-[12.5px] truncate', TONES[nextStep(lead).tone]]">{{ nextStep(lead).text }}</span>
              <span v-if="!readOnly" role="cell" class="flex justify-end" @click.stop>
                <CallButton v-if="lead.phone && auth.can('CALLS_MAKE')" :lead="lead" />
                <a
                  v-else-if="lead.phone"
                  :href="`tel:${dialNumber(lead.phone)}`"
                  :aria-label="t('leads.callName', { name: fullName(lead) })"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                ><Phone class="w-3.5 h-3.5" /></a>
              </span>
            </div>
          </template>
        </div>
      </div>

      <div v-if="rows.length > 0" class="px-4 border-t border-gray-200">
        <AppPagination
          :current-page="page"
          :last-page="lastPage"
          :total="rows.length"
          :from="(page - 1) * perPage + 1"
          :to="Math.min(page * perPage, rows.length)"
          :per-page="perPage"
          :per-page-options="[20, 50, 100]"
          @page-change="page = $event"
          @per-page-change="perPage = $event"
        />
      </div>
    </section>
  </div>
</template>
