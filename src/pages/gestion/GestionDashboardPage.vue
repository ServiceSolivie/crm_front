<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Phone, RefreshCw, Inbox } from 'lucide-vue-next'
import { useGestionDashboardStore } from '@/stores/gestionDashboard.store'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import KpiStripCell from '@/components/modules/dashboard/KpiStripCell.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'
import DvcStatusBadge from '@/components/modules/leads/DvcStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters'

/**
 * Gestion's workspace: headline figures, then every lead currently with
 * this gestion user — oldest in its status first — with the next step.
 */
const { t, locale } = useI18n()
const router = useRouter()
const store = useGestionDashboardStore()

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
}
const activeGroup = ref('all')
const tabs = computed(() => [
  { key: 'all', label: t('gestion.tabs.all'), count: queue.value.length },
  ...Object.entries(GROUPS).map(([key, statuses]) => ({
    key,
    label: t('gestion.tabs.' + key),
    count: queue.value.filter((l) => statuses.includes(l.status)).length,
  })),
])
const rows = computed(() =>
  activeGroup.value === 'all' ? queue.value : queue.value.filter((l) => GROUPS[activeGroup.value].includes(l.status)),
)

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

const GRID = 'grid grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_110px_minmax(190px,1.3fr)_44px] items-center gap-x-4 px-5'
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('gestion.dashboardTitle')" :subtitle="t('gestion.dashboardSubtitle')">
      <template #actions>
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
          <h2 class="font-display text-base font-semibold text-gray-900">{{ t('gestion.queueTitle') }}</h2>
          <p class="text-[12.5px] text-gray-500 mt-0.5">{{ t('gestion.queueSubtitle') }}</p>
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

      <div class="overflow-x-auto">
        <div class="min-w-[1080px] text-[13px]" role="table" :aria-label="t('gestion.queueTitle')">
          <div role="row" :class="[GRID, 'h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
            <span role="columnheader">{{ t('leads.lead') }}</span>
            <span role="columnheader">{{ t('leads.status') }}</span>
            <span role="columnheader">{{ t('leadDetail.dvc.label') }}</span>
            <span role="columnheader">{{ t('leads.filterAgent') }}</span>
            <span role="columnheader">{{ t('gestion.since.column') }}</span>
            <span role="columnheader">{{ t('gestion.next.column') }}</span>
            <span role="columnheader"><span class="sr-only">{{ t('common.actions') }}</span></span>
          </div>

          <template v-if="store.loading && !stats">
            <div v-for="n in 5" :key="n" :class="[GRID, 'h-[56px] border-b border-gray-100']">
              <AppSkeleton height="12px" width="70%" /><AppSkeleton height="20px" width="90px" /><AppSkeleton height="20px" width="90px" />
              <AppSkeleton height="10px" width="70%" /><AppSkeleton height="10px" width="50%" /><AppSkeleton height="10px" width="80%" /><span />
            </div>
          </template>

          <div v-else-if="!rows.length" class="flex flex-col items-center gap-2 py-14 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><Inbox class="w-5 h-5" /></span>
            <p class="text-[13px] text-gray-600">{{ activeGroup === 'all' ? t('gestion.queueEmpty') : t('gestion.queueEmptyTab') }}</p>
          </div>

          <template v-else>
            <div
              v-for="lead in rows"
              :key="lead.id"
              role="row"
              :class="[GRID, 'min-h-[56px] py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer']"
              @click="router.push({ name: 'leads.detail', params: { id: lead.id } })"
            >
              <div role="cell" class="flex items-center gap-2.5 min-w-0">
                <AppAvatar :name="fullName(lead)" size="sm" tone="soft" />
                <div class="min-w-0">
                  <RouterLink
                    :to="{ name: 'leads.detail', params: { id: lead.id } }"
                    class="block font-medium text-gray-900 hover:text-primary truncate"
                    @click.stop
                  >{{ fullName(lead) }}</RouterLink>
                  <p class="text-xs text-gray-500 truncate">
                    {{ lead.insurance_type ? t('insuranceTypesShort.' + lead.insurance_type, lead.insurance_type) : '' }}
                    <span class="font-mono">· {{ lead.reference }}</span>
                  </p>
                </div>
              </div>
              <span role="cell"><LeadStatusBadge :status="lead.status" /></span>
              <span role="cell"><DvcStatusBadge :status="lead.dvc_status ?? 'A_GENERER'" /></span>
              <span role="cell" class="min-w-0">
                <span v-if="lead.agent" class="flex items-center gap-2 min-w-0">
                  <AppAvatar :name="lead.agent.name" size="xs" />
                  <span class="truncate">{{ lead.agent.name }}</span>
                </span>
                <span v-else class="text-gray-500">{{ t('common.unassigned') }}</span>
              </span>
              <span
                role="cell"
                :title="formatDateTime(lead.status_since)"
                :class="['font-mono text-[12.5px]', hoursIn(lead) > 48 ? 'text-danger-text font-medium' : 'text-gray-700']"
              >{{ since(lead) }}</span>
              <span role="cell" :class="['text-[12.5px] truncate', TONES[nextStep(lead).tone]]">{{ nextStep(lead).text }}</span>
              <span role="cell" class="flex justify-end" @click.stop>
                <a
                  v-if="lead.phone"
                  :href="`tel:${lead.phone}`"
                  :aria-label="t('leads.callName', { name: fullName(lead) })"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                ><Phone class="w-3.5 h-3.5" /></a>
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
