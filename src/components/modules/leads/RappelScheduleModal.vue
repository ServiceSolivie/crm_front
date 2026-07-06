<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])
const { t } = useI18n()

const scheduledAt = ref('')
const notes = ref('')
const error = ref('')

watch(
  () => props.open,
  (val) => {
    if (val) {
      scheduledAt.value = ''
      notes.value = ''
      error.value = ''
    }
  },
)

function submit() {
  if (!scheduledAt.value) {
    error.value = t('leads.rappelModal.dateRequired')
    return
  }
  error.value = ''
  emit('confirm', { scheduled_at: scheduledAt.value, notes: notes.value || undefined })
}
</script>

<template>
  <AppModal :open="open" :title="t('leads.rappelModal.title')" size="sm" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">{{ t('leads.rappelModal.description') }}</p>

      <AppInput
        v-model="scheduledAt"
        type="datetime-local"
        :label="t('leads.rappelModal.dateLabel')"
        :error="error"
        required
      />

      <AppTextarea
        v-model="notes"
        :label="t('leads.rappelModal.notesLabel')"
        :placeholder="t('leads.rappelModal.notesPlaceholder')"
        :rows="3"
      />
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="submit">{{ t('leads.rappelModal.confirm') }}</AppButton>
    </template>
  </AppModal>
</template>
