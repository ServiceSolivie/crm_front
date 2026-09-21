<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Bell, Mail, MessageSquare, Check } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { formatDateTime, fromDatetimeLocalValue } from '@/utils/formatters'

defineProps({
  reminders: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: true },
})

const emit = defineEmits(['add', 'remove'])
const { t } = useI18n()

const showForm = ref(false)
const EMPTY = { channel: 'in_app', remind_at: '', message: '' }
const form = ref({ ...EMPTY })
const error = ref('')

// Channels accepted by the API (ReminderChannelEnum): in_app, email, sms
const CHANNEL_ICONS = { in_app: Bell, email: Mail, sms: MessageSquare }
const channelOptions = computed(() =>
  Object.keys(CHANNEL_ICONS).map((value) => ({ value, label: t('reminders.channels.' + value) })),
)

function submit() {
  if (!form.value.remind_at) {
    error.value = t('reminders.dateRequired')
    return
  }
  error.value = ''
  emit('add', { ...form.value, message: form.value.message || undefined, remind_at: fromDatetimeLocalValue(form.value.remind_at) })
  showForm.value = false
  form.value = { ...EMPTY }
}

function cancel() {
  showForm.value = false
  error.value = ''
  form.value = { ...EMPTY }
}
</script>

<template>
  <section class="bg-white border border-gray-200 rounded-xl px-5 py-4.5 flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-display text-[15px] font-semibold text-gray-900 flex items-center gap-2">
        {{ t('reminders.title') }}
        <span v-if="reminders.length" class="font-mono text-xs text-gray-500 font-normal">{{ reminders.length }}</span>
      </h2>
      <button
        v-if="canEdit && !showForm"
        type="button"
        class="h-7.5 inline-flex items-center gap-1 px-2 rounded-md text-[13px] font-medium text-primary hover:bg-primary-light"
        @click="showForm = true"
      ><Plus class="w-3.5 h-3.5" />{{ t('reminders.add') }}</button>
    </div>

    <!-- Add form -->
    <div v-if="showForm" class="border border-gray-200 bg-gray-50 rounded-[10px] p-3.5 flex flex-col gap-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppSelect v-model="form.channel" :label="t('reminders.channel')" :options="channelOptions" />
        <AppInput v-model="form.remind_at" type="datetime-local" :label="t('reminders.remindAt')" :error="error" required />
      </div>
      <AppInput v-model="form.message" :label="t('reminders.message')" :placeholder="t('reminders.messagePlaceholder')" />
      <div class="flex justify-end gap-2">
        <AppButton size="sm" variant="secondary" @click="cancel">{{ t('common.cancel') }}</AppButton>
        <AppButton size="sm" :loading="submitting" @click="submit">{{ t('reminders.save') }}</AppButton>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="space-y-2">
      <AppSkeleton v-for="n in 2" :key="n" height="40px" />
    </div>
    <p v-else-if="!reminders.length" class="text-[13px] text-gray-500">{{ t('reminders.empty') }}</p>
    <ul v-else class="flex flex-col">
      <li
        v-for="reminder in reminders"
        :key="reminder.id"
        class="h-11 flex items-center gap-3 border-b border-gray-100 last:border-b-0 text-[13px]"
      >
        <span class="w-7 h-7 shrink-0 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
          <component :is="CHANNEL_ICONS[reminder.channel] ?? Bell" class="w-3.5 h-3.5" />
        </span>
        <span class="w-24 shrink-0 text-gray-600">{{ t('reminders.channels.' + reminder.channel, reminder.channel) }}</span>
        <span class="flex-1 font-mono text-[12.5px] text-gray-900">{{ formatDateTime(reminder.remind_at) }}</span>
        <span v-if="reminder.sent_at" class="inline-flex items-center gap-1 text-xs font-medium text-success-text">
          <Check class="w-3 h-3" />{{ t('reminders.sent') }}
        </span>
        <button
          v-if="canEdit"
          type="button"
          :aria-label="t('common.delete')"
          class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
          @click="emit('remove', reminder.id)"
        ><Trash2 class="w-3.5 h-3.5" /></button>
      </li>
    </ul>
  </section>
</template>
