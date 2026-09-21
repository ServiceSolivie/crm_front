<script setup>
defineProps({
  variant: {
    type: String,
    default: 'neutral',
    // success | danger | warning | info | neutral
  },
  label: { type: String, default: '' },
  dot: { type: Boolean, default: false },
})

const variantClasses = {
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger-bg text-danger-text',
  warning: 'bg-warning-bg text-warning-text',
  info: 'bg-info-bg text-info-text',
  neutral: 'bg-neutral-bg text-neutral-text',
}

const dotColors = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  neutral: 'bg-neutral',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      variantClasses[variant],
    ]"
  >
    <span
      v-if="dot"
      :class="['w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant]]"
    />
    <slot>{{ label }}</slot>
  </span>
</template>
