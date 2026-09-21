<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, X } from 'lucide-vue-next'

/**
 * Search box. Emits update:modelValue once typing pauses (debounce, ms),
 * so list pages don't refetch on every keystroke. Clearing emits at once.
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  debounce: { type: Number, default: 300 },
})

const emit = defineEmits(['update:modelValue', 'clear'])
const { t } = useI18n()

const text = ref(props.modelValue ?? '')
watch(() => props.modelValue, (v) => { if (v !== text.value) text.value = v ?? '' })

let timer = null
function onInput(e) {
  text.value = e.target.value
  clearTimeout(timer)
  timer = setTimeout(() => emit('update:modelValue', text.value), props.debounce)
}
function clear() {
  clearTimeout(timer)
  text.value = ''
  emit('update:modelValue', '')
  emit('clear')
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <label class="relative flex items-center">
    <Search class="absolute left-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
    <span class="sr-only">{{ t('common.search') }}</span>
    <input
      :value="text"
      type="search"
      :placeholder="placeholder || t('common.searchPlaceholder')"
      :disabled="disabled"
      class="h-9 w-full pl-8.5 pr-8 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900
             placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary-soft/20
             disabled:opacity-50 transition-colors
             [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      @input="onInput"
    />
    <button
      v-if="text"
      type="button"
      :aria-label="t('common.clear')"
      class="absolute right-2 p-0.5 rounded text-gray-500 hover:text-gray-900"
      @click="clear"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </label>
</template>
