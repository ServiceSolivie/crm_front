<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'

const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
  documentTypeLabel: { type: String, default: '' },
  documentType: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'upload'])

const file = ref(null)
const dragOver = ref(false)
const inputRef = ref(null)
const error = ref('')

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

const fileInfo = computed(() => {
  if (!file.value) return null
  const size = file.value.size
  const label = size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`
  return { name: file.value.name, size: label }
})

function validateFile(f) {
  if (!ACCEPTED_TYPES.includes(f.type)) {
    error.value = t('documents.errorUnsupportedFormat')
    return false
  }
  if (f.size > MAX_SIZE) {
    error.value = t('documents.errorFileTooBig')
    return false
  }
  error.value = ''
  return true
}

function onFileSelect(e) {
  const f = e.target.files?.[0]
  if (f && validateFile(f)) file.value = f
}

function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer.files?.[0]
  if (f && validateFile(f)) file.value = f
}

function submit() {
  if (!file.value) return
  const formData = new FormData()
  formData.append('document_type', props.documentType)
  formData.append('file', file.value)
  emit('upload', formData)
}

function close() {
  file.value = null
  error.value = ''
  emit('close')
}
</script>

<template>
  <AppModal :open="open" :title="t('documents.uploadTitle', { type: documentTypeLabel })" @close="close">
    <div
      :class="[
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
        dragOver ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-gray-300',
      ]"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
      @click="inputRef?.click()"
    >
      <input
        ref="inputRef"
        type="file"
        class="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        @change="onFileSelect"
      />
      <Upload class="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <p class="text-sm text-gray-600 mb-1">
        {{ t('documents.dropzoneText') }} <span class="text-primary font-medium">{{ t('documents.browse') }}</span>
      </p>
      <p class="text-xs text-gray-400">{{ t('documents.dropzoneHint') }}</p>
    </div>

    <div v-if="fileInfo" class="mt-4 flex items-center gap-3 p-3 rounded-lg bg-gray-50">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">{{ fileInfo.name }}</p>
        <p class="text-xs text-gray-400">{{ fileInfo.size }}</p>
      </div>
      <button
        class="text-xs text-gray-400 hover:text-danger transition-colors"
        @click.stop="file = null"
      >
        {{ t('documents.remove') }}
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-danger">{{ error }}</p>

    <template #footer>
      <AppButton variant="ghost" @click="close">{{ t('documents.cancel') }}</AppButton>
      <AppButton :disabled="!file" :loading="loading" @click="submit">{{ t('documents.upload') }}</AppButton>
    </template>
  </AppModal>
</template>
