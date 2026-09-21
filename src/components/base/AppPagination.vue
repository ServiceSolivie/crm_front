<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  currentPage: { type: Number, default: 1 },
  lastPage: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  from: { type: Number, default: 0 },
  to: { type: Number, default: 0 },
  perPage: { type: Number, default: 15 },
  perPageOptions: { type: Array, default: () => [15, 30, 50] },
})

const emit = defineEmits(['page-change', 'per-page-change'])
const { t } = useI18n()

// Page numbers to display (max 7 buttons)
const pages = computed(() => {
  const total = props.lastPage
  const cur = props.currentPage
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, cur])
  if (cur > 1) pages.add(cur - 1)
  if (cur < total) pages.add(cur + 1)

  return Array.from(pages).sort((a, b) => a - b)
})

// Insert ellipsis markers
const displayItems = computed(() => {
  const result = []
  let prev = null
  for (const p of pages.value) {
    if (prev !== null && p - prev > 1) result.push('...')
    result.push(p)
    prev = p
  }
  return result
})
</script>

<template>
  <div class="flex items-center justify-between px-1 py-2.5 flex-wrap gap-3">
    <!-- Count summary -->
    <p class="text-[13px] text-gray-600">
      <template v-if="total > 0">
        <span class="font-mono text-gray-900">{{ from }}–{{ to }}</span>
        {{ t('pagination.of') }}
        <span class="font-mono text-gray-900">{{ total }}</span>
      </template>
      <template v-else>{{ t('pagination.noResults') }}</template>
    </p>

    <div class="flex items-center gap-3">
      <!-- Per-page selector -->
      <div class="flex items-center gap-2 text-sm text-gray-500">
        <span>{{ t('pagination.perPage') }}</span>
        <select
          :value="perPage"
          class="h-8 px-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700
                 focus:outline-none focus:border-primary"
          @change="emit('per-page-change', Number($event.target.value))"
        >
          <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>

      <!-- Page buttons -->
      <div class="flex items-center gap-1">
        <button
          :disabled="currentPage === 1"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200
                 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors"
          @click="emit('page-change', currentPage - 1)"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <template v-for="(item, idx) in displayItems" :key="item === '...' ? 'gap-' + idx : item">
          <span v-if="item === '...'" class="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">
            ···
          </span>
          <button
            v-else
            :class="[
              'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
              item === currentPage
                ? 'bg-primary text-white border border-primary'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50',
            ]"
            @click="emit('page-change', item)"
          >
            {{ item }}
          </button>
        </template>

        <button
          :disabled="currentPage === lastPage"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200
                 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors"
          @click="emit('page-change', currentPage + 1)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
