<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], default: null },
  subValue: { type: String, default: null },      // secondary line under the number
  change: { type: Number, default: null },         // positive = up, negative = down
  changeLabel: { type: String, default: 'vs last period' },
  format: { type: String, default: 'number' },    // number | percent | rate
  loading: { type: Boolean, default: false },
  icon: { type: Object, default: null },           // lucide component
  accent: { type: String, default: 'indigo' },    // indigo | emerald | amber | blue
})

const accentMap = {
  indigo: { icon: 'bg-primary/10 text-primary', ring: 'ring-primary/20' },
  emerald: { icon: 'bg-success/10 text-success', ring: 'ring-success/20' },
  amber: { icon: 'bg-warning/10 text-warning', ring: 'ring-warning/20' },
  blue: { icon: 'bg-info/10 text-info', ring: 'ring-info/20' },
}

const accent = computed(() => accentMap[props.accent] ?? accentMap.indigo)

const displayValue = computed(() => {
  const v = props.value
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (props.format === 'percent') return `${n.toFixed(1)}%`
  if (props.format === 'rate') return `${n.toFixed(1)}%`
  if (props.format === 'currency') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return n.toLocaleString('en-US')
  return String(v)
})

const trend = computed(() => {
  if (props.change === null || props.change === undefined) return null
  if (props.change > 0) return 'up'
  if (props.change < 0) return 'down'
  return 'neutral'
})

const trendClass = computed(() => ({
  up: 'bg-success/10 text-success',
  down: 'bg-danger/10 text-danger',
  neutral: 'bg-gray-100 text-gray-500',
}[trend.value] ?? ''))
</script>

<template>
  <div class="bg-white rounded-2xl p-5 shadow-card flex flex-col gap-4">
    <!-- Header: label + icon -->
    <div class="flex items-start justify-between gap-2">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-none mt-0.5">
        {{ title }}
      </p>
      <div
        v-if="icon"
        :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0', accent.icon]"
      >
        <component :is="icon" class="w-4 h-4" />
      </div>
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <AppSkeleton height="36px" width="55%" />
      <AppSkeleton height="20px" width="70%" />
    </template>

    <template v-else>
      <!-- Primary metric -->
      <p class="text-[32px] font-bold text-gray-900 leading-none tabular-nums">
        {{ displayValue }}
      </p>

      <!-- Sub value (e.g. "15 active") -->
      <p v-if="subValue" class="text-xs text-gray-500 -mt-2">{{ subValue }}</p>

      <!-- Trend badge + label -->
      <div v-if="trend" class="flex items-center gap-2">
        <span
          :class="[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
            trendClass,
          ]"
        >
          <TrendingUp v-if="trend === 'up'" class="w-3 h-3" />
          <TrendingDown v-else-if="trend === 'down'" class="w-3 h-3" />
          <Minus v-else class="w-3 h-3" />
          {{ Math.abs(change).toFixed(1) }}%
        </span>
        <span class="text-xs text-gray-400">{{ changeLabel }}</span>
      </div>
    </template>
  </div>
</template>
