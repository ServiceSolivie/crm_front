<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from 'lucide-vue-next'
import { LEAD_STAGES, leadStage } from '@/utils/enums'

/** Status pill coloured by pipeline stage (see LEAD_STAGES in utils/enums). */
const props = defineProps({
  status: { type: String, default: '' },
  dot: { type: Boolean, default: false },
  caret: { type: Boolean, default: false },
})

const { t } = useI18n()
const stage = computed(() => LEAD_STAGES[leadStage(props.status)])
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 h-6 rounded-md text-[12.5px] font-medium whitespace-nowrap',
      caret ? 'pl-2 pr-1.5' : 'px-2',
      stage.badge,
    ]"
  >
    <span v-if="dot" :class="['w-1.5 h-1.5 rounded-full shrink-0', stage.dot]" />
    {{ t('statuses.lead.' + status, status) }}
    <ChevronDown v-if="caret" class="w-3 h-3 shrink-0 opacity-80" />
  </span>
</template>
