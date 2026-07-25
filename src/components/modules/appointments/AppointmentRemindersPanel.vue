<script setup>
import { ref } from 'vue'
import { Plus, Trash2, Bell } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import { formatDateTime, fromDatetimeLocalValue } from '@/utils/formatters'

defineProps({
  reminders: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['add', 'remove'])

const showForm = ref(false)
const form = ref({ channel: 'email', remind_at: '', message: '' })

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push Notification' },
]

const CHANNEL_VARIANTS = {
  email: 'info',
  sms: 'success',
  whatsapp: 'success',
  push: 'warning',
}

function submit() {
  if (!form.value.remind_at) return
  emit('add', { ...form.value, remind_at: fromDatetimeLocalValue(form.value.remind_at) })
  showForm.value = false
  form.value = { channel: 'email', remind_at: '', message: '' }
}

function cancel() {
  showForm.value = false
  form.value = { channel: 'email', remind_at: '', message: '' }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Bell class="w-4 h-4 text-gray-400" />
        <span class="text-sm font-medium text-gray-700">Reminders</span>
        <span v-if="reminders.length" class="text-xs text-gray-400">({{ reminders.length }})</span>
      </div>
      <AppButton v-if="!showForm" size="sm" variant="ghost" @click="showForm = true">
        <template #icon><Plus class="w-3.5 h-3.5" /></template>
        Add
      </AppButton>
    </div>

    <!-- Add form -->
    <div
      v-if="showForm"
      class="border border-primary/30 bg-primary-light/30 rounded-xl p-4 space-y-3"
    >
      <div class="grid grid-cols-2 gap-3">
        <AppSelect
          v-model="form.channel"
          label="Channel"
          :options="CHANNEL_OPTIONS"
        />
        <AppInput
          v-model="form.remind_at"
          type="datetime-local"
          label="Remind At"
          required
        />
      </div>
      <AppInput
        v-model="form.message"
        label="Custom Message (optional)"
        placeholder="Leave blank to use default…"
      />
      <div class="flex justify-end gap-2">
        <AppButton size="sm" variant="ghost" @click="cancel">Cancel</AppButton>
        <AppButton size="sm" :loading="submitting" @click="submit">Save Reminder</AppButton>
      </div>
    </div>

    <!-- List -->
    <div class="space-y-2">
      <template v-if="loading">
        <div v-for="n in 2" :key="n" class="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <AppSkeleton width="56px" height="20px" class="rounded-full" />
          <AppSkeleton height="14px" class="flex-1" />
        </div>
      </template>

      <div
        v-else
        v-for="reminder in reminders"
        :key="reminder.id"
        class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <AppBadge
          :variant="CHANNEL_VARIANTS[reminder.channel] ?? 'neutral'"
          :label="reminder.channel"
        />
        <span class="text-sm text-gray-700 flex-1">{{ formatDateTime(reminder.remind_at) }}</span>
        <span v-if="reminder.sent_at" class="text-xs text-success font-medium">Sent</span>
        <button
          class="p-1 rounded text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
          @click="emit('remove', reminder.id)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>

      <p v-if="!loading && reminders.length === 0" class="text-sm text-gray-400 text-center py-4">
        No reminders set.
      </p>
    </div>
  </div>
</template>
