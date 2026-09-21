<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Upload, FileText, X, Info } from 'lucide-vue-next'
import { useLeadImportsStore } from '@/stores/leadImports.store'
import { useToast } from '@/composables/useToast'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppButton from '@/components/base/AppButton.vue'

const router = useRouter()
const store = useLeadImportsStore()
const toast = useToast()
const { t } = useI18n()

const file = ref(null)
const dragOver = ref(false)
const fileError = ref('')
const inputRef = ref(null)

function onFileChange(e) {
  setFile(e.target.files?.[0])
}

function onDrop(e) {
  dragOver.value = false
  setFile(e.dataTransfer?.files?.[0])
}

function setFile(f) {
  fileError.value = ''
  if (!f) return
  if (!f.name.toLowerCase().endsWith('.csv')) {
    fileError.value = t('imports.errors.csvOnly')
    return
  }
  if (f.size > 10 * 1024 * 1024) {
    fileError.value = t('imports.errors.tooBig')
    return
  }
  file.value = f
}

function clearFile() {
  file.value = null
  fileError.value = ''
  if (inputRef.value) inputRef.value.value = ''
}

async function submit() {
  if (!file.value) {
    fileError.value = t('imports.errors.noFile')
    return
  }
  try {
    await store.upload(file.value)
    toast.showSuccess(t('imports.started'))
    router.push({ name: 'lead-imports' })
  } catch (e) {
    toast.showError(e?.message ?? t('imports.errors.upload'))
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-2xl mx-auto">
    <AppPageHeader
      :title="t('imports.createTitle')"
      :subtitle="t('imports.createSubtitle')"
      :breadcrumb="[{ label: t('imports.title'), to: '/lead-imports' }, { label: t('imports.createTitle') }]"
    />

    <section class="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <!-- Format -->
      <div class="flex gap-3 rounded-[10px] bg-info-bg/60 border border-blue-100 p-3.5 text-[13px] text-info-text">
        <Info class="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p class="font-medium mb-1">{{ t('imports.format.title') }}</p>
          <ul class="list-disc list-inside space-y-0.5 text-[12.5px]">
            <li>{{ t('imports.format.required') }} <span class="font-mono">name</span>, <span class="font-mono">phone</span></li>
            <li>{{ t('imports.format.optional') }} <span class="font-mono">email, insurance_type, source</span></li>
            <li>{{ t('imports.format.header') }}</li>
            <li>{{ t('imports.format.size') }}</li>
          </ul>
        </div>
      </div>

      <!-- Drop zone -->
      <div
        role="button"
        tabindex="0"
        :aria-label="t('imports.dragDrop')"
        :class="[
          'border-2 border-dashed rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:border-primary',
          dragOver ? 'border-primary bg-primary-light/50' : 'border-gray-300 hover:border-primary/60',
          fileError ? 'border-danger bg-danger-bg/30' : '',
        ]"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        @click="inputRef?.click()"
        @keydown.enter.prevent="inputRef?.click()"
        @keydown.space.prevent="inputRef?.click()"
      >
        <input ref="inputRef" type="file" accept=".csv" class="hidden" @change="onFileChange" />

        <div v-if="!file" class="flex flex-col items-center justify-center py-12 px-6 text-center">
          <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center mb-3">
            <Upload class="w-5 h-5" />
          </span>
          <p class="text-[13.5px] font-medium text-gray-900">{{ t('imports.dragDrop') }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ t('imports.csvOnly') }}</p>
        </div>

        <div v-else class="flex items-center gap-3.5 p-4" @click.stop>
          <span class="w-11 h-11 rounded-lg bg-success-bg text-success-text flex items-center justify-center shrink-0">
            <FileText class="w-5 h-5" />
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-[13.5px] font-medium text-gray-900 truncate">{{ file.name }}</p>
            <p class="font-mono text-xs text-gray-500 mt-0.5">{{ formatSize(file.size) }}</p>
          </div>
          <button
            type="button"
            :aria-label="t('documents.remove')"
            class="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
            @click.stop="clearFile"
          ><X class="w-4 h-4" /></button>
        </div>
      </div>

      <p v-if="fileError" class="text-xs text-danger-text -mt-2">{{ fileError }}</p>

      <div class="flex items-center justify-end gap-2 pt-1">
        <AppButton variant="secondary" @click="router.back()">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.upload" :disabled="!file" @click="submit">
          <template #icon><Upload class="w-4 h-4" /></template>
          {{ t('imports.submit') }}
        </AppButton>
      </div>
    </section>
  </div>
</template>
