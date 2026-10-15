<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, Undo2 } from 'lucide-vue-next'
import AppBadge from '@/components/base/AppBadge.vue'
import { CATEGORIES, STATE_VARIANT, STATE_EDGE } from '@/utils/activityJournal'
import { formatDateTime, formatRelative } from '@/utils/formatters'

/**
 * One operation of the activity journal (a payment, a Google Ads
 * submission, an account's logins of the day…): what it is, how it stands,
 * and how much happened to it. Click to open or close its logs.
 */
const props = defineProps({
  operation: { type: Object, required: true },
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle'])
const { t, te, locale } = useI18n()

const category = computed(() => CATEGORIES[props.operation.category] ?? CATEGORIES.system)

// The API names operations in French; other languages build the name from its kind
const title = computed(() => {
  const o = props.operation
  const key = `activity.kinds.${o.kind}`
  return locale.value !== 'fr' && te(key) ? t(key, { reference: o.reference ?? '' }).trim() : o.title
})

// Same for the state: translated from the event that set it, when the language has it
const stateLabel = computed(() => {
  const o = props.operation
  const key = `activity.stateLabels.${o.state_event}`
  return o.state_event && te(key) ? t(key) : o.state_label
})
</script>

<template>
  <button
    type="button"
    class="w-full grid grid-cols-[16px_32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left border-l-2 hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50"
    :class="STATE_EDGE[operation.state] ?? 'border-l-transparent'"
    :aria-expanded="open"
    @click="emit('toggle')"
  >
    <ChevronRight class="w-4 h-4 text-gray-400 transition-transform" :class="open ? 'rotate-90' : ''" />
    <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="category.tile">
      <component :is="category.icon" class="w-4 h-4" />
    </span>

    <span class="min-w-0">
      <span class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-medium text-gray-900 truncate">{{ title }}</span>
        <span
          v-if="operation.has_refund"
          class="shrink-0 inline-flex items-center gap-1 text-[11px] text-violet-700"
          :title="t('activity.containsRefund')"
        ><Undo2 class="w-3 h-3" />{{ t('activity.categories.refund') }}</span>
      </span>
      <span class="block text-[13px] text-gray-500 truncate">{{ operation.subtitle }}</span>
    </span>

    <span class="text-right shrink-0">
      <AppBadge :variant="STATE_VARIANT[operation.state] ?? 'neutral'" dot>{{ stateLabel }}</AppBadge>
      <span class="block mt-1 text-[11px] text-gray-500 whitespace-nowrap">
        {{ t('activity.logsCount', operation.logs_count, { count: operation.logs_count }) }}
        <template v-if="operation.problems_count"> · <span class="text-danger-text">{{ t('activity.problemsCount', operation.problems_count, { count: operation.problems_count }) }}</span></template>
        · <span :title="formatDateTime(operation.last_activity_at)">{{ formatRelative(operation.last_activity_at) }}</span>
      </span>
    </span>
  </button>
</template>
