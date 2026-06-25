<script setup>
import { Search, X } from 'lucide-vue-next'

defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search…' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'clear'])
</script>

<template>
  <div class="relative flex items-center">
    <Search class="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />

    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      :disabled="disabled"
      class="h-9 w-full pl-9 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-900
             placeholder:text-gray-400 focus:outline-none focus:border-primary focus-ring
             disabled:opacity-50 transition-colors
             [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      @input="emit('update:modelValue', $event.target.value)"
    />

    <button
      v-if="modelValue"
      class="absolute right-2.5 p-0.5 rounded text-gray-400 hover:text-gray-600"
      type="button"
      @click="emit('update:modelValue', ''); emit('clear')"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
