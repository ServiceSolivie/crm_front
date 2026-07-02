<script setup>
import { useI18n } from 'vue-i18n'
import AppBadge from '@/components/base/AppBadge.vue'
import { PAYMENT_STATUS } from '@/utils/enums'

defineProps({
  status: { type: String, default: '' },
  dot: { type: Boolean, default: false },
})

const { t } = useI18n()
</script>

<template>
  <AppBadge
    :variant="PAYMENT_STATUS[status]?.color ?? 'neutral'"
    :label="t('statuses.payment.' + status, status)"
    :dot="dot"
  />
</template>
