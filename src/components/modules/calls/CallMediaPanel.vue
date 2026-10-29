<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Voicemail, FileText, Loader2 } from 'lucide-vue-next'
import { callsApi } from '@/api/calls'

/**
 * Recording, voicemail and transcription of a call. Files are downloaded
 * through the CRM (which checks the permission) only when asked for.
 */
const props = defineProps({
  // CallResource: id, has_recording, has_voicemail, has_transcription, can_listen
  call: { type: Object, required: true },
})

const { t } = useI18n()

const audioUrl = ref(null)
const audioKind = ref(null)
const transcription = ref(null)
const loading = ref(null)
const error = ref('')

async function load(kind) {
  if (loading.value) return
  error.value = ''
  loading.value = kind
  try {
    const blob = await callsApi.media(props.call.id, kind)
    if (kind === 'transcription') {
      transcription.value = await blob.text()
    } else {
      if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = URL.createObjectURL(blob)
      audioKind.value = kind
    }
  } catch (e) {
    // With blob responses the API's error message is not readable: use the error type.
    error.value = {
      forbidden: t('calls.media.forbidden'),
      not_found: t('calls.media.notAvailable'),
    }[e?.type] ?? t('calls.media.loadError')
  } finally {
    loading.value = null
  }
}

onBeforeUnmount(() => {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
})
</script>

<template>
  <div v-if="call.can_listen && (call.has_recording || call.has_voicemail || call.has_transcription)" class="space-y-2">
    <div class="flex flex-wrap gap-2">
      <button
        v-if="call.has_recording"
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary-light text-primary hover:brightness-95 cursor-pointer disabled:opacity-50"
        :disabled="!!loading"
        @click="load('recording')"
      >
        <Loader2 v-if="loading === 'recording'" class="w-3.5 h-3.5 animate-spin" />
        <Play v-else class="w-3.5 h-3.5" />
        {{ t('calls.media.recording') }}
      </button>
      <button
        v-if="call.has_voicemail"
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-warning-bg text-warning hover:brightness-95 cursor-pointer disabled:opacity-50"
        :disabled="!!loading"
        @click="load('voicemail')"
      >
        <Loader2 v-if="loading === 'voicemail'" class="w-3.5 h-3.5 animate-spin" />
        <Voicemail v-else class="w-3.5 h-3.5" />
        {{ t('calls.media.voicemail') }}
      </button>
      <button
        v-if="call.has_transcription"
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:brightness-95 cursor-pointer disabled:opacity-50"
        :disabled="!!loading"
        @click="load('transcription')"
      >
        <Loader2 v-if="loading === 'transcription'" class="w-3.5 h-3.5 animate-spin" />
        <FileText v-else class="w-3.5 h-3.5" />
        {{ t('calls.media.transcription') }}
      </button>
    </div>

    <audio v-if="audioUrl" :key="audioUrl" :src="audioUrl" controls autoplay class="w-full h-10" :aria-label="t(`calls.media.${audioKind}`)" />

    <pre v-if="transcription !== null" class="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{{ transcription }}</pre>

    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
