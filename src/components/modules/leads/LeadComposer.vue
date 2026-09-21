<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageSquare, Phone, CalendarPlus } from 'lucide-vue-next'

/**
 * "Add something" panel on the lead page: one of three actions is open at a time.
 * Notes and calls are posted from here; appointments hand off to the scheduling page.
 */
const props = defineProps({
  submittingNote: { type: Boolean, default: false },
  submittingCall: { type: Boolean, default: false },
  canSchedule: { type: Boolean, default: false },
  canLogCall: { type: Boolean, default: true },
})
const emit = defineEmits(['add-note', 'log-call', 'schedule'])
const { t } = useI18n()

const mode = ref('note') // note | call
const noteText = ref('')
const callOutcome = ref('')
const callNote = ref('')

const OUTCOMES = ['no_answer', 'voicemail', 'interested', 'not_interested', 'already_insured', 'other']

function submitNote() {
  const text = noteText.value.trim()
  if (!text || props.submittingNote) return
  emit('add-note', text)
}

function submitCall() {
  if (props.submittingCall) return
  emit('log-call', { outcome: callOutcome.value || null, note: callNote.value.trim() || null })
}

// Clear the form once the parent finishes submitting
watch(() => props.submittingNote, (now, before) => { if (before && !now) noteText.value = '' })
watch(() => props.submittingCall, (now, before) => {
  if (before && !now) { callOutcome.value = ''; callNote.value = '' }
})

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
      <button type="button" :aria-expanded="mode === 'note'" :class="[btn, mode === 'note' ? btnOn : btnOff]" @click="mode = 'note'">
        <MessageSquare class="w-3.5 h-3.5" />{{ t('leadDetail.composer.addNote') }}
      </button>
      <button v-if="canLogCall" type="button" :aria-expanded="mode === 'call'" :class="[btn, mode === 'call' ? btnOn : btnOff]" @click="mode = 'call'">
        <Phone class="w-3.5 h-3.5" />{{ t('leadDetail.composer.logCall') }}
      </button>
      <button v-if="canSchedule" type="button" :class="[btn, btnOff]" @click="emit('schedule')">
        <CalendarPlus class="w-3.5 h-3.5" />{{ t('leadDetail.composer.scheduleAppointment') }}
      </button>
    </div>

    <!-- Note -->
    <div v-if="mode === 'note'" class="border border-gray-200 rounded-[10px] bg-gray-50">
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

    <!-- Call -->
    <div v-else class="border border-gray-200 rounded-[10px] bg-gray-50 px-3.5 pt-2.5 pb-2.5 flex flex-col gap-2.5">
      <div>
        <p class="text-xs font-medium text-gray-600 mb-1.5">{{ t('leads.callOutcome') }}</p>
        <div class="flex flex-wrap gap-1.5" role="radiogroup" :aria-label="t('leads.callOutcome')">
          <button
            v-for="o in OUTCOMES"
            :key="o"
            type="button"
            role="radio"
            :aria-checked="callOutcome === o"
            :class="[
              'h-7.5 px-2.5 rounded-md border text-[12.5px]',
              callOutcome === o ? 'border-primary bg-primary-light text-indigo-800 font-medium' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
            ]"
            @click="callOutcome = callOutcome === o ? '' : o"
          >{{ t('leads.callOutcomes.' + o) }}</button>
        </div>
      </div>
      <label class="block">
        <span class="sr-only">{{ t('leads.notes') }}</span>
        <textarea
          v-model="callNote"
          rows="2"
          :placeholder="t('leads.callNotePlaceholder')"
          class="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none text-[13.5px] leading-5 text-gray-900 focus:border-primary"
          @keydown="onKeydown($event, submitCall)"
        />
      </label>
      <div class="flex justify-end">
        <button
          type="button"
          :disabled="submittingCall"
          class="h-8 px-3.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
          @click="submitCall"
        >{{ t('leads.logCall') }}</button>
      </div>
    </div>
  </section>
</template>
