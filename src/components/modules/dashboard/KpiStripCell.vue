<script setup>
import { computed } from 'vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/** One cell of the dashboard KPI strip: label, big figure, optional hint, sparkline or progress bar. */
const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '—' },
  hint: { type: String, default: '' },
  hintTone: { type: String, default: 'muted' }, // muted | danger | success
  spark: { type: Array, default: () => [] }, // numbers, oldest first
  progress: { type: Number, default: null }, // 0–100
  loading: { type: Boolean, default: false },
})

const W = 160
const H = 24

const sparkPath = computed(() => {
  const pts = props.spark
  if (pts.length < 2) return ''
  const max = Math.max(...pts, 1)
  const min = Math.min(...pts, 0)
  const span = max - min || 1
  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - 2 - ((v - min) / span) * (H - 4)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <div class="px-5 py-4 flex flex-col gap-1.5 min-w-0">
    <p class="text-[12.5px] text-gray-600 truncate">{{ label }}</p>
    <template v-if="loading">
      <AppSkeleton height="30px" width="60%" />
      <AppSkeleton height="14px" width="80%" />
    </template>
    <template v-else>
      <div class="flex items-baseline gap-2 min-w-0">
        <span class="font-mono text-[26px] font-medium tracking-tight leading-8 text-gray-900 whitespace-nowrap">{{ value }}</span>
        <span
          v-if="hint && progress === null"
          :class="['text-xs truncate', { danger: 'text-danger-text font-medium', success: 'text-success-text font-medium' }[hintTone] ?? 'text-gray-500']"
        >{{ hint }}</span>
      </div>
      <svg v-if="sparkPath" :viewBox="`0 0 ${W} ${H}`" class="w-full max-w-40 h-6" preserveAspectRatio="none" aria-hidden="true">
        <path :d="sparkPath" fill="none" stroke="currentColor" stroke-width="1.5" class="text-primary" vector-effect="non-scaling-stroke" />
      </svg>
      <div v-else-if="progress !== null" class="flex flex-col gap-1 pt-1">
        <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div class="h-full bg-success rounded-full" :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }" />
        </div>
        <p v-if="hint" class="text-xs text-gray-500 truncate">{{ hint }}</p>
      </div>
    </template>
  </div>
</template>
