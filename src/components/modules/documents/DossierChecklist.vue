<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload, Download, Trash2, FileCheck, FileMinus } from 'lucide-vue-next'
import AppBadge from '@/components/base/AppBadge.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import DocumentUploadModal from './DocumentUploadModal.vue'
import { useAuthStore } from '@/stores/auth.store'

const { t, locale } = useI18n()

defineProps({
  documents: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['upload', 'delete', 'download', 'preview'])

const auth = useAuthStore()
const uploadTarget = ref(null)
const actionId = ref(null)

function openUpload(doc) {
  uploadTarget.value = doc
}

function onUpload(formData) {
  emit('upload', formData)
  uploadTarget.value = null
}

function onDelete(doc) {
  actionId.value = doc.document.id
  emit('delete', doc.document)
}

function onDownload(doc) {
  emit('download', doc.document)
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="doc in documents"
      :key="doc.type"
      :class="[
        'flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors',
        doc.document ? 'cursor-pointer' : '',
      ]"
      @click="doc.document && emit('preview', doc)"
    >
      <!-- Icon -->
      <div
        :class="[
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          doc.status === 'uploaded' ? 'bg-success-bg' : 'bg-neutral-bg',
        ]"
      >
        <FileCheck v-if="doc.status === 'uploaded'" class="w-4 h-4 text-success" />
        <FileMinus v-else class="w-4 h-4 text-neutral" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-gray-900">{{ doc.type_label }}</span>
          <AppBadge
            :variant="doc.status === 'uploaded' ? 'success' : 'neutral'"
            :label="doc.status === 'uploaded' ? t('documents.uploaded') : t('documents.missing')"
            dot
          />
        </div>

        <!-- Uploaded info -->
        <div v-if="doc.document" class="mt-1.5 space-y-0.5">
          <p class="text-xs text-gray-500 truncate">{{ doc.document.original_filename }}</p>
          <p class="text-xs text-gray-400">
            {{ formatSize(doc.document.file_size) }} · {{ formatDate(doc.document.created_at) }}
            <span v-if="doc.document.uploaded_by">· {{ doc.document.uploaded_by.name }}</span>
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 shrink-0" @click.stop>
        <template v-if="doc.document">
          <button
            v-if="auth.can('DOCUMENTS_DOWNLOAD')"
            :title="t('documents.download')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
            @click="onDownload(doc)"
          >
            <Download class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="auth.can('DOCUMENTS_UPLOAD')"
            :title="t('documents.replace')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
            @click="openUpload(doc)"
          >
            <Upload class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="auth.can('DOCUMENTS_DELETE')"
            :title="t('documents.delete')"
            :disabled="actionId === doc.document.id"
            class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
            @click="onDelete(doc)"
          >
            <AppSpinner v-if="actionId === doc.document.id" :size="14" />
            <Trash2 v-else class="w-3.5 h-3.5" />
          </button>
        </template>
        <template v-else>
          <AppButton
            v-if="auth.can('DOCUMENTS_UPLOAD')"
            size="sm"
            variant="ghost"
            @click="openUpload(doc)"
          >
            <template #icon><Upload class="w-3.5 h-3.5" /></template>
            {{ t('documents.upload') }}
          </AppButton>
        </template>
      </div>
    </div>
  </div>

  <!-- Upload modal -->
  <DocumentUploadModal
    :open="!!uploadTarget"
    :document-type="uploadTarget?.type ?? ''"
    :document-type-label="uploadTarget?.type_label ?? ''"
    :loading="loading"
    @close="uploadTarget = null"
    @upload="onUpload"
  />
</template>
