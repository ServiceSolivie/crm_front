<script setup>
import { useI18n } from 'vue-i18n'
import AppBadge from '@/components/base/AppBadge.vue'
import { PAYMENT_RECORD_STATUS } from '@/utils/enums'

defineProps({
  status: { type: String, default: '' },
  dot: { type: Boolean, default: false },
})

const { t } = useI18n()
</script>

<template>
  <AppBadge
    :variant="PAYMENT_RECORD_STATUS[status]?.color ?? 'neutral'"
    :label="t('statuses.paymentRecord.' + status, status)"
    :dot="dot"
  />
</template>
