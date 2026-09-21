<script setup>
import { useId, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  maxlength: { type: Number, default: undefined },
})

const emit = defineEmits(['update:modelValue'])

const id = useId()

const charCount = computed(() => (props.modelValue ?? '').length)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="id"
      class="text-[12.5px] font-medium text-gray-600 select-none"
    >
      {{ label }}
      <span v-if="required" class="text-danger-text ml-0.5">*</span>
    </label>

    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :maxlength="maxlength"
      :class="[
        'w-full rounded-lg border bg-white text-[13.5px] leading-5 text-gray-900 px-3 py-2.5 resize-y',
        'placeholder:text-gray-400 transition-colors duration-150',
        'focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary-soft/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-danger' : 'border-gray-300',
      ]"
      @input="emit('update:modelValue', $event.target.value)"
    />

    <div class="flex justify-between items-center">
      <p v-if="error" class="text-xs text-danger-text">{{ error }}</p>
      <p v-else-if="hint" class="text-xs text-gray-500">{{ hint }}</p>
      <p v-else class="text-xs text-transparent select-none">-</p>

      <p v-if="maxlength" class="text-xs text-gray-400 shrink-0">
        {{ charCount }} / {{ maxlength }}
      </p>
    </div>
  </div>
</template>
