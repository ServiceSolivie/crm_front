<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '@/utils/formatters'

const props = defineProps({
  open: { type: Boolean, default: false },
  currentDate: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'reschedule'])
const { t } = useI18n()

const scheduledAt = ref('')
const error = ref('')

watch(
  () => props.open,
  (val) => {
    if (val) {
      scheduledAt.value = toDatetimeLocalValue(props.currentDate)
      error.value = ''
    }
  },
)

function submit() {
  if (!scheduledAt.value) {
    error.value = t('reschedule.required')
    return
  }
  error.value = ''
  emit('reschedule', fromDatetimeLocalValue(scheduledAt.value))
}
</script>

<template>
  <AppModal :open="open" :title="t('reschedule.title')" size="sm" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">{{ t('reschedule.description') }}</p>

      <AppInput
        v-model="scheduledAt"
        type="datetime-local"
        :label="t('reschedule.label')"
        :error="error"
        required
      />
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="submit">{{ t('reschedule.confirm') }}</AppButton>
    </template>
  </AppModal>
</template>
