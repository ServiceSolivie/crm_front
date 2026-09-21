<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { formatCurrency } from '@/utils/formatters'

/**
 * Sortable performance table shared by the Agents and Teams reports.
 * Rows come straight from the API: { name, team?, members_count?, leads: { total, validated, conversion_rate },
 * appointments: { total }, calls: { total }, revenue: { received } }
 */
const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  kind: { type: String, default: 'agent' }, // agent | team
  emptyText: { type: String, default: '' },
})
const { t, locale } = useI18n()

const sortKey = ref('conversion')
const sortDir = ref('desc')

const VALUE = {
  name: (r) => (r.name ?? '').toLowerCase(),
  secondary: (r) => (props.kind === 'agent' ? (r.team?.name ?? '').toLowerCase() : r.members_count ?? 0),
  leads: (r) => r.leads?.total ?? 0,
  validated: (r) => r.leads?.validated ?? 0,
  conversion: (r) => r.leads?.conversion_rate ?? -1,
  appointments: (r) => r.appointments?.total ?? 0,
  calls: (r) => r.calls?.total ?? 0,
  revenue: (r) => Number(r.revenue?.received ?? 0),
}

const sorted = computed(() => {
  const get = VALUE[sortKey.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => (get(a) > get(b) ? dir : get(a) < get(b) ? -dir : 0))
})

function sortBy(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = key === 'name' || key === 'secondary' ? 'asc' : 'desc'
  }
}

const totals = computed(() => {
  const leads = props.rows.reduce((s, r) => s + (r.leads?.total ?? 0), 0)
  const validated = props.rows.reduce((s, r) => s + (r.leads?.validated ?? 0), 0)
  return {
    leads,
    validated,
    appointments: props.rows.reduce((s, r) => s + (r.appointments?.total ?? 0), 0),
    calls: props.rows.reduce((s, r) => s + (r.calls?.total ?? 0), 0),
    revenue: props.rows.reduce((s, r) => s + Number(r.revenue?.received ?? 0), 0),
    members: props.rows.reduce((s, r) => s + (r.members_count ?? 0), 0),
    conversion: leads ? (validated / leads) * 100 : null,
  }
})

const maxConversion = computed(() => Math.max(1, ...props.rows.map((r) => r.leads?.conversion_rate ?? 0)))

const nf = computed(() => new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB'))
function num(v) { return nf.value.format(v ?? 0) }
function pct(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }).format(v) + ' %'
}

const columns = computed(() => [
  { key: 'name', label: props.kind === 'agent' ? t('reports.agentCol') : t('reports.teamCol'), align: 'left' },
  { key: 'secondary', label: props.kind === 'agent' ? t('reports.teamCol') : t('reports.members'), align: props.kind === 'agent' ? 'left' : 'right' },
  { key: 'leads', label: t('reports.leadsCol'), align: 'right' },
  { key: 'validated', label: t('reports.validated'), align: 'right' },
  { key: 'calls', label: t('reports.callsCol'), align: 'right' },
  { key: 'appointments', label: t('reports.appts'), align: 'right' },
  { key: 'revenue', label: t('reports.revenueCol'), align: 'right' },
  { key: 'conversion', label: t('reports.convCol'), align: 'left' },
])

const GRID = 'grid grid-cols-[minmax(200px,2fr)_minmax(110px,1fr)_72px_72px_72px_72px_110px_minmax(170px,1.3fr)] items-center gap-x-4'
</script>

<template>
  <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <div class="min-w-[980px] text-[13px]" role="table">
        <div role="row" :class="[GRID, 'h-10 px-5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
          <button
            v-for="col in columns"
            :key="col.key"
            role="columnheader"
            type="button"
            :aria-sort="sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'"
            :class="['h-full flex items-center gap-1 hover:text-gray-900', col.align === 'right' ? 'justify-end' : 'justify-start']"
            @click="sortBy(col.key)"
          >
            {{ col.label }}
            <component :is="sortDir === 'asc' ? ChevronUp : ChevronDown" v-if="sortKey === col.key" class="w-3.5 h-3.5" />
          </button>
        </div>

        <template v-if="loading">
          <div v-for="n in 6" :key="n" :class="[GRID, 'h-[52px] px-5 border-b border-gray-100']">
            <div class="flex items-center gap-2.5"><AppSkeleton width="28px" height="28px" rounded="rounded-full" /><AppSkeleton height="12px" width="60%" /></div>
            <AppSkeleton height="10px" width="70%" />
            <AppSkeleton height="10px" /><AppSkeleton height="10px" /><AppSkeleton height="10px" />
            <AppSkeleton height="10px" /><AppSkeleton height="10px" />
            <AppSkeleton height="8px" />
          </div>
        </template>

        <p v-else-if="!rows.length" class="px-5 py-12 text-center text-sm text-gray-500">{{ emptyText }}</p>

        <template v-else>
          <div v-for="(r, i) in sorted" :key="r.id ?? i" role="row" :class="[GRID, 'h-[52px] px-5 border-b border-gray-100 hover:bg-gray-50']">
            <div role="cell" class="flex items-center gap-2.5 min-w-0">
              <AppAvatar :name="r.name" size="sm" :tone="kind === 'team' ? 'brand' : 'color'" />
              <span class="font-medium text-gray-900 truncate">{{ r.name }}</span>
            </div>
            <div role="cell" :class="['min-w-0 truncate', kind === 'agent' ? 'text-gray-600' : 'text-right font-mono']">
              {{ kind === 'agent' ? (r.team?.name ?? '—') : num(r.members_count) }}
            </div>
            <div role="cell" class="text-right font-mono">{{ num(r.leads?.total) }}</div>
            <div role="cell" class="text-right font-mono text-success-text">{{ num(r.leads?.validated) }}</div>
            <div role="cell" class="text-right font-mono">{{ num(r.calls?.total) }}</div>
            <div role="cell" class="text-right font-mono">{{ num(r.appointments?.total) }}</div>
            <div role="cell" class="text-right font-mono">{{ formatCurrency(r.revenue?.received ?? 0) }}</div>
            <div role="cell" class="flex items-center gap-2.5">
              <span class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <span
                  :class="['block h-full rounded-full', (r.leads?.conversion_rate ?? 0) >= (totals.conversion ?? 0) ? 'bg-primary' : 'bg-indigo-300']"
                  :style="{ width: `${((r.leads?.conversion_rate ?? 0) / maxConversion) * 100}%` }"
                />
              </span>
              <span class="w-14 text-right font-mono font-medium">{{ pct(r.leads?.conversion_rate) }}</span>
            </div>
          </div>

          <div role="row" :class="[GRID, 'h-[46px] px-5 bg-gray-50 font-semibold']">
            <div role="cell">{{ t('common.total') }}</div>
            <div role="cell" :class="kind === 'agent' ? '' : 'text-right font-mono'">{{ kind === 'agent' ? '' : num(totals.members) }}</div>
            <div role="cell" class="text-right font-mono">{{ num(totals.leads) }}</div>
            <div role="cell" class="text-right font-mono text-success-text">{{ num(totals.validated) }}</div>
            <div role="cell" class="text-right font-mono">{{ num(totals.calls) }}</div>
            <div role="cell" class="text-right font-mono">{{ num(totals.appointments) }}</div>
            <div role="cell" class="text-right font-mono">{{ formatCurrency(totals.revenue) }}</div>
            <div role="cell" class="flex justify-end"><span class="w-14 text-right font-mono">{{ pct(totals.conversion) }}</span></div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
