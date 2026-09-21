<script setup>
defineProps({
  padding: { type: String, default: 'md' }, // sm | md | lg | none
  class: { type: String, default: '' },
})

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl border border-gray-200',
      paddingClasses[padding],
      $props.class,
    ]"
  >
    <slot />
  </div>
</template>
