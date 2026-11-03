<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageSquare, CalendarPlus } from 'lucide-vue-next'

/**
 * "Add something" panel on the lead page: a note, posted from here, or an
 * appointment, handed off to the scheduling page. Calls are not logged here:
 * they come from Ringover.
 */
const props = defineProps({
  submittingNote: { type: Boolean, default: false },
  canSchedule: { type: Boolean, default: false },
})
const emit = defineEmits(['add-note', 'schedule'])
const { t } = useI18n()

const noteText = ref('')

function submitNote() {
  const text = noteText.value.trim()
  if (!text || props.submittingNote) return
  emit('add-note', text)
}

// Clear the form once the parent finishes submitting
watch(() => props.submittingNote, (now, before) => { if (before && !now) noteText.value = '' })

function onKeydown(e, submit) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    submit()
  }
}

const btn = 'h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-[13px] transition-colors'
const btnOn = 'border-primary bg-primary-light text-indigo-800 font-medium'
const btnOff = 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
</script>

<template>
  <section class="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-3">
    <div class="flex flex-wrap gap-2">
      <span :class="[btn, btnOn]">
        <MessageSquare class="w-3.5 h-3.5" />{{ t('leadDetail.composer.addNote') }}
      </span>
      <button v-if="canSchedule" type="button" :class="[btn, btnOff]" @click="emit('schedule')">
        <CalendarPlus class="w-3.5 h-3.5" />{{ t('leadDetail.composer.scheduleAppointment') }}
      </button>
    </div>

    <!-- Note -->
    <div class="border border-gray-200 rounded-[10px] bg-gray-50">
      <label class="block px-3.5 pt-2.5">
        <span class="block text-xs font-medium text-gray-600 mb-1">{{ t('leadDetail.composer.newNote') }}</span>
        <textarea
          v-model="noteText"
          rows="3"
          :placeholder="t('leadDetail.composer.notePlaceholder')"
          class="w-full resize-none bg-transparent outline-none text-[13.5px] leading-5 text-gray-900"
          @keydown="onKeydown($event, submitNote)"
        />
      </label>
      <div class="flex items-center gap-2 px-2.5 pb-2.5 pl-3.5">
        <span class="flex-1 text-xs text-gray-500 hidden sm:block">{{ t('leadDetail.composer.shortcut') }}</span>
        <button type="button" class="h-8 px-3 rounded-lg text-[13px] text-gray-600 hover:text-gray-900" @click="noteText = ''">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          :disabled="!noteText.trim() || submittingNote"
          class="h-8 px-3.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
          @click="submitNote"
        >{{ t('leadDetail.composer.saveNote') }}</button>
      </div>
    </div>
  </section>
</template>
