<script setup>
import AppBadge from '@/components/base/AppBadge.vue'
import { PAYMENT_STATUS } from '@/utils/enums'

defineProps({
  status: { type: String, default: '' },
  dot: { type: Boolean, default: false },
})
</script>

<template>
  <AppBadge
    :variant="PAYMENT_STATUS[status]?.color ?? 'neutral'"
    :label="PAYMENT_STATUS[status]?.label ?? status"
    :dot="dot"
  />
</template>
