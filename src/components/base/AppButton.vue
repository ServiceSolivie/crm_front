<script setup>
import AppSpinner from './AppSpinner.vue'

defineProps({
  variant: {
    type: String,
    default: 'primary',
    // primary | secondary | ghost | danger | icon
  },
  size: {
    type: String,
    default: 'md',
    // sm | md | lg
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
  as: { type: String, default: 'button' },
})

const variantClasses = {
  primary:
    'bg-primary hover:bg-primary-hover text-white border-transparent',
  secondary:
    'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
  ghost:
    'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 border-transparent',
  danger:
    'bg-urgent hover:bg-red-700 text-white border-transparent',
  icon:
    'bg-transparent hover:bg-gray-100 text-gray-500 border-gray-200',
}

const sizeClasses = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
}
</script>

<template>
  <component
    :is="as"
    :type="as === 'button' ? type : undefined"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium border transition-all duration-150 select-none',
      'focus:outline-none focus-ring',
      'disabled:opacity-45 disabled:cursor-not-allowed',
      variantClasses[variant],
      sizeClasses[size],
      loading ? 'cursor-wait' : '',
    ]"
  >
    <!-- Leading slot (icon) -->
    <span v-if="$slots.icon && !loading" class="shrink-0">
      <slot name="icon" />
    </span>

    <!-- Loading spinner -->
    <AppSpinner v-if="loading" :size="size === 'lg' ? 20 : 16" class="shrink-0" />

    <!-- Label -->
    <span v-if="$slots.default">
      <slot />
    </span>

    <!-- Trailing slot -->
    <span v-if="$slots.trailing" class="shrink-0">
      <slot name="trailing" />
    </span>
  </component>
</template>
