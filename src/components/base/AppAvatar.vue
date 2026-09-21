<script setup>
import { computed } from 'vue'
import { initials } from '@/utils/formatters'

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: '' },
  size: { type: String, default: 'md' }, // xs | sm | md | lg
  alt: { type: String, default: '' },
  // color: solid colour picked from the name, white initials (team members)
  // soft:  light tint picked from the name, dark initials (leads)
  // neutral / brand: fixed grey / indigo tint
  tone: { type: String, default: 'color' },
})

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

const avatarInitials = computed(() => initials(props.name))

// Same index → same hue in both palettes. Solid shades are dark enough for white text.
const SOLID = [
  'bg-indigo-600 text-white',
  'bg-violet-600 text-white',
  'bg-sky-700 text-white',
  'bg-emerald-700 text-white',
  'bg-amber-700 text-white',
  'bg-rose-600 text-white',
  'bg-teal-700 text-white',
  'bg-fuchsia-700 text-white',
]
const SOFT = [
  'bg-indigo-100 text-indigo-800',
  'bg-violet-100 text-violet-800',
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
  'bg-fuchsia-100 text-fuchsia-800',
]
const FIXED = { neutral: 'bg-gray-100 text-gray-600', brand: 'bg-indigo-100 text-indigo-800' }

// Hash the whole name so people sharing a first letter still get different colours
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

const colorClasses = computed(() => {
  if (FIXED[props.tone]) return FIXED[props.tone]
  if (!props.name) return 'bg-gray-200 text-gray-600'
  const palette = props.tone === 'soft' ? SOFT : SOLID
  return palette[hash(props.name.trim().toLowerCase()) % palette.length]
})
</script>

<template>
  <div
    :class="[
      'rounded-full overflow-hidden shrink-0 flex items-center justify-center font-semibold select-none',
      sizeClasses[size],
      src ? '' : colorClasses,
    ]"
  >
    <img v-if="src" :src="src" :alt="alt || name" class="w-full h-full object-cover" />
    <span v-else>{{ avatarInitials }}</span>
  </div>
</template>
