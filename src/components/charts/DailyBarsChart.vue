<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Grouped daily bars for up to two series that share a date axis
 * (e.g. new leads + appointments). Series are merged by date; a day
 * missing from one series counts as 0.
 */
const props = defineProps({
  series: {
    type: Array,
    default: () => [], // [{ label, color, data: [{ date, total }] }]
  },
  keyX: { type: String, default: 'date' },
  keyY: { type: String, default: 'total' },
})

const { locale } = useI18n()

const VB_W = 720
const VB_H = 240
const PAD = { l: 36, r: 8, t: 12, b: 30 }
const PLOT_W = VB_W - PAD.l - PAD.r
const PLOT_H = VB_H - PAD.t - PAD.b

function niceMax(v) {
  if (!v || v <= 0) return 10
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / mag
  if (n <= 1) return mag
  if (n <= 2) return 2 * mag
  if (n <= 5) return 5 * mag
  return 10 * mag
}

const days = computed(() => {
  const map = new Map()
  props.series.forEach((s, si) => {
    for (const row of s.data ?? []) {
      const key = String(row[props.keyX]).slice(0, 10)
      if (!map.has(key)) map.set(key, props.series.map(() => 0))
      map.get(key)[si] = Number(row[props.keyY]) || 0
    }
  })
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, values]) => ({ date, values }))
})

const yMax = computed(() => niceMax(Math.max(1, ...days.value.flatMap((d) => d.values))))
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax.value * f)))

const bars = computed(() => {
  const n = days.value.length || 1
  const labelStep = Math.ceil(n / 10)
  const slot = PLOT_W / n
  const groupW = Math.min(slot * 0.7, 64)
  const barW = groupW / Math.max(1, props.series.length)
  return days.value.map((d, i) => {
    const x0 = PAD.l + i * slot + (slot - groupW) / 2
    return {
      date: d.date,
      cx: PAD.l + i * slot + slot / 2,
      showLabel: i % labelStep === 0,
      rects: d.values.map((v, si) => {
        const h = (v / yMax.value) * PLOT_H
        return {
          x: x0 + si * barW + 1,
          y: PAD.t + PLOT_H - h,
          w: Math.max(2, barW - 2),
          h,
          color: props.series[si].color,
          value: v,
          label: props.series[si].label,
        }
      }),
    }
  })
})

function yFor(v) {
  return PAD.t + PLOT_H - (v / yMax.value) * PLOT_H
}

function dayLabel(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <svg :viewBox="`0 0 ${VB_W} ${VB_H}`" class="w-full h-auto" role="img">
    <g>
      <line
        v-for="tk in ticks"
        :key="tk"
        :x1="PAD.l" :x2="VB_W - PAD.r" :y1="yFor(tk)" :y2="yFor(tk)"
        :stroke="tk === 0 ? '#d1d5db' : '#f3f4f6'"
      />
      <text
        v-for="tk in ticks"
        :key="`l-${tk}`"
        :x="PAD.l - 8" :y="yFor(tk) + 4"
        text-anchor="end" class="fill-gray-500 font-mono text-[11px]"
      >{{ tk }}</text>
    </g>
    <g v-for="b in bars" :key="b.date">
      <rect
        v-for="(r, ri) in b.rects"
        :key="ri"
        :x="r.x" :y="r.y" :width="r.w" :height="r.h" rx="3" :fill="r.color"
      >
        <title>{{ r.label }} · {{ dayLabel(b.date) }} : {{ r.value }}</title>
      </rect>
      <text
        v-if="b.showLabel"
        :x="b.cx" :y="VB_H - 8"
        text-anchor="middle" class="fill-gray-600 text-[11px]"
      >{{ dayLabel(b.date) }}</text>
    </g>
  </svg>
</template>
