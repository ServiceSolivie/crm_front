<script setup>
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/** Row of headline figures for a report: [{ label, value, tone? }] */
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const TONES = { success: 'text-success-text', danger: 'text-danger-text', default: 'text-gray-900' }
</script>

<template>
  <section
    :class="[
      'grid grid-cols-2 bg-white border border-gray-200 rounded-xl divide-gray-100',
      items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
      '[&>*:nth-child(odd)]:border-r [&>*]:border-gray-100 lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0',
    ]"
  >
    <div v-for="item in items" :key="item.label" class="px-5 py-4 min-w-0">
      <p class="text-[12.5px] text-gray-600 truncate">{{ item.label }}</p>
      <AppSkeleton v-if="loading" height="30px" width="60%" class="mt-1.5" />
      <p v-else :class="['font-mono text-[26px] leading-8 font-medium tracking-tight mt-1 truncate', TONES[item.tone ?? 'default']]">
        {{ item.value }}
      </p>
      <p v-if="item.hint && !loading" class="text-xs text-gray-500 mt-0.5 truncate">{{ item.hint }}</p>
    </div>
  </section>
</template>
