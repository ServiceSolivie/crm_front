<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Clock } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import { fromDatetimeLocalValue } from '@/utils/formatters'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  // Shown in the description ("Le statut de Karim Benali passera à Rappel…")
  leadName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])
const { t } = useI18n()

const date = ref('')
const time = ref('')
const notes = ref('')
const error = ref('')

watch(
  () => props.open,
  (val) => {
    if (val) {
      date.value = ''
      time.value = ''
      notes.value = ''
      error.value = ''
    }
  },
)

const p2 = (n) => String(n).padStart(2, '0')
const toDate = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const toTime = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}`

// Quick picks: in one hour (rounded to the next quarter), tomorrow 10:00, next Monday 09:00
const quickPicks = computed(() => {
  const now = new Date()
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
  inOneHour.setMinutes(Math.ceil(inOneHour.getMinutes() / 15) * 15, 0, 0)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0)
  const daysToMonday = ((8 - now.getDay()) % 7) || 7
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 9, 0)
  return [
    { key: 'hour', label: t('leads.rappelModal.inOneHour'), at: inOneHour },
    { key: 'tomorrow', label: t('leads.rappelModal.tomorrow'), at: tomorrow },
    { key: 'monday', label: t('leads.rappelModal.nextMonday'), at: monday },
  ]
})

function pick(at) {
  date.value = toDate(at)
  time.value = toTime(at)
  error.value = ''
}
const isPicked = (at) => date.value === toDate(at) && time.value === toTime(at)

function submit() {
  if (!date.value || !time.value) {
    error.value = t('leads.rappelModal.dateRequired')
    return
  }
  const local = `${date.value}T${time.value}`
  if (new Date(local).getTime() < Date.now() - 5 * 60 * 1000) {
    error.value = t('leads.rappelModal.pastDate')
    return
  }
  error.value = ''
  emit('confirm', { scheduled_at: fromDatetimeLocalValue(local), notes: notes.value.trim() || undefined })
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('leads.rappelModal.title')"
    :description="leadName ? t('leads.rappelModal.descriptionNamed', { name: leadName }) : t('leads.rappelModal.description')"
    :icon="Clock"
    tone="warning"
    size="md"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-3.5" novalidate @submit.prevent="submit">
      <div class="flex flex-wrap gap-1.5" role="group" :aria-label="t('leads.rappelModal.quickPicks')">
        <button
          v-for="q in quickPicks"
          :key="q.key"
          type="button"
          :aria-pressed="isPicked(q.at)"
          :class="[
            'h-7.5 px-2.5 rounded-md border text-[12.5px] transition-colors',
            isPicked(q.at) ? 'border-indigo-200 bg-primary-light text-indigo-800 font-medium' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
          ]"
          @click="pick(q.at)"
        >{{ q.label }}</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="date" type="date" :label="t('leads.rappelModal.date')" :error="error" required />
        <AppInput v-model="time" type="time" :label="t('leads.rappelModal.time')" required />
      </div>

      <AppTextarea
        v-model="notes"
        :label="t('leads.rappelModal.notesLabel')"
        :placeholder="t('leads.rappelModal.notesPlaceholder')"
        :rows="3"
      />
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1" />
    </form>

    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="submit">{{ t('leads.rappelModal.confirm') }}</AppButton>
    </template>
  </AppModal>
</template>
