<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  missingDocuments: { type: Array, default: () => [] }, // [{ type, type_label }]
})

const emit = defineEmits(['close', 'confirm'])
const { t } = useI18n()

const ISSUE_TYPES = [
  { key: 'documents_manquants', label: 'Documents manquants' },
  { key: 'information_manquante', label: 'Information manquante' },
  { key: 'information_incorrecte', label: 'Information incorrecte' },
]

const selectedTypes = ref([])
const selectedDocuments = ref([])
const comment = ref('')
const error = ref('')

watch(
  () => props.open,
  (val) => {
    if (val) {
      selectedTypes.value = []
      selectedDocuments.value = props.missingDocuments.map((d) => d.type_label)
      comment.value = ''
      error.value = ''
    }
  },
)

const showDocumentChecklist = computed(() => selectedTypes.value.includes('documents_manquants'))

function toggleType(key) {
  const idx = selectedTypes.value.indexOf(key)
  if (idx === -1) selectedTypes.value.push(key)
  else selectedTypes.value.splice(idx, 1)
}

function toggleDocument(label) {
  const idx = selectedDocuments.value.indexOf(label)
  if (idx === -1) selectedDocuments.value.push(label)
  else selectedDocuments.value.splice(idx, 1)
}

function submit() {
  if (selectedTypes.value.length === 0) {
    error.value = 'Sélectionnez au moins une catégorie'
    return
  }
  error.value = ''
  emit('confirm', {
    issue_types: [...selectedTypes.value],
    missing_documents: showDocumentChecklist.value ? [...selectedDocuments.value] : undefined,
    comment: comment.value || undefined,
  })
}
</script>

<template>
  <AppModal :open="open" title="Signaler un problème" size="md" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">
        Le lead sera renvoyé à l'agent avec le statut "À corriger" et les points ci-dessous.
      </p>

      <div class="space-y-2">
        <label
          v-for="issue in ISSUE_TYPES"
          :key="issue.key"
          class="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            type="checkbox"
            :checked="selectedTypes.includes(issue.key)"
            class="rounded border-gray-300 text-primary focus:ring-primary"
            @change="toggleType(issue.key)"
          >
          <span class="text-sm text-gray-900">{{ issue.label }}</span>
        </label>
      </div>

      <div v-if="showDocumentChecklist" class="pl-3 border-l-2 border-primary/20 space-y-1.5">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Documents manquants</p>
        <p v-if="missingDocuments.length === 0" class="text-sm text-gray-400">
          Aucun document manquant détecté dans le dossier.
        </p>
        <label
          v-for="doc in missingDocuments"
          :key="doc.type"
          class="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="selectedDocuments.includes(doc.type_label)"
            class="rounded border-gray-300 text-primary focus:ring-primary"
            @change="toggleDocument(doc.type_label)"
          >
          {{ doc.type_label }}
        </label>
      </div>

      <AppTextarea
        v-model="comment"
        label="Commentaire"
        placeholder="Précisez ce qui manque ou ce qui est incorrect..."
        :rows="3"
      />

      <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="submit">Signaler</AppButton>
    </template>
  </AppModal>
</template>
