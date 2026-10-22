<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, CalendarDays, Download, FileSpreadsheet, ArrowDown, ArrowUp } from 'lucide-vue-next'
import { leadExportsApi } from '@/api/leadExports'
import { useToast } from '@/composables/useToast'
import { useLeadStatuses } from '@/composables/useLeadStatuses'
import { LEAD_STAGES } from '@/utils/enums'
import { formatDateTime, formatNumber } from '@/utils/formatters'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'

/**
 * Super admin: the imported leads (Google Sheets, files) of a week, a month
 * or a range, with their current status — counters and a preview here, the
 * whole list in the Excel file. The API cuts weeks and months on French time.
 */
const { t } = useI18n()
const toast = useToast()
const { statusStage } = useLeadStatuses()

const PERIODS = ['week', 'month', 'custom']
const ORIGINS = ['all', 'google_sheets', 'file']

function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const today = new Date()
const period = ref('month')
const anchor = ref(isoDay(today)) // any day inside the week / month shown
const from = ref(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)))
const to = ref(isoDay(today))
const origin = ref('all')

const params = computed(() =>
  period.value === 'custom'
    ? { period: 'custom', from: from.value, to: to.value, origin: origin.value }
    : { period: period.value, date: anchor.value, origin: origin.value },
)

/* ── Summary ───────────────────────────────────────────────── */
const summary = ref(null)
const loading = ref(false)
const failed = ref(false)
let generation = 0

async function load() {
  if (period.value === 'custom' && (!from.value || !to.value || from.value > to.value)) return
  const gen = ++generation
  loading.value = true
  failed.value = false
  try {
    const { data } = await leadExportsApi.importedSummary(params.value)
    if (gen === generation) summary.value = data
  } catch {
    if (gen === generation) failed.value = true
  } finally {
    if (gen === generation) loading.value = false
  }
}

watch(params, load)
onMounted(load)

function shift(step) {
  const [y, m, d] = anchor.value.split('-').map(Number)
  const next = period.value === 'week' ? new Date(y, m - 1, d + 7 * step) : new Date(y, m - 1 + step, 1)
  anchor.value = isoDay(next)
}

const maxStatus = computed(() => Math.max(1, ...(summary.value?.statuses ?? []).map((s) => s.count)))
const barClass = (code) => LEAD_STAGES[statusStage(code)]?.dot ?? 'bg-gray-400'
const pct = (part, total) => (total ? `${(Math.round((part / total) * 1000) / 10).toLocaleString('fr-FR')} %` : '')

/* ── Download ──────────────────────────────────────────────── */
const downloading = ref(false)

async function download() {
  if (!summary.value || downloading.value) return
  downloading.value = true
  try {
    const blob = await leadExportsApi.importedDownload(params.value)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = summary.value.file_name
    a.click()
    URL.revokeObjectURL(url)
    toast.showSuccess(t('importedExport.downloaded'))
  } catch {
    toast.showError(t('importedExport.downloadError'))
  } finally {
    downloading.value = false
  }
}

const kpis = computed(() => {
  const s = summary.value
  return [
    { key: 'total', value: s?.total },
    { key: 'validated', value: s?.validated, hint: pct(s?.validated, s?.total), tone: 'text-success-text' },
    { key: 'unassigned', value: s?.unassigned },
    { key: 'doublons', value: s?.doublons },
  ]
})

/* ── Per agent, per source, per insurance ──────────────────── */
// Agent row split: untouched = still « Nouveau », in progress = contact / follow-up / quote
const SEGMENTS = [
  { key: 'untouched', dot: LEAD_STAGES.new.dot },
  { key: 'in_progress', dot: LEAD_STAGES.follow_up.dot },
  { key: 'validated', dot: LEAD_STAGES.won.dot },
  { key: 'lost', dot: LEAD_STAGES.lost.dot },
]
const AGENT_COLUMNS = ['name', 'received', 'untouched', 'in_progress', 'validated', 'lost', 'conversion']

const sortKey = ref('received')
const sortDesc = ref(true)
function sortBy(col) {
  if (sortKey.value === col) sortDesc.value = !sortDesc.value
  else {
    sortKey.value = col
    sortDesc.value = col !== 'name'
  }
}

// Unassigned leads always stay last, whatever the sort
const sortedAgents = computed(() => {
  const rows = [...(summary.value?.agents ?? [])]
  const dir = sortDesc.value ? -1 : 1
  const value = (r) => (sortKey.value === 'name' ? (r.name ?? '').toLowerCase() : r[sortKey.value])
  return rows.sort((a, b) => {
    if (!a.agent_id !== !b.agent_id) return a.agent_id ? -1 : 1
    const [x, y] = [value(a), value(b)]
    return x < y ? -dir : x > y ? dir : 0
  })
})

const totals = computed(() =>
  (summary.value?.agents ?? []).reduce(
    (sum, a) => {
      for (const k of Object.keys(sum)) sum[k] += a[k]
      return sum
    },
    { received: 0, untouched: 0, in_progress: 0, validated: 0, lost: 0 },
  ),
)

const GROUP_BLOCKS = [
  { key: 'sources', id: 'source_id', label: (g) => g.name ?? t('common.noSource') },
  { key: 'insurances', id: 'code', label: (g) => (g.code ? t('insuranceTypes.' + g.code, g.label ?? g.code) : t('importedExport.insurances.none')) },
]
const maxOf = (key) => Math.max(1, ...(summary.value?.[key] ?? []).map((g) => g.received))
const rate = (value) => `${(Math.round((value ?? 0) * 10) / 10).toLocaleString('fr-FR')} %`

const card = 'bg-white border border-gray-200 rounded-xl px-5 py-4'
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <nav class="flex items-center gap-1.5 text-[13px] text-gray-500">
      <span>{{ t('nav.reports') }}</span>
      <ChevronRight class="w-3.5 h-3.5" />
      <span class="text-gray-900">{{ t('importedExport.title') }}</span>
      <span class="ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-light text-primary-hover">{{ t('importedExport.superAdmin') }}</span>
    </nav>

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('importedExport.title') }}</h1>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ t('importedExport.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="h-9 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
        :disabled="!summary || loading || downloading"
        @click="download"
      >
        <Download class="w-4 h-4" />
        {{ downloading ? t('importedExport.downloading') : t('importedExport.download', { n: formatNumber(summary?.total ?? 0) }) }}
      </button>
    </div>

    <!-- Period and origin -->
    <section :class="[card, 'flex flex-col gap-3.5']">
      <div class="flex flex-wrap items-center gap-4">
        <div role="radiogroup" class="inline-flex gap-0.5 p-[3px] rounded-[9px] bg-gray-100">
          <button
            v-for="p in PERIODS"
            :key="p"
            type="button"
            role="radio"
            :aria-checked="period === p"
            :class="[
              'h-8 px-3.5 rounded-[7px] text-[13px] transition-colors',
              period === p ? 'bg-white text-gray-900 font-medium shadow-[0_1px_2px_rgba(17,24,39,0.08)]' : 'text-gray-600 hover:text-gray-900',
            ]"
            @click="period = p"
          >{{ t('importedExport.period.' + p) }}</button>
        </div>

        <div v-if="period !== 'custom'" class="flex items-center gap-1.5">
          <button
            type="button"
            class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            :aria-label="t('importedExport.period.previous')"
            @click="shift(-1)"
          ><ChevronLeft class="w-4 h-4" /></button>
          <span class="min-w-[250px] text-center text-sm font-medium text-gray-900 flex items-center justify-center gap-2">
            <CalendarDays class="w-4 h-4 text-gray-500" />
            <AppSkeleton v-if="!summary" height="16px" width="160px" />
            <template v-else>{{ summary.label }}</template>
          </span>
          <button
            type="button"
            class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            :aria-label="t('importedExport.period.next')"
            @click="shift(1)"
          ><ChevronRight class="w-4 h-4" /></button>
        </div>

        <div v-else class="flex items-center gap-2 text-[13px] text-gray-600">
          <label class="flex items-center gap-1.5">{{ t('importedExport.period.from') }}
            <input v-model="from" type="date" :max="to" class="h-8 px-2 rounded-lg border border-gray-300 text-gray-900">
          </label>
          <label class="flex items-center gap-1.5">{{ t('importedExport.period.to') }}
            <input v-model="to" type="date" :min="from" class="h-8 px-2 rounded-lg border border-gray-300 text-gray-900">
          </label>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[12.5px] text-gray-600 mr-1">{{ t('importedExport.origin.label') }}</span>
        <button
          v-for="o in ORIGINS"
          :key="o"
          type="button"
          :class="[
            'h-7 px-3 rounded-full border text-[12.5px] transition-colors',
            origin === o ? 'bg-primary-light border-primary-soft text-primary-hover font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50',
          ]"
          @click="origin = o"
        >{{ t('importedExport.origin.' + o) }}</button>
        <span class="ml-auto text-xs text-gray-500">{{ t('importedExport.dateBasis') }}</span>
      </div>
    </section>

    <p v-if="failed" class="text-sm text-danger-text">
      {{ t('importedExport.loadError') }}
      <button class="ml-1 font-medium text-primary hover:underline" @click="load">{{ t('common.retry') }}</button>
    </p>

    <!-- Counters -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div v-for="k in kpis" :key="k.key" class="bg-gray-50 rounded-lg px-4 py-3">
        <p class="text-[12.5px] text-gray-600">{{ t('importedExport.kpi.' + k.key) }}</p>
        <AppSkeleton v-if="!summary" height="28px" width="70px" class="mt-1" />
        <p v-else class="font-mono text-2xl font-medium text-gray-900">
          {{ formatNumber(k.value ?? 0) }}
          <span v-if="k.hint" :class="['text-[13px]', k.tone]">{{ k.hint }}</span>
        </p>
      </div>
    </section>

    <div :class="['grid grid-cols-1 xl:grid-cols-5 gap-4 transition-opacity', loading && summary ? 'opacity-60' : '']">
      <!-- Breakdown by current status -->
      <section :class="[card, 'xl:col-span-2']">
        <h2 class="font-display text-[15px] font-semibold text-gray-900 mb-3">{{ t('importedExport.byStatus') }}</h2>
        <div v-if="!summary" class="space-y-2.5">
          <AppSkeleton v-for="n in 5" :key="n" height="14px" />
        </div>
        <p v-else-if="!summary.total" class="text-sm text-gray-500">{{ t('importedExport.empty') }}</p>
        <div v-else class="flex flex-col gap-2">
          <div v-for="s in summary.statuses" :key="s.code" class="grid grid-cols-[150px_minmax(0,1fr)_48px] items-center gap-3 text-[13px]">
            <span class="truncate text-gray-700" :title="s.label">{{ s.label }}</span>
            <span class="h-2 rounded bg-gray-100 overflow-hidden">
              <span :class="['block h-full rounded', barClass(s.code)]" :style="{ width: `${(s.count / maxStatus) * 100}%` }" />
            </span>
            <span class="text-right font-mono text-gray-900">{{ formatNumber(s.count) }}</span>
          </div>
        </div>
      </section>

      <!-- Preview -->
      <section :class="[card, 'xl:col-span-3 min-w-0']">
        <div class="flex items-baseline justify-between gap-3 mb-2">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('importedExport.preview') }}</h2>
          <span class="text-xs text-gray-500">{{ t('importedExport.previewHint', { n: summary?.preview?.length ?? 10 }) }}</span>
        </div>
        <div v-if="!summary" class="space-y-2.5">
          <AppSkeleton v-for="n in 5" :key="n" height="20px" />
        </div>
        <p v-else-if="!summary.preview.length" class="text-sm text-gray-500 py-4">{{ t('importedExport.empty') }}</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="text-left text-[12px] text-gray-500 border-b border-gray-100">
                <th class="py-2 pr-3 font-medium">{{ t('importedExport.colReceived') }}</th>
                <th class="py-2 pr-3 font-medium">{{ t('importedExport.colLead') }}</th>
                <th class="py-2 pr-3 font-medium">{{ t('importedExport.colOrigin') }}</th>
                <th class="py-2 pr-3 font-medium">{{ t('importedExport.colStatus') }}</th>
                <th class="py-2 pr-3 font-medium">{{ t('importedExport.colAgent') }}</th>
                <th class="py-2 font-medium">{{ t('importedExport.colType') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in summary.preview" :key="r.id" class="border-b border-gray-100 last:border-b-0">
                <td class="py-2 pr-3 font-mono text-[12.5px] whitespace-nowrap">{{ formatDateTime(r.received_at) }}</td>
                <td class="py-2 pr-3 max-w-[180px] truncate">
                  <RouterLink :to="{ name: 'leads.detail', params: { id: r.id } }" class="font-medium text-gray-900 hover:text-primary">{{ r.name || r.reference }}</RouterLink>
                </td>
                <td class="py-2 pr-3 max-w-[160px] truncate text-gray-600" :title="r.origin">{{ r.origin }}</td>
                <td class="py-2 pr-3"><LeadStatusBadge :status="r.status" /></td>
                <td class="py-2 pr-3 whitespace-nowrap" :class="r.agent ? 'text-gray-900' : 'text-gray-500'">{{ r.agent ?? t('common.unassigned') }}</td>
                <td class="py-2 whitespace-nowrap text-gray-600">{{ r.insurance_type ? t('insuranceTypesShort.' + r.insurance_type, r.insurance_type) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Per agent -->
    <section :class="[card, 'transition-opacity', loading && summary ? 'opacity-60' : '']">
      <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 class="font-display text-[15px] font-semibold text-gray-900">
          {{ t('importedExport.agents.title') }}<template v-if="summary"> · {{ summary.label }}</template>
        </h2>
        <span class="text-xs text-gray-500">{{ t('importedExport.agents.hint') }}</span>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-gray-600 mb-2">
        <span v-for="seg in SEGMENTS" :key="seg.key" class="flex items-center gap-1.5">
          <span :class="['w-2.5 h-2.5 rounded-sm', seg.dot]" />{{ t('importedExport.agents.' + seg.key) }}
        </span>
      </div>
      <div v-if="!summary" class="space-y-2.5">
        <AppSkeleton v-for="n in 4" :key="n" height="20px" />
      </div>
      <p v-else-if="!summary.total" class="text-sm text-gray-500 py-2">{{ t('importedExport.empty') }}</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="text-[12px] text-gray-500 border-b border-gray-100">
              <th
                v-for="col in AGENT_COLUMNS"
                :key="col"
                :class="['py-2 px-2 font-medium whitespace-nowrap select-none cursor-pointer hover:text-gray-900', col === 'name' ? 'text-left' : 'text-right']"
                :aria-sort="sortKey === col ? (sortDesc ? 'descending' : 'ascending') : 'none'"
                @click="sortBy(col)"
              >
                {{ t('importedExport.agents.' + col) }}
                <component :is="sortDesc ? ArrowDown : ArrowUp" v-if="sortKey === col" class="inline w-3 h-3 -mt-0.5" />
              </th>
              <th class="py-2 px-2 font-medium text-left w-[24%]">{{ t('importedExport.agents.split') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in sortedAgents" :key="a.agent_id ?? 'none'" class="border-b border-gray-100">
              <td class="py-2 px-2 max-w-[200px]">
                <p :class="['truncate', a.agent_id ? 'font-medium text-gray-900' : 'text-gray-500']">{{ a.name ?? t('common.unassigned') }}</p>
                <p v-if="a.team" class="text-[11.5px] text-gray-500 truncate">{{ a.team }}</p>
              </td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(a.received) }}</td>
              <td :class="['py-2 px-2 text-right font-mono', a.agent_id && a.received && a.untouched / a.received >= 0.5 ? 'text-danger-text' : '']">{{ formatNumber(a.untouched) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(a.in_progress) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(a.validated) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(a.lost) }}</td>
              <td class="py-2 px-2 text-right font-mono whitespace-nowrap">{{ a.agent_id ? rate(a.conversion) : '—' }}</td>
              <td class="py-2 px-2">
                <span class="flex h-2 rounded overflow-hidden bg-gray-100">
                  <span v-for="seg in SEGMENTS" :key="seg.key" :class="seg.dot" :style="{ width: `${(a[seg.key] / (a.received || 1)) * 100}%` }" />
                </span>
              </td>
            </tr>
            <tr class="font-medium text-gray-900">
              <td class="py-2 px-2">{{ t('importedExport.agents.total') }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(totals.received) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(totals.untouched) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(totals.in_progress) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(totals.validated) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ formatNumber(totals.lost) }}</td>
              <td class="py-2 px-2 text-right font-mono">{{ rate(totals.received ? (totals.validated / totals.received) * 100 : 0) }}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Per source / per insurance -->
    <div :class="['grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity', loading && summary ? 'opacity-60' : '']">
      <section v-for="block in GROUP_BLOCKS" :key="block.key" :class="card">
        <h2 class="font-display text-[15px] font-semibold text-gray-900 mb-2">{{ t('importedExport.' + block.key + '.title') }}</h2>
        <div v-if="!summary" class="space-y-2.5">
          <AppSkeleton v-for="n in 3" :key="n" height="16px" />
        </div>
        <p v-else-if="!summary[block.key].length" class="text-sm text-gray-500">{{ t('importedExport.empty') }}</p>
        <div v-else class="flex flex-col">
          <div class="grid grid-cols-[minmax(0,1fr)_64px_72px] gap-3 text-[12px] text-gray-500 pb-1.5 border-b border-gray-100">
            <span />
            <span class="text-right">{{ t('importedExport.groups.leads') }}</span>
            <span class="text-right">{{ t('importedExport.groups.conversion') }}</span>
          </div>
          <div
            v-for="g in summary[block.key]"
            :key="g[block.id] ?? 'none'"
            class="grid grid-cols-[minmax(0,1fr)_64px_72px] gap-3 items-center text-[13px] py-1.5 border-b border-gray-100 last:border-b-0"
          >
            <span class="flex flex-col gap-1 min-w-0">
              <span class="truncate text-gray-900">{{ block.label(g) }}</span>
              <span class="h-1.5 rounded bg-gray-100 overflow-hidden">
                <span class="block h-full rounded bg-primary-soft" :style="{ width: `${(g.received / maxOf(block.key)) * 100}%` }" />
              </span>
            </span>
            <span class="text-right font-mono">{{ formatNumber(g.received) }}</span>
            <span class="text-right font-mono">{{ rate(g.conversion) }}</span>
          </div>
        </div>
      </section>
    </div>

    <p class="flex items-center gap-2 text-[12.5px] text-gray-500">
      <FileSpreadsheet class="w-4 h-4" />
      <span class="font-mono">{{ summary?.file_name }}</span>
      <span>· {{ t('importedExport.fileSheets') }}</span>
    </p>
  </div>
</template>
