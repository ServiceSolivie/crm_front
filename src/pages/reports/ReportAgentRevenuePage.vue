<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Download, TrendingDown, TrendingUp } from 'lucide-vue-next'
import { reportsApi } from '@/api/reports'
import { useReportsStore } from '@/stores/reports.store'
import { useInsuranceTypes } from '@/composables/useInsuranceTypes'
import { useReportFormat } from '@/composables/useReportFormat'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppErrorState from '@/components/base/AppErrorState.vue'
import ReportShell from '@/components/modules/reports/ReportShell.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'

/**
 * « CA par agent »: how much one agent brought in, month by month, with his
 * best clients, the clients still owing money and his rank in the team.
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

// Opening the page from another agent's link (Rapports → Agents)
watch(() => route.query.agent, (v) => {
  const id = v ? Number(v) : null
  if (id && id !== agentId.value) { agentId.value = id; load() }
})

const agentOptions = computed(() =>
  (data.value?.agents ?? []).map((a) => ({ value: a.id, label: a.is_active ? a.name : `${a.name} (${t('revenueByAgent.inactive')})` })),
)

/* ── Headline figures ──────────────────────────────────────── */
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

/* ── Months ────────────────────────────────────────────────── */
const months = computed(() => data.value?.months ?? [])
const monthLabel = (key, style = 'short') => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' })
}
const chartMax = computed(() => Math.max(1, ...months.value.map((m) => Math.max(m.received, m.expected))))
const barHeight = (v) => `${Math.max(v > 0 ? 2 : 0, Math.round((v / chartMax.value) * 100))}%`
const monthsDesc = computed(() => [...months.value].reverse())
const totals = computed(() => months.value.reduce((s, m) => ({
  leads: s.leads + m.leads,
  validated: s.validated + m.validated,
  expected: s.expected + m.expected,
  received: s.received + m.received,
  remaining: s.remaining + m.remaining,
}), { leads: 0, validated: 0, expected: 0, received: 0, remaining: 0 }))

/* ── Lists ─────────────────────────────────────────────────── */
const PAYMENT_TONE = {
  NON_PAYE: 'bg-danger-bg text-danger-text',
  PARTIELLEMENT_PAYE: 'bg-warning-bg text-warning-text',
  EN_ATTENTE: 'bg-info-bg text-info-text',
}
const ranking = computed(() => data.value?.ranking ?? null)

/* ── CSV (one line per month) ──────────────────────────────── */
function exportCsv() {
  const name = (data.value?.agent?.name ?? 'agent').replace(/\s+/g, '-').toLowerCase()
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
        <div class="min-w-0">
          <p class="font-display text-base font-semibold text-gray-900 truncate">{{ data?.agent?.name ?? '—' }}</p>
          <p class="text-xs text-gray-500 truncate">
            {{ data?.agent?.team?.name ?? t('revenueByAgent.noTeam') }}
            <span v-if="data?.period"> · {{ data.period.from.split('-').reverse().join('/') }} → {{ data.period.to.split('-').reverse().join('/') }}</span>
          </p>
        </div>
      </div>

      <ReportKpis :items="kpis" :loading="loading && !data" />

      <!-- Month by month chart -->
      <section class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.byMonth') }}</h2>
          <div class="flex items-center gap-4 text-xs text-gray-600">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-success" />{{ t('revenueByAgent.received') }}</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-gray-300" />{{ t('revenueByAgent.expected') }}</span>
          </div>
        </div>
        <AppSkeleton v-if="loading && !data" height="180px" />
        <div v-else class="overflow-x-auto">
          <div class="min-w-[560px]">
            <div class="flex items-end gap-2 h-44 border-b border-gray-200">
              <div
                v-for="m in months"
                :key="m.month"
                class="flex-1 h-full flex items-end justify-center gap-0.5"
                :title="`${monthLabel(m.month, 'long')} — ${t('revenueByAgent.received')} : ${money(m.received)} · ${t('revenueByAgent.expected')} : ${money(m.expected)}`"
              >
                <span class="flex-1 max-w-5 rounded-t bg-success" :style="{ height: barHeight(m.received) }" />
                <span class="flex-1 max-w-5 rounded-t bg-gray-300" :style="{ height: barHeight(m.expected) }" />
              </div>
            </div>
            <div class="flex gap-2 mt-1.5">
              <span v-for="m in months" :key="m.month" class="flex-1 text-center text-[11px] text-gray-500 capitalize">{{ monthLabel(m.month) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Month by month table -->
      <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.monthlyDetail') }}</h2>
          <button type="button" class="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1" @click="exportCsv">
            <Download class="w-3.5 h-3.5" /> CSV
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr class="text-xs text-gray-600 border-y border-gray-200 bg-gray-50">
                <th class="text-left font-medium px-5 h-9">{{ t('revenueByAgent.month') }}</th>
                <th class="text-right font-medium px-3">{{ t('revenueByAgent.leads') }}</th>
                <th class="text-right font-medium px-3">{{ t('revenueByAgent.validated') }}</th>
                <th class="text-right font-medium px-3">{{ t('revenueByAgent.conversion') }}</th>
                <th class="text-right font-medium px-3">{{ t('revenueByAgent.expected') }}</th>
                <th class="text-right font-medium px-3">{{ t('revenueByAgent.received') }}</th>
                <th class="text-right font-medium px-5">{{ t('revenueByAgent.remaining') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="loading && !data">
                <tr v-for="n in 4" :key="n" class="border-b border-gray-100"><td colspan="7" class="px-5 py-3"><AppSkeleton height="12px" /></td></tr>
              </template>
              <tr v-for="m in monthsDesc" v-else :key="m.month" class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-5 h-10 capitalize text-gray-900">{{ monthLabel(m.month, 'long') }}</td>
                <td class="px-3 text-right font-mono">{{ num(m.leads) }}</td>
                <td class="px-3 text-right font-mono text-success-text">{{ num(m.validated) }}</td>
                <td class="px-3 text-right font-mono">{{ pct(m.conversion_rate) }}</td>
                <td class="px-3 text-right font-mono">{{ money(m.expected) }}</td>
                <td class="px-3 text-right font-mono font-medium">{{ money(m.received) }}</td>
                <td :class="['px-5 text-right font-mono', m.remaining > 0 ? 'text-warning-text' : 'text-gray-500']">{{ money(m.remaining) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="data">
              <tr class="bg-gray-50 font-semibold">
                <td class="px-5 h-10">{{ t('common.total') }}</td>
                <td class="px-3 text-right font-mono">{{ num(totals.leads) }}</td>
                <td class="px-3 text-right font-mono text-success-text">{{ num(totals.validated) }}</td>
                <td class="px-3 text-right font-mono">{{ pct(totals.leads ? (totals.validated / totals.leads) * 100 : null) }}</td>
                <td class="px-3 text-right font-mono">{{ money(totals.expected) }}</td>
                <td class="px-3 text-right font-mono">{{ money(totals.received) }}</td>
                <td class="px-5 text-right font-mono">{{ money(totals.remaining) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Best clients -->
        <section class="bg-white border border-gray-200 rounded-xl p-5">
          <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.topClients') }}</h2>
          <p class="text-xs text-gray-500 mb-2">{{ t('revenueByAgent.topClientsHint') }}</p>
          <p v-if="data && !data.top_clients?.length" class="py-6 text-center text-sm text-gray-500">{{ t('revenueByAgent.noPayment') }}</p>
          <RouterLink
            v-for="c in data?.top_clients ?? []"
            :key="c.id"
            :to="{ name: 'leads.detail', params: { id: c.id } }"
            class="flex items-center justify-between gap-3 py-2.5 border-t border-gray-100 hover:text-primary"
          >
            <span class="flex items-center gap-2 min-w-0">
              <span class="truncate">{{ c.name }}</span>
              <span v-if="c.insurance_type" class="px-1.5 rounded text-xs leading-5 font-medium bg-gray-100 text-gray-700" :title="typeLabel(c.insurance_type)">{{ typeShort(c.insurance_type) }}</span>
            </span>
            <span class="font-mono font-medium text-gray-900">{{ money(c.received) }}</span>
          </RouterLink>
        </section>

        <!-- Clients still owing money -->
        <section class="bg-white border border-gray-200 rounded-xl p-5">
          <h2 class="font-display text-base font-semibold text-gray-900">{{ t('revenueByAgent.toFollowUp') }}</h2>
          <p class="text-xs text-gray-500 mb-2">{{ t('revenueByAgent.toFollowUpHint') }}</p>
          <p v-if="data && !data.to_follow_up?.length" class="py-6 text-center text-sm text-gray-500">{{ t('revenueByAgent.nothingOwed') }}</p>
          <RouterLink
            v-for="c in data?.to_follow_up ?? []"
            :key="c.id"
            :to="{ name: 'leads.detail', params: { id: c.id } }"
            class="flex items-center justify-between gap-3 py-2.5 border-t border-gray-100 hover:text-primary"
          >
            <span class="flex items-center gap-2 min-w-0">
              <span class="truncate">{{ c.name }}</span>
              <span v-if="c.payment_status" :class="['px-1.5 rounded text-xs leading-5 font-medium whitespace-nowrap', PAYMENT_TONE[c.payment_status] ?? 'bg-gray-100 text-gray-700']">{{ c.payment_status_label }}</span>
            </span>
            <span class="text-gray-500 whitespace-nowrap">{{ t('revenueByAgent.left') }} <span class="font-mono font-medium text-gray-900">{{ money(c.remaining) }}</span></span>
          </RouterLink>
        </section>
      </div>

      <!-- Rank in the team (not for an agent looking at himself) -->
      <section v-if="ranking?.length" class="bg-white border border-gray-200 rounded-xl p-5">
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
    </template>
  </ReportShell>
</template>
