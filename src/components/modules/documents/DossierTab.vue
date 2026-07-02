<script setup>
import { useI18n } from 'vue-i18n'
import { FolderOpen } from 'lucide-vue-next'
import AppProgressBar from '@/components/base/AppProgressBar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import DossierChecklist from './DossierChecklist.vue'
import ClientTypePrompt from './ClientTypePrompt.vue'

const { t } = useI18n()

defineProps({
  dossier: { type: Object, default: null },
  leadId: { type: [Number, String], required: true },
  loading: { type: Boolean, default: false },
  updatingClientType: { type: Boolean, default: false },
})

const emit = defineEmits(['upload', 'delete', 'download', 'preview', 'set-client-type'])
</script>

<template>
  <!-- Loading -->
  <div v-if="loading && !dossier" class="space-y-4">
    <AppSkeleton height="40px" />
    <AppSkeleton v-for="n in 4" :key="n" height="72px" class="rounded-xl" />
  </div>

  <!-- Needs client type -->
  <ClientTypePrompt
    v-else-if="dossier?.requires_client_type"
    :loading="updatingClientType"
    @select="(type) => emit('set-client-type', type)"
  />

  <!-- No required documents for this product -->
  <div v-else-if="dossier && dossier.total_required === 0" class="text-center py-10">
    <FolderOpen class="w-10 h-10 text-gray-300 mx-auto mb-2" />
    <p class="text-sm text-gray-500">{{ t('documents.noDocumentsRequired') }}</p>
  </div>

  <!-- Dossier content -->
  <div v-else-if="dossier">
    <!-- Progress header -->
    <div class="mb-5">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-gray-900">{{ t('documents.dossier') }}</h3>
        <span class="text-sm text-gray-500">
          {{ dossier.total_uploaded }} / {{ dossier.total_required }} {{ t('documents.documents') }}
        </span>
      </div>
      <AppProgressBar
        :value="dossier.completion"
        :color="dossier.completion === 100 ? 'bg-success' : 'bg-primary'"
        height="h-2"
        show-label
      />
    </div>

    <!-- Document checklist -->
    <DossierChecklist
      :documents="dossier.documents"
      :loading="loading"
      @upload="(formData) => emit('upload', formData)"
      @delete="(doc) => emit('delete', doc)"
      @download="(doc) => emit('download', doc)"
      @preview="(doc) => emit('preview', doc)"
    />
  </div>
</template>
