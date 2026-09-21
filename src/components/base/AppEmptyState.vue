<script setup>
import { useI18n } from 'vue-i18n'
import { Inbox } from 'lucide-vue-next'

defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  icon: { type: Object, default: () => Inbox },
})

const emit = defineEmits(['action'])
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-14 px-6 text-center">
    <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center mb-1">
      <component :is="icon" class="w-5 h-5" />
    </span>
    <h3 class="font-display text-base font-semibold text-gray-900">{{ title || t('common.noResults') }}</h3>
    <p v-if="description" class="text-[13px] leading-[19px] text-gray-600 max-w-sm">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="mt-2 h-8.5 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
      @click="emit('action')"
    >{{ actionLabel }}</button>
    <!-- Optional slot for custom actions -->
    <slot />
  </div>
</template>
