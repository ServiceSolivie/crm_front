<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, Download, FileX } from 'lucide-vue-next'
import AppSpinner from '@/components/base/AppSpinner.vue'

const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
  document: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  blobUrl: { type: String, default: null },
})

const emit = defineEmits(['close', 'download'])

const isImage = ref(false)
const isPdf = ref(false)

watch(
  () => props.document,
  (doc) => {
    if (!doc) return
    const mime = doc.mime_type || ''
    isImage.value = mime.startsWith('image/')
    isPdf.value = mime === 'application/pdf'
  },
  { immediate: true },
)

function close() {
  emit('close')
}

function handleKey(e) {
  if (e.key === 'Escape' && props.open) close()
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- Panel -->
        <div
          class="relative w-full max-w-5xl bg-white rounded-2xl shadow-modal flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div class="flex-1 min-w-0">
              <h2 class="text-base font-semibold text-gray-900 truncate">
                {{ document?.original_filename }}
              </h2>
              <p v-if="document?.type_label" class="text-xs text-gray-400 mt-0.5">
                {{ document.type_label }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                class="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
                :title="t('documents.download')"
                @click="emit('download')"
              >
                <Download class="w-4 h-4" />
              </button>
              <button
                class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                @click="close"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-auto flex items-center justify-center bg-gray-50 min-h-[400px]">
            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center gap-3">
              <AppSpinner :size="32" />
            </div>

            <!-- Image preview -->
            <img
              v-else-if="blobUrl && isImage"
              :src="blobUrl"
              :alt="document?.original_filename"
              class="max-w-full max-h-[75vh] object-contain p-4"
            />

            <!-- PDF preview -->
            <iframe
              v-else-if="blobUrl && isPdf"
              :src="blobUrl"
              class="w-full h-[75vh] border-0"
            />

            <!-- Unsupported type -->
            <div v-else-if="!loading" class="flex flex-col items-center gap-3 text-gray-400">
              <FileX class="w-12 h-12" />
              <p class="text-sm">{{ t('documents.previewUnavailable') }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
