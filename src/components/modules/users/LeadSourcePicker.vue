<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import { useLeadSourcesStore } from '@/stores/leadSources.store'

/**
 * Lead sources a marketing user is limited to, as toggle chips.
 * v-model: array of source ids. Empty = all sources.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  error: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const sourcesStore = useLeadSourcesStore()

const selected = computed(() => props.modelValue.map(String))
const isOn = (id) => selected.value.includes(String(id))

function toggle(id) {
  emit('update:modelValue', isOn(id) ? props.modelValue.filter((v) => String(v) !== String(id)) : [...props.modelValue, id])
}

onMounted(() => sourcesStore.fetchList())
</script>

<template>
  <div>
    <p class="text-[13px] font-medium text-gray-700 mb-2">{{ t('users.sources') }}</p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in sourcesStore.list"
        :key="s.id"
        type="button"
        :aria-pressed="isOn(s.id)"
        :class="[
          'h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[13px] border transition-colors',
          isOn(s.id) ? 'border-indigo-200 bg-primary-light text-indigo-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
        ]"
        @click="toggle(s.id)"
      >
        <Check v-if="isOn(s.id)" class="w-3.5 h-3.5" />
        {{ s.name }}
      </button>
    </div>
    <p :class="['mt-2 text-xs', error ? 'text-danger-text' : 'text-gray-500']">{{ error || t('users.sourcesHint') }}</p>
  </div>
</template>
