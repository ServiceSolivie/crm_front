<script setup>
import { ChevronRight } from 'lucide-vue-next'

/**
 * Page title row used by every screen: optional breadcrumb, title (+ count),
 * one-line subtitle, and the page's buttons on the right (#actions slot).
 * breadcrumb: [{ label, to? }]
 */
defineProps({
  title: { type: String, required: true },
  count: { type: [Number, String], default: null },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  breadcrumb: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <nav v-if="breadcrumb.length" aria-label="Breadcrumb" class="flex items-center gap-1.5 text-[13px] text-gray-500 min-w-0">
      <template v-for="(item, i) in breadcrumb" :key="i">
        <ChevronRight v-if="i > 0" class="w-3.5 h-3.5 shrink-0" />
        <RouterLink v-if="item.to" :to="item.to" class="text-gray-600 hover:text-gray-900 truncate">{{ item.label }}</RouterLink>
        <span v-else class="text-gray-900 truncate">{{ item.label }}</span>
      </template>
    </nav>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0">
        <p v-if="eyebrow" class="text-[13px] text-gray-500">{{ eyebrow }}</p>
        <div class="flex items-baseline gap-2.5 min-w-0">
          <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900 truncate">{{ title }}</h1>
          <span v-if="count !== null && count !== undefined" class="font-mono text-sm text-gray-500">{{ count }}</span>
        </div>
        <p v-if="subtitle" class="text-[13px] text-gray-500 mt-0.5">{{ subtitle }}</p>
        <slot name="meta" />
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2.5">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
