<script setup>
import { useI18n } from 'vue-i18n'
import AppToggle from '@/components/base/AppToggle.vue'

/**
 * Agents only: a supervisor also sees their team's numbers on the
 * dashboard (their leads stay their own).
 */
const model = defineModel({ type: Boolean, default: false })
const { t } = useI18n()
</script>

<template>
  <div class="flex items-start gap-3 rounded-lg border border-gray-200 px-3.5 py-3">
    <AppToggle v-model="model" class="mt-0.5" :aria-label="t('users.supervisor.label')" />
    <div class="min-w-0">
      <p class="text-[13px] font-medium text-gray-900">{{ t('users.supervisor.label') }}</p>
      <p class="text-xs text-gray-500">{{ t('users.supervisor.hint') }}</p>
    </div>
  </div>
</template>
