<script setup>
import { useId } from 'vue'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  // Non-blocking notice (amber), e.g. a possible duplicate
  warning: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'off' },
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const id = useId()

function onInput(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Label -->
    <label
      v-if="label"
      :for="id"
      class="text-[12.5px] font-medium text-gray-600 select-none"
    >
      {{ label }}
      <span v-if="required" class="text-danger-text ml-0.5">*</span>
    </label>

    <!-- Input wrapper -->
    <div class="relative flex items-center">
      <!-- Prefix icon slot -->
      <span
        v-if="$slots.prefix"
        class="absolute left-3 flex items-center text-gray-400 pointer-events-none"
      >
        <slot name="prefix" />
      </span>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :class="[
          'w-full h-10 rounded-lg border bg-white text-[13.5px] text-gray-900',
          'placeholder:text-gray-400 transition-colors duration-150',
          'focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary-soft/20',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
          $slots.prefix ? 'pl-9' : 'pl-3',
          $slots.suffix ? 'pr-9' : 'pr-3',
          error ? 'border-danger focus:border-danger' : warning ? 'border-warning' : 'border-gray-300',
        ]"
        @input="onInput"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />

      <!-- Suffix icon slot -->
      <span
        v-if="$slots.suffix"
        class="absolute right-3 flex items-center text-gray-400"
      >
        <slot name="suffix" />
      </span>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-xs text-danger-text">{{ error }}</p>

    <p v-else-if="warning" class="text-xs text-warning-text">{{ warning }}</p>

    <!-- Hint -->
    <p v-else-if="hint" class="text-xs text-gray-500">{{ hint }}</p>
  </div>
</template>
