<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'

const { t } = useI18n()

defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])
const selected = ref(null)

function select(type) {
  selected.value = type
  emit('select', type)
}
</script>

<template>
  <div class="text-center py-10">
    <FileText class="w-10 h-10 text-gray-300 mx-auto mb-3" />
    <h3 class="text-sm font-semibold text-gray-900 mb-1">{{ t('documents.clientTypeRequired') }}</h3>
    <p class="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
      {{ t('documents.clientTypeDescription') }}
    </p>
    <div class="flex items-center justify-center gap-3">
      <AppButton
        variant="ghost"
        size="sm"
        :loading="loading && selected === 'INDIVIDUAL'"
        :disabled="loading"
        @click="select('INDIVIDUAL')"
      >
        {{ t('documents.individual') }}
      </AppButton>
      <AppButton
        size="sm"
        :loading="loading && selected === 'PROFESSIONAL'"
        :disabled="loading"
        @click="select('PROFESSIONAL')"
      >
        {{ t('documents.professional') }}
      </AppButton>
    </div>
  </div>
</template>
