<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, ChevronDown, ChevronRight, Download, TrendingDown, TrendingUp, X } from 'lucide-vue-next'
import { reportsApi } from '@/api/reports'
import { useReportsStore } from '@/stores/reports.store'
import { useInsuranceTypes } from '@/composables/useInsuranceTypes'
import { useReportFormat } from '@/composables/useReportFormat'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppErrorState from '@/components/base/AppErrorState.vue'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'

/**
 * « CA par agent »: how much one agent brought in, in three tabs:
 *   - overview: headline figures, month by month, rank in the team;
 *   - paid clients: every client who paid him, grouped by month;
 *   - to follow up: his validated clients still owing money.
 */
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useReportsStore()
const { typeShort, typeLabel } = useInsuranceTypes()
const { num, pct, money } = useReportFormat()

const data = ref(null)
const loading = ref(false)
const error = ref(null)
const agentId = ref(route.query.agent ? Number(route.query.agent) : null)

const TABS = ['overview', 'clients', 'followUp']
const tab = ref(TABS.includes(route.query.tab) ? route.query.tab : 'overview')

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await reportsApi.agentRevenue({
      agent_id: agentId.value || undefined,
      from: store.filters.from || undefined,
      to: store.filters.to || undefined,
    })
    data.value = res?.data ?? res
    agentId.value = data.value?.agent?.id ?? null
    resetLists()
  } catch (e) {
    error.value = e?.response?.data?.message ?? t('revenueByAgent.loadError')
  } finally {
    loading.value = false
  }
}

function pickAgent(id) {
  agentId.value = id ? Number(id) : null
  router.replace({ query: { ...route.query, agent: agentId.value || undefined } })
  load()
}

function pickTab(key) {
  tab.value = key
  router.replace({ query: { ...route.query, tab: key === 'overview' ? undefined : key } })
}

// Opening the page from another agent's link (Rapports → Agents)
watch(() => route.query.agent, (v) => {
  const id = v ? Number(v) : null
  if (id && id !== agentId.value) { agentId.value = id; load() }
})

const agentOptions = computed(() =>
  (data.value?.agents ?? []).map((a) => ({ value: a.id, label: a.name })),
)

/* ── Formatting ────────────────────────────────────────────── */
const dateFr = (d) => (d ? d.split('-').reverse().join('/') : '—')
const dayMonth = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '')
const monthLabel = (key, style = 'short') => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' })
}
const daysSince = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000)) : null)

const PAYMENT_TONE = {
  PAYE: 'bg-success-bg text-success-text',
  PARTIELLEMENT_PAYE: 'bg-warning-bg text-warning-text',
  NON_PAYE: 'bg-danger-bg text-danger-text',
  EN_ATTENTE: 'bg-info-bg text-info-text',
}

/* ── Overview ──────────────────────────────────────────────── */
const k = computed(() => data.value?.kpis ?? {})
const receivedDelta = computed(() => {
  const prev = Number(k.value.previous_received ?? 0)
  if (!prev) return null
  return Math.round(((Number(k.value.received ?? 0) - prev) / prev) * 100)
})
const kpis = computed(() => [
  {
    label: t('revenueByAgent.received'),
    value: money(k.value.received),
    tone: 'success',
    hint: receivedDelta.value === null ? t('revenueByAgent.receivedHint') : t('revenueByAgent.vsPrevious', { n: (receivedDelta.value > 0 ? '+' : '') + receivedDelta.value }),
  },
  { label: t('revenueByAgent.expected'), value: money(k.value.expected), hint: t('revenueByAgent.onValidated', { n: num(k.value.validated_leads ?? 0) }) },
  { label: t('revenueByAgent.remaining'), value: money(k.value.remaining), tone: k.value.remaining > 0 ? 'warning' : undefined, hint: t('revenueByAgent.clientsOwing', { n: num(k.value.clients_owing ?? 0) }) },
  { label: t('revenueByAgent.collectionRate'), value: pct(k.value.collection_rate), hint: t('revenueByAgent.averageBasket', { v: money(k.value.average_basket) }) },
])

const months = computed(() => data.value?.months ?? [])
const chartMax = computed(() => Math.max(1, ...months.value.map((m) => Math.max(m.received, m.expected))))
const barHeight = (v) => `${Math.max(v > 0 ? 2 : 0, Math.round((v / chartMax.value) * 100))}%`

const allMonths = ref(false)
const monthsDesc = computed(() => [...months.value].reverse())
const monthsShown = computed(() => (allMonths.value ? monthsDesc.value : monthsDesc.value.slice(0, 4)))
const totals = computed(() => months.value.reduce((s, m) => ({
  leads: s.leads + m.leads,
  validated: s.validated + m.validated,
  expected: s.expected + m.expected,
  received: s.received + m.received,
  remaining: s.remaining + m.remaining,
}), { leads: 0, validated: 0, expected: 0, received: 0, remaining: 0 }))

const ranking = computed(() => data.value?.ranking ?? null)
const rank = computed(() => {
  const i = (ranking.value ?? []).findIndex((r) => r.id === data.value?.agent?.id)
  return i >= 0 && ranking.value.length > 1 ? i + 1 : null
})

// A bar of the chart opens the clients of that month
function openMonth(key) {
  clientFilters.month = key
  pickTab('clients')
}

/* ── Paid clients ──────────────────────────────────────────── */
const GROUP_SIZE = 10
const clientFilters = reactive({ q: '', type: '', sort: 'recent', month: null })
const openGroups = ref(new Set())
const expandedGroups = ref(new Set())

function resetLists() {
  const latest = (data.value?.clients ?? [])[0]?.month
  openGroups.value = new Set(latest ? [latest] : [])
  expandedGroups.value = new Set()
  followLimit.value = FOLLOW_PAGE
}

const clients = computed(() => data.value?.clients ?? [])
const match = (c, q) => !q || c.name.toLowerCase().includes(q) || (c.reference ?? '').toLowerCase().includes(q)

const filteredClients = computed(() => {
  const q = clientFilters.q.trim().toLowerCase()
  return clients.value.filter((c) =>
    match(c, q)
    && (!clientFilters.type || c.insurance_type === clientFilters.type)
    && (!clientFilters.month || c.month === clientFilters.month))
})
const clientsFiltered = computed(() => !!(clientFilters.q.trim() || clientFilters.type || clientFilters.month))

const SORTS = {
  recent: (a, b) => b.last_payment_date.localeCompare(a.last_payment_date),
  amount: (a, b) => b.received - a.received,
  name: (a, b) => a.name.localeCompare(b.name),
}
const clientGroups = computed(() => {
  const groups = new Map()
  for (const c of filteredClients.value) {
    if (!groups.has(c.month)) groups.set(c.month, [])
    groups.get(c.month).push(c)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, rows]) => ({
      month,
      rows: [...rows].sort(SORTS[clientFilters.sort] ?? SORTS.recent),
      total: rows.reduce((s, c) => s + c.received, 0),
    }))
})
const isOpen = (month) => clientsFiltered.value || openGroups.value.has(month)
function toggleGroup(month) {
  const s = new Set(openGroups.value)
  s.has(month) ? s.delete(month) : s.add(month)
  openGroups.value = s
}
function expandGroup(month) {
  expandedGroups.value = new Set([...expandedGroups.value, month])
}
const visibleRows = (g) => (expandedGroups.value.has(g.month) ? g.rows : g.rows.slice(0, GROUP_SIZE))

const clientsSummary = computed(() => {
  const unique = new Set(filteredClients.value.map((c) => c.id)).size
  const total = filteredClients.value.reduce((s, c) => s + c.received, 0)
  return { unique, total, average: unique ? total / unique : null }
})
const uniqueClients = computed(() => new Set(clients.value.map((c) => c.id)).size)

const typeOptions = computed(() =>
  [...new Set(clients.value.map((c) => c.insurance_type).filter(Boolean))].map((code) => ({ value: code, label: typeLabel(code) })),
)
const sortOptions = computed(() => [
  { value: 'recent', label: t('revenueByAgent.sortRecent') },
  { value: 'amount', label: t('revenueByAgent.sortAmount') },
  { value: 'name', label: t('revenueByAgent.sortName') },
])

/* ── To follow up ──────────────────────────────────────────── */
const FOLLOW_PAGE = 20
const followQ = ref('')
const followLimit = ref(FOLLOW_PAGE)
const followUp = computed(() => data.value?.to_follow_up ?? [])
const filteredFollow = computed(() => {
  const q = followQ.value.trim().toLowerCase()
  return followUp.value.filter((c) => match(c, q))
})
const followSummary = computed(() => ({
  count: followUp.value.length,
  due: followUp.value.reduce((s, c) => s + c.remaining, 0),
  oldest: followUp.value.reduce((max, c) => Math.max(max, daysSince(c.validated_at) ?? 0), 0),
}))

/* ── CSV: follows the open tab ─────────────────────────────── */
function exportCsv() {
  const name = (data.value?.agent?.name ?? 'agent').replace(/\s+/g, '-').toLowerCase()
  if (tab.value === 'clients') {
    store.exportCsv(filteredClients.value, [
      { key: 'month', label: 'Mois', value: (r) => monthLabel(r.month, 'long') },
      { key: 'name', label: 'Client' },
      { key: 'reference', label: 'Référence' },
      { key: 'insurance_type', label: 'Type', value: (r) => typeLabel(r.insurance_type) },
      { key: 'last_payment_date', label: 'Dernier paiement', value: (r) => dateFr(r.last_payment_date) },
      { key: 'received', label: 'Encaissé' },
      { key: 'expected', label: 'CA attendu' },
      { key: 'remaining', label: 'Reste' },
      { key: 'payment_status_label', label: 'Statut' },
    ], `clients-encaisses-${name}.csv`)
    return
  }
  if (tab.value === 'followUp') {
    store.exportCsv(filteredFollow.value, [
      { key: 'name', label: 'Client' },
      { key: 'reference', label: 'Référence' },
      { key: 'insurance_type', label: 'Type', value: (r) => typeLabel(r.insurance_type) },
      { key: 'validated_at', label: 'Validé le', value: (r) => dateFr(r.validated_at) },
      { key: 'received', label: 'Payé' },
      { key: 'expected', label: 'CA attendu' },
      { key: 'remaining', label: 'Reste' },
      { key: 'payment_status_label', label: 'Statut' },
    ], `a-relancer-${name}.csv`)
    return
  }
  store.exportCsv(months.value, [
    { key: 'month', label: 'Mois', value: (r) => monthLabel(r.month, 'long') },
    { key: 'leads', label: 'Leads reçus' },
    { key: 'validated', label: 'Validés' },
    { key: 'conversion_rate', label: 'Conversion %' },
    { key: 'expected', label: 'CA attendu' },
    { key: 'received', label: 'CA encaissé' },
    { key: 'remaining', label: 'Reste à encaisser' },
  ], `ca-${name}.csv`)
}

const tabs = computed(() => [
  { key: 'overview', label: t('revenueByAgent.tabs.overview'), count: null },
  { key: 'clients', label: t('revenueByAgent.tabs.clients'), count: data.value ? uniqueClients.value : null },
  { key: 'followUp', label: t('revenueByAgent.tabs.followUp'), count: data.value ? followUp.value.length : null },
])

const CLIENT_GRID = 'grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] gap-3 items-center'

onMounted(load)
</script>

<template>
  <ReportShell
    :title="t('revenueByAgent.title')"
    :subtitle="t('revenueByAgent.subtitle')"
    @refresh="load"
    @export="exportCsv"
  >
    <template #filters>
      <AppFilterChip
        v-if="agentOptions.length > 1"
        :label="t('revenueByAgent.agent')"
        :model-value="agentId"
        :options="agentOptions"
        @update:model-value="pickAgent"
      />
    </template>

    <AppErrorState v-if="error && !loading" :icon="AlertTriangle" :title="t('revenueByAgent.loadError')" :description="error" :action-label="t('common.retry')" @action="load" />

    <template v-else>
      <!-- Agent -->
      <div class="flex items-center gap-3">
        <AppSkeleton v-if="loading && !data" width="40px" height="40px" rounded="rounded-full" />
        <AppAvatar v-else-if="data?.agent" :name="data.agent.name" size="md" />
        <div class="min-w-0 flex-1">
          <p class="font-display text-base font-semibold text-gray-900 truncate">{{ data?.agent?.name ?? '—' }}</p>
          <p class="text-xs text-gray-500 truncate">
            {{ data?.agent?.team?.name ?? t('revenueByAgent.noTeam') }}
            <span v-if="data?.period"> · {{ dateFr(data.period.from) }} → {{ dateFr(data.period.to) }}</span>
          </p>
        </div>
        <span v-if="rank" class="px-2 rounded-full text-xs leading-6 font-medium bg-success-bg text-success-text whitespace-nowrap">
          {{ rank === 1 ? t('revenueByAgent.rankFirst') : t('revenueByAgent.rankBadge', { n: rank }) }}
        </span>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="flex items-end gap-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
        <button
          v-for="tb in tabs"
          :key="tb.key"
          type="button"
          role="tab"
          :aria-selected="tab === tb.key"
          :class="[
            'h-9.5 -mb-px px-0.5 border-b-2 text-[13.5px] flex items-center gap-2',
            tab === tb.key ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900',
          ]"
          @click="pickTab(tb.key)"
        >
          {{ tb.label }}
          <span v-if="tb.count !== null" class="font-mono text-xs text-gray-500">{{ num(tb.count) }}</span>
        </button>
      </div>

      <!-- ═══ Overview ═══ -->
      <template v-if="tab === 'overview'">
        <ReportKpis :items="kpis" :loading="loading && !data" />

        <section class="bg-white border border-gray-200 rounded-xl p-5">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.byMonth') }}</h2>
              <p class="text-xs text-gray-500">{{ t('revenueByAgent.clickMonthHint') }}</p>
            </div>
            <div class="flex items-center gap-4 text-xs text-gray-600">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-success" />{{ t('revenueByAgent.received') }}</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-gray-300" />{{ t('revenueByAgent.expected') }}</span>
            </div>
          </div>
          <AppSkeleton v-if="loading && !data" height="180px" />
          <div v-else class="overflow-x-auto">
            <div class="min-w-[560px]">
              <div class="flex items-end gap-2 h-44 border-b border-gray-200">
                <button
                  v-for="m in months"
                  :key="m.month"
                  type="button"
                  class="flex-1 h-full flex items-end justify-center gap-0.5 rounded-t hover:bg-gray-50"
                  :title="`${monthLabel(m.month, 'long')} — ${t('revenueByAgent.received')} : ${money(m.received)} · ${t('revenueByAgent.expected')} : ${money(m.expected)}`"
                  @click="openMonth(m.month)"
                >
                  <span class="flex-1 max-w-5 rounded-t bg-success" :style="{ height: barHeight(m.received) }" />
                  <span class="flex-1 max-w-5 rounded-t bg-gray-300" :style="{ height: barHeight(m.expected) }" />
                </button>
              </div>
              <div class="flex gap-2 mt-1.5">
                <span v-for="m in months" :key="m.month" class="flex-1 text-center text-[11px] text-gray-500 capitalize">{{ monthLabel(m.month) }}</span>
              </div>
            </div>
          </div>
        </section>

        <div :class="['grid gap-4', ranking?.length ? 'lg:grid-cols-5' : '']">
          <!-- Month by month table -->
          <section :class="['bg-white border border-gray-200 rounded-xl overflow-hidden', ranking?.length ? 'lg:col-span-3' : '']">
            <div class="px-5 pt-4 pb-2 flex items-center justify-between">
              <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.monthlyDetail') }}</h2>
              <button type="button" class="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1" @click="exportCsv">
                <Download class="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr class="text-xs text-gray-600 border-y border-gray-200 bg-gray-50">
                    <th class="text-left font-medium px-5 h-9">{{ t('revenueByAgent.month') }}</th>
                    <th class="text-right font-medium px-3">{{ t('revenueByAgent.validated') }}</th>
                    <th class="text-right font-medium px-3">{{ t('revenueByAgent.conversion') }}</th>
                    <th class="text-right font-medium px-3">{{ t('revenueByAgent.received') }}</th>
                    <th class="text-right font-medium px-5">{{ t('revenueByAgent.remaining') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loading && !data">
                    <tr v-for="n in 4" :key="n" class="border-b border-gray-100"><td colspan="5" class="px-5 py-3"><AppSkeleton height="12px" /></td></tr>
                  </template>
                  <tr v-for="m in monthsShown" v-else :key="m.month" class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="px-5 h-10 capitalize text-gray-900">{{ monthLabel(m.month, 'long') }}</td>
                    <td class="px-3 text-right font-mono text-success-text">{{ num(m.validated) }}</td>
                    <td class="px-3 text-right font-mono">{{ pct(m.conversion_rate) }}</td>
                    <td class="px-3 text-right font-mono font-medium">{{ money(m.received) }}</td>
                    <td :class="['px-5 text-right font-mono', m.remaining > 0 ? 'text-warning-text' : 'text-gray-500']">{{ money(m.remaining) }}</td>
                  </tr>
                </tbody>
                <tfoot v-if="data">
                  <tr v-if="monthsDesc.length > 4" class="border-b border-gray-100">
                    <td colspan="5" class="px-5 h-9 text-center">
                      <button type="button" class="text-xs text-primary hover:underline" @click="allMonths = !allMonths">
                        {{ allMonths ? t('revenueByAgent.showLess') : t('revenueByAgent.showAllMonths', { n: monthsDesc.length }) }}
                      </button>
                    </td>
                  </tr>
                  <tr class="bg-gray-50 font-semibold">
                    <td class="px-5 h-10">{{ t('common.total') }}</td>
                    <td class="px-3 text-right font-mono text-success-text">{{ num(totals.validated) }}</td>
                    <td class="px-3 text-right font-mono">{{ pct(totals.leads ? (totals.validated / totals.leads) * 100 : null) }}</td>
                    <td class="px-3 text-right font-mono">{{ money(totals.received) }}</td>
                    <td class="px-5 text-right font-mono">{{ money(totals.remaining) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <!-- Rank in the team (not for an agent looking at himself) -->
          <section v-if="ranking?.length" class="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.ranking') }}</h2>
              <span class="text-xs text-gray-500">{{ t('revenueByAgent.rankingHint') }}</span>
            </div>
            <button
              v-for="(r, i) in ranking"
              :key="r.id"
              type="button"
              :class="[
                'w-full flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-md border-t border-gray-100 text-left',
                r.id === data.agent.id ? 'bg-gray-100 text-gray-900 font-semibold' : 'hover:bg-gray-50',
              ]"
              @click="pickAgent(r.id)"
            >
              <span class="flex items-center gap-2.5 min-w-0">
                <span class="w-5 text-right font-mono text-xs text-gray-500">{{ i + 1 }}</span>
                <AppAvatar :name="r.name" size="xs" />
                <span class="truncate">{{ r.name }}</span>
              </span>
              <span class="flex items-center gap-1.5 font-mono">
                <component :is="r.received >= (k.received ?? 0) ? TrendingUp : TrendingDown" v-if="r.id !== data.agent.id" class="w-3.5 h-3.5 text-gray-400" />
                {{ money(r.received) }}
              </span>
            </button>
          </section>
        </div>
      </template>

      <!-- ═══ Paid clients ═══ -->
      <template v-else-if="tab === 'clients'">
        <ReportKpis
          :items="[
            { label: t('revenueByAgent.paidClients'), value: num(clientsSummary.unique) },
            { label: t('revenueByAgent.totalReceived'), value: money(clientsSummary.total), tone: 'success' },
            { label: t('revenueByAgent.perClient'), value: money(clientsSummary.average) },
          ]"
          :loading="loading && !data"
        />

        <div class="flex flex-wrap items-center gap-2">
          <AppSearchInput v-model="clientFilters.q" class="w-full sm:w-[280px]" :placeholder="t('revenueByAgent.searchClient')" />
          <AppFilterChip v-model="clientFilters.type" :label="t('revenueByAgent.type')" :options="typeOptions" />
          <AppFilterChip v-model="clientFilters.sort" :label="t('revenueByAgent.sort')" :options="sortOptions" />
          <button
            v-if="clientFilters.month"
            type="button"
            class="h-9 px-3 rounded-full bg-primary-soft/15 text-primary text-xs font-medium flex items-center gap-1.5 capitalize"
            @click="clientFilters.month = null"
          >
            {{ monthLabel(clientFilters.month, 'long') }} <X class="w-3.5 h-3.5" />
          </button>
          <button type="button" class="ml-auto h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" @click="exportCsv">
            <Download class="w-3.5 h-3.5" /> CSV
          </button>
        </div>

        <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <div class="min-w-[640px] text-[13px]">
              <div :class="[CLIENT_GRID, 'px-5 h-9 text-xs text-gray-600 bg-gray-50 border-b border-gray-200']">
                <span>{{ t('revenueByAgent.client') }}</span>
                <span>{{ t('revenueByAgent.type') }}</span>
                <span class="text-right">{{ t('revenueByAgent.received') }}</span>
                <span class="text-right">{{ t('revenueByAgent.left') }}</span>
                <span class="pl-2">{{ t('revenueByAgent.status') }}</span>
              </div>

              <template v-if="loading && !data">
                <div v-for="n in 5" :key="n" class="px-5 py-3 border-b border-gray-100"><AppSkeleton height="12px" /></div>
              </template>

              <p v-else-if="!clientGroups.length" class="py-10 text-center text-sm text-gray-500">
                {{ clientsFiltered ? t('revenueByAgent.noClientFound') : t('revenueByAgent.noPayment') }}
              </p>

              <template v-for="g in clientGroups" v-else :key="g.month">
                <button
                  type="button"
                  class="w-full flex items-center justify-between px-5 h-10 bg-gray-50/70 border-b border-gray-100 hover:bg-gray-100 text-left"
                  :aria-expanded="isOpen(g.month)"
                  @click="toggleGroup(g.month)"
                >
                  <span class="flex items-center gap-1.5 text-gray-800">
                    <component :is="isOpen(g.month) ? ChevronDown : ChevronRight" class="w-4 h-4 text-gray-500" />
                    <span class="capitalize font-medium">{{ monthLabel(g.month, 'long') }}</span>
                    <span class="text-gray-500">· {{ t('revenueByAgent.clientsCount', { n: g.rows.length }, g.rows.length) }}</span>
                  </span>
                  <span class="font-mono font-semibold text-gray-900">{{ money(g.total) }}</span>
                </button>

                <template v-if="isOpen(g.month)">
                  <div v-for="c in visibleRows(g)" :key="`${g.month}-${c.id}`" :class="[CLIENT_GRID, 'px-5 py-2 border-b border-gray-100 hover:bg-gray-50']">
                    <span class="min-w-0">
                      <RouterLink :to="{ name: 'leads.detail', params: { id: c.id } }" class="block truncate font-medium text-gray-900 hover:text-primary">{{ c.name }}</RouterLink>
                      <span class="block text-[11px] text-gray-500">{{ t('revenueByAgent.paidOn', { d: dayMonth(c.last_payment_date) }) }}</span>
                    </span>
                    <span class="truncate text-gray-700" :title="typeLabel(c.insurance_type)">{{ c.insurance_type ? typeShort(c.insurance_type) : '—' }}</span>
                    <span class="text-right font-mono font-medium text-gray-900">{{ money(c.received) }}</span>
                    <span :class="['text-right font-mono', c.remaining > 0 ? 'text-warning-text' : 'text-gray-500']">{{ money(c.remaining) }}</span>
                    <span class="pl-2">
                      <span v-if="c.payment_status" :class="['px-2 rounded-full text-[11px] leading-5 font-medium whitespace-nowrap', PAYMENT_TONE[c.payment_status] ?? 'bg-gray-100 text-gray-700']">{{ c.payment_status_label }}</span>
                    </span>
                  </div>
                  <button
                    v-if="g.rows.length > visibleRows(g).length"
                    type="button"
                    class="w-full px-5 h-9 text-left text-xs text-primary hover:bg-gray-50 border-b border-gray-100"
                    @click="expandGroup(g.month)"
                  >
                    {{ t('revenueByAgent.showMore', { n: g.rows.length - visibleRows(g).length }) }}
                  </button>
                </template>
              </template>

              <div v-if="clientGroups.length" class="flex items-center justify-between px-5 h-10 bg-gray-50 font-semibold">
                <span>{{ t('common.total') }} · {{ t('revenueByAgent.clientsCount', { n: clientsSummary.unique }, clientsSummary.unique) }}</span>
                <span class="font-mono">{{ money(clientsSummary.total) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- ═══ To follow up ═══ -->
      <template v-else>
        <ReportKpis
          :items="[
            { label: t('revenueByAgent.toFollowUpCount'), value: num(followSummary.count) },
            { label: t('revenueByAgent.amountDue'), value: money(followSummary.due), tone: followSummary.due > 0 ? 'warning' : undefined },
            { label: t('revenueByAgent.oldestUnpaid'), value: followSummary.count ? t('revenueByAgent.days', { n: followSummary.oldest }) : '—' },
          ]"
          :loading="loading && !data"
        />

        <div class="flex flex-wrap items-center gap-2">
          <AppSearchInput v-model="followQ" class="w-full sm:w-[280px]" :placeholder="t('revenueByAgent.searchClient')" />
          <span class="text-xs text-gray-500">{{ t('revenueByAgent.toFollowUpHint') }}</span>
          <button type="button" class="ml-auto h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" @click="exportCsv">
            <Download class="w-3.5 h-3.5" /> CSV
          </button>
        </div>

        <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <div class="min-w-[640px] text-[13px]">
              <div :class="[CLIENT_GRID, 'px-5 h-9 text-xs text-gray-600 bg-gray-50 border-b border-gray-200']">
                <span>{{ t('revenueByAgent.client') }}</span>
                <span>{{ t('revenueByAgent.type') }}</span>
                <span class="text-right">{{ t('revenueByAgent.paidOfExpected') }}</span>
                <span class="text-right">{{ t('revenueByAgent.left') }}</span>
                <span class="pl-2">{{ t('revenueByAgent.status') }}</span>
              </div>

              <template v-if="loading && !data">
                <div v-for="n in 5" :key="n" class="px-5 py-3 border-b border-gray-100"><AppSkeleton height="12px" /></div>
              </template>

              <p v-else-if="!filteredFollow.length" class="py-10 text-center text-sm text-gray-500">
                {{ followQ ? t('revenueByAgent.noClientFound') : t('revenueByAgent.nothingOwed') }}
              </p>

              <div v-for="c in filteredFollow.slice(0, followLimit)" v-else :key="c.id" :class="[CLIENT_GRID, 'px-5 py-2 border-b border-gray-100 hover:bg-gray-50']">
                <span class="min-w-0">
                  <RouterLink :to="{ name: 'leads.detail', params: { id: c.id } }" class="block truncate font-medium text-gray-900 hover:text-primary">{{ c.name }}</RouterLink>
                  <span v-if="c.validated_at" class="block text-[11px] text-gray-500">{{ t('revenueByAgent.validatedAgo', { n: daysSince(c.validated_at) }) }}</span>
                </span>
                <span class="truncate text-gray-700" :title="typeLabel(c.insurance_type)">{{ c.insurance_type ? typeShort(c.insurance_type) : '—' }}</span>
                <span class="text-right font-mono text-gray-700">{{ money(c.received) }} / {{ money(c.expected) }}</span>
                <span class="text-right font-mono font-semibold text-warning-text">{{ money(c.remaining) }}</span>
                <span class="pl-2">
                  <span v-if="c.payment_status" :class="['px-2 rounded-full text-[11px] leading-5 font-medium whitespace-nowrap', PAYMENT_TONE[c.payment_status] ?? 'bg-gray-100 text-gray-700']">{{ c.payment_status_label }}</span>
                </span>
              </div>

              <button
                v-if="filteredFollow.length > followLimit"
                type="button"
                class="w-full px-5 h-9 text-center text-xs text-primary hover:bg-gray-50"
                @click="followLimit += FOLLOW_PAGE"
              >
                {{ t('revenueByAgent.showMore', { n: filteredFollow.length - followLimit }) }}
              </button>
            </div>
          </div>
        </section>
      </template>
    </template>
  </ReportShell>
</template>
