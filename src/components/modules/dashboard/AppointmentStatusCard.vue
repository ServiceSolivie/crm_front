<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/**
 * Dashboard « Rendez-vous par statut »: total, completion and lost rates,
 * one bar split by status and a tile per status.
 * `byStatus` is statistics.appointments.by_status ({ PLANIFIE: 115, … }).
 */
const props = defineProps({
  byStatus: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
const { t, locale } = useI18n()

const STATUSES = [
  { key: 'PLANIFIE', color: 'bg-info' },
  { key: 'CONFIRME', color: 'bg-primary' },
  { key: 'REALISE', color: 'bg-success' },
  { key: 'REPORTE', color: 'bg-warning' },
  { key: 'ANNULE', color: 'bg-danger' },
  { key: 'NON_VENU', color: 'bg-gray-400' },
]

const count = (key) => Number(props.byStatus?.[key]) || 0
const total = computed(() => STATUSES.reduce((s, st) => s + count(st.key), 0))
const pct = (n, of) => (of ? (n / of) * 100 : 0)

const tiles = computed(() => STATUSES.map((st) => ({ ...st, value: count(st.key), pct: pct(count(st.key), total.value) })))

// Over = réalisé, annulé or non venu: the rates only count those
const finished = computed(() => count('REALISE') + count('ANNULE') + count('NON_VENU'))
const completionRate = computed(() => (finished.value ? pct(count('REALISE'), finished.value) : null))
const lostRate = computed(() => (finished.value ? pct(count('ANNULE') + count('NON_VENU'), finished.value) : null))

const nf = computed(() => new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }))
const fmtPct = (v) => (v === null ? '—' : nf.value.format(v) + ' %')
</script>

<template>
  <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5 flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <h3 class="font-display text-[15px] font-semibold text-gray-900">{{ t('dashboard.appointmentsByStatus') }}</h3>
      <dl v-if="!loading && total" class="flex gap-6">
        <div class="text-right">
          <dt class="text-xs text-gray-500">{{ t('dashboard.aptTotal') }}</dt>
          <dd class="font-mono text-[22px] leading-7 font-medium text-gray-900">{{ nf.format(total) }}</dd>
        </div>
        <div class="text-right" :title="t('dashboard.aptCompletionHint')">
          <dt class="text-xs text-gray-500">{{ t('dashboard.aptCompletion') }}</dt>
          <dd class="font-mono text-[22px] leading-7 font-medium text-success-text">{{ fmtPct(completionRate) }}</dd>
        </div>
        <div class="text-right">
          <dt class="text-xs text-gray-500">{{ t('dashboard.aptLost') }}</dt>
          <dd class="font-mono text-[22px] leading-7 font-medium text-danger-text">{{ fmtPct(lostRate) }}</dd>
        </div>
      </dl>
    </div>

    <template v-if="loading">
      <AppSkeleton height="12px" class="rounded-full" />
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <AppSkeleton v-for="n in 6" :key="n" height="58px" />
      </div>
    </template>

    <template v-else-if="total">
      <div class="h-3 flex gap-[3px] rounded-full overflow-hidden bg-gray-100">
        <div
          v-for="s in tiles.filter((x) => x.value)"
          :key="s.key"
          :class="s.color"
          :style="{ width: `${s.pct}%` }"
          :title="`${t('statuses.appointment.' + s.key)} : ${s.value}`"
        />
      </div>
      <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <li v-for="s in tiles" :key="s.key" class="border border-gray-200 rounded-lg px-3 py-2.5">
          <p class="flex items-center gap-1.5 text-xs text-gray-600">
            <span :class="['w-2 h-2 rounded-sm shrink-0', s.color]" />{{ t('statuses.appointment.' + s.key) }}
          </p>
          <p class="mt-1 flex items-baseline gap-1.5">
            <span :class="['font-mono text-lg font-medium', s.value ? 'text-gray-900' : 'text-gray-400']">{{ nf.format(s.value) }}</span>
            <span v-if="s.value" class="text-xs text-gray-500">{{ fmtPct(s.pct) }}</span>
          </p>
        </li>
      </ul>
    </template>

    <p v-else class="py-8 text-center text-sm text-gray-500">{{ t('dashboard.noDataPeriod') }}</p>
  </section>
</template>
