<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Download, CalendarDays } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useReportsStore } from '@/stores/reports.store'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import { teamsApi } from '@/api/teams'

/**
 * Frame shared by every report: title, report tabs, period filter,
 * page-specific filters (slot) and CSV export. Emits `refresh` when the
 * period changes so the page refetches its data.
 */
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  exporting: { type: Boolean, default: false },
  canExport: { type: Boolean, default: true },
  // Every report endpoint accepts team_id
  teamFilter: { type: Boolean, default: false },
})
const emit = defineEmits(['refresh', 'export'])

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const store = useReportsStore()

const canViewReports = computed(() => auth.can('REPORTS_VIEW_ALL') || auth.can('REPORTS_VIEW_TEAM'))
const canViewRevenue = computed(() =>
  auth.can('REVENUE_VIEW_ALL') || auth.can('REVENUE_VIEW_TEAM') || auth.can('REVENUE_VIEW_PERSONAL'),
)

const tabs = computed(() => [
  ...(canViewReports.value
    ? [
        { to: '/reports/leads', label: t('leads.title') },
        { to: '/reports/appointments', label: t('appointments.title') },
        { to: '/reports/teams', label: t('teams.title') },
        { to: '/reports/agents', label: t('reports.agents') },
        { to: '/reports/conversion', label: t('reports.conversion') },
      ]
    : []),
  ...(canViewRevenue.value ? [{ to: '/reports/revenue', label: t('revenue.title') }] : []),
])

/* ── Period ────────────────────────────────────────────────── */
function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const PRESETS = {
  '7d': () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), n.getDate() - 6), n] },
  '30d': () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29), n] },
  month: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n] },
  lastMonth: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)] },
  year: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n] },
}

const periodOptions = computed(() => [
  { value: '7d', label: t('reports.period.last7') },
  { value: '30d', label: t('reports.period.last30') },
  { value: 'month', label: t('reports.period.thisMonth') },
  { value: 'lastMonth', label: t('reports.period.lastMonth') },
  { value: 'year', label: t('reports.period.thisYear') },
  { value: 'custom', label: t('reports.period.custom') },
])

// Which preset matches the current from/to (or "custom" when dates were typed)
const customMode = ref(false)
const periodValue = computed(() => {
  const { from, to } = store.filters
  if (!from && !to) return customMode.value ? 'custom' : ''
  for (const [key, fn] of Object.entries(PRESETS)) {
    const [a, b] = fn()
    if (from === isoDay(a) && to === isoDay(b)) return key
  }
  return 'custom'
})

function setPeriod(key) {
  if (!key) {
    customMode.value = false
    store.filters.from = ''
    store.setFilter('to', '')
  } else if (key === 'custom') {
    customMode.value = true
    return
  } else {
    customMode.value = false
    const [a, b] = PRESETS[key]()
    store.filters.from = isoDay(a)
    store.setFilter('to', isoDay(b))
  }
  emit('refresh')
}

/* ── Team (only for people who see every team) ──────────────── */
const showTeamFilter = computed(() => props.teamFilter && (auth.can('REPORTS_VIEW_ALL') || auth.can('REVENUE_VIEW_ALL')))
const teamOptions = ref([])
onMounted(async () => {
  if (!showTeamFilter.value) return
  try {
    const res = await teamsApi.list({ per_page: 100 })
    teamOptions.value = (res?.data ?? []).map((tm) => ({ value: tm.id, label: tm.name }))
  } catch {
    teamOptions.value = []
  }
})
function setTeam(value) {
  store.setFilter('team_id', value)
  emit('refresh')
}

function setDate(key, value) {
  store.setFilter(key, value)
  emit('refresh')
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-[13px] text-gray-500">{{ t('nav.reports') }}</p>
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900 mt-0.5">{{ title }}</h1>
        <p v-if="subtitle" class="text-[13px] text-gray-500 mt-0.5">{{ subtitle }}</p>
      </div>
      <button
        v-if="canExport"
        type="button"
        :disabled="exporting"
        class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        @click="emit('export')"
      >
        <Download class="w-4 h-4" />
        {{ exporting ? t('common.loading') : t('reports.exportCsv') }}
      </button>
    </div>

    <nav v-if="tabs.length > 1" :aria-label="t('nav.reports')" class="flex items-end gap-6 border-b border-gray-200 overflow-x-auto">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        :aria-current="route.path === tab.to ? 'page' : undefined"
        :class="[
          'h-9.5 -mb-px px-0.5 border-b-2 text-[13.5px] whitespace-nowrap flex items-center',
          route.path === tab.to ? 'border-primary text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
      >{{ tab.label }}</RouterLink>
    </nav>

    <div class="flex flex-wrap items-center gap-2">
      <AppFilterChip
        :label="t('reports.period.label')"
        :model-value="periodValue"
        :options="periodOptions"
        :searchable="false"
        @update:model-value="setPeriod"
      />
      <template v-if="periodValue === 'custom'">
        <label class="h-9 flex items-center gap-2 px-2.5 rounded-lg border border-gray-300 bg-white text-gray-500">
          <CalendarDays class="w-4 h-4" />
          <span class="sr-only">{{ t('common.from') }}</span>
          <input
            type="date"
            :value="store.filters.from"
            class="bg-transparent outline-none font-mono text-[12.5px] text-gray-900"
            @change="setDate('from', $event.target.value)"
          >
        </label>
        <span class="text-gray-400">–</span>
        <label class="h-9 flex items-center gap-2 px-2.5 rounded-lg border border-gray-300 bg-white text-gray-500">
          <span class="sr-only">{{ t('common.to') }}</span>
          <input
            type="date"
            :value="store.filters.to"
            class="bg-transparent outline-none font-mono text-[12.5px] text-gray-900"
            @change="setDate('to', $event.target.value)"
          >
        </label>
      </template>
      <AppFilterChip
        v-if="showTeamFilter"
        :label="t('reports.teamCol')"
        :model-value="store.filters.team_id"
        :options="teamOptions"
        @update:model-value="setTeam"
      />
      <slot name="filters" />
    </div>

    <slot />
  </div>
</template>
