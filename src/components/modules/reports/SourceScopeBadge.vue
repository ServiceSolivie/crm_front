<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Filter } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Shown to a marketing user limited to some lead sources: the data on the page covers only those.
 */
const { t } = useI18n()
const auth = useAuthStore()
const names = computed(() => (auth.user?.lead_sources ?? []).map((s) => s.name).join(', '))
</script>

<template>
  <span
    v-if="names"
    class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary-light text-indigo-800 text-xs"
    :title="t('common.sourcesScopeHint')"
  >
    <Filter class="w-3.5 h-3.5" />
    {{ t('common.sourcesScope', { names }) }}
  </span>
</template>
