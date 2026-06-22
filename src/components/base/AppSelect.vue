<script setup>
import { useId, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  label: { type: String, default: '' },
  options: {
    type: Array,
    default: () => [],
    // [{ value, label, disabled? }]
  },
  placeholder: { type: String, default: 'Select…' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const id = useId()
const hasEmptyOption = computed(() => props.options.some((opt) => opt.value === ''))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="id"
      class="text-sm font-medium text-gray-700 select-none"
    >
      {{ label }}
      <span v-if="required" class="text-danger ml-0.5">*</span>
    </label>

    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="[
          'w-full h-11 pl-3 pr-9 rounded-lg border bg-gray-50 text-sm text-gray-900',
          'appearance-none transition-colors duration-150 cursor-pointer',
          'focus:outline-none focus:bg-white focus:border-primary focus-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-danger' : 'border-gray-300',
          modelValue === null || modelValue === '' ? 'text-gray-400' : 'text-gray-900',
        ]"
        @change="emit('update:modelValue', $event.target.value)"
      >
        <option v-if="!hasEmptyOption" value="" disabled :selected="modelValue === null || modelValue === ''">
          {{ placeholder }}
        </option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </select>

      <ChevronDown
        class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
      />
    </div>

    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-gray-500">{{ hint }}</p>
  </div>
</template>
