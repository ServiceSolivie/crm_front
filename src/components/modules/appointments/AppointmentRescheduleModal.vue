<script setup>
import { ref, watch } from 'vue'
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
    error.value = 'Please select a new date and time.'
    return
  }
  error.value = ''
  emit('reschedule', fromDatetimeLocalValue(scheduledAt.value))
}
</script>

<template>
  <AppModal :open="open" title="Reschedule Appointment" size="sm" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">Select the new date and time for this appointment.</p>

      <AppInput
        v-model="scheduledAt"
        type="datetime-local"
        label="New Date & Time"
        :error="error"
        required
      />
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">Cancel</AppButton>
      <AppButton :loading="loading" @click="submit">Reschedule</AppButton>
    </template>
  </AppModal>
</template>
