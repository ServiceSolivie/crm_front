<script setup>
import { useI18n } from 'vue-i18n'
import AppBadge from '@/components/base/AppBadge.vue'
import { DVC_STATUS } from '@/utils/enums'

defineProps({
  status: { type: String, default: '' },
  dot: { type: Boolean, default: false },
})

const { t } = useI18n()
</script>

<template>
  <AppBadge
    :variant="DVC_STATUS[status]?.color ?? 'neutral'"
    :label="t('statuses.dvc.' + status, status)"
    :dot="dot"
  />
</template>
