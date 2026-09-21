<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
defineProps({
  size: { type: Number, default: 20 },
  color: { type: String, default: 'currentColor' },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="color"
    stroke-width="2.5"
    stroke-linecap="round"
    class="animate-spin"
    :aria-label="t('common.loading')"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
</template>
