<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ days: 30, from: null, to: null }),
  },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const presets = computed(() => [
  { label: t('dashboard.today'), days: 1 },
  { label: t('dashboard.days7'), days: 7 },
  { label: t('dashboard.days30'), days: 30 },
  { label: t('dashboard.days90'), days: 90 },
])

const activePreset = computed(() =>
  props.modelValue.from ? null : (props.modelValue.days ?? 30),
)

function selectPreset(days) {
  emit('update:modelValue', { days, from: null, to: null })
}
</script>

<template>
  <div role="group" :aria-label="t('dashboard.period')" class="flex gap-0.5 p-[3px] bg-gray-200 rounded-[9px]">
    <button
      v-for="p in presets"
      :key="p.days"
      type="button"
      :aria-pressed="activePreset === p.days"
      :class="[
        'h-7.5 px-3 rounded-[7px] text-[13px] transition-colors whitespace-nowrap',
        activePreset === p.days
          ? 'bg-white text-gray-900 font-medium shadow-[0_1px_2px_rgba(17,24,39,0.08)]'
          : 'text-gray-600 hover:text-gray-900',
      ]"
      @click="selectPreset(p.days)"
    >
      {{ p.label }}
    </button>
  </div>
</template>
