<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, UserSearch, X, Sparkles } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useContractsStore } from '@/stores/contracts.store'
import { leadsApi } from '@/api/leads'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadPickerModal from '@/components/modules/contracts/LeadPickerModal.vue'
import DvcSchemaForm from '@/components/modules/contracts/DvcSchemaForm.vue'
import DocumentPreviewModal from '@/components/modules/documents/DocumentPreviewModal.vue'
import { blankDvcValues, applyDvcValues, dvcFieldErrors } from '@/utils/dvcSchema'
import { firstErrorMessage } from '@/utils/errors'

const { t } = useI18n()
const store = useContractsStore()
const toast = useToast()

const template = ref(null)
const templateKey = ref('')
const form = reactive({})
const fieldErrors = ref({})
const linkedLead = ref(null)
const showLeadPicker = ref(false)

const previewContract = ref(null)
const previewBlobUrl = ref(null)
const previewLoading = ref(false)

const templateOptions = computed(() =>
  store.templates.map((tpl) => ({ value: tpl.key, label: tpl.label })),
)

const route = useRoute()

onMounted(async () => {
  try {
    await store.fetchTemplates({ force: true })
    // Opened with a lead: pick the DVC type of its insurance type and link the lead
    const lead = route.query.lead_id ? (await leadsApi.get(route.query.lead_id).catch(() => null))?.data : null
    if (store.templates.length) {
      const forProduct = lead?.insurance_type
        ? store.templates.find((tpl) => tpl.insurance_type === lead.insurance_type)
        : null
      templateKey.value = (forProduct ?? store.templates[0]).key
      await selectTemplate(templateKey.value)
    }
    if (lead) await onLeadSelected(lead)
  } catch {
    toast.showError(t('contracts.loadFailed'))
  }
})

async function selectTemplate(key) {
  template.value = store.templates.find((tpl) => tpl.key === key) ?? null
  if (!template.value) return

  // Reset the form to the DVC type's field set
  Object.keys(form).forEach((k) => delete form[k])
  fieldErrors.value = {}
  Object.assign(form, blankDvcValues(template.value.schema))

  // Server defaults (agent identity etc.), and the lead's values if one is linked
  try {
    applyValues(await store.fetchPrefill(key, linkedLead.value?.id))
  } catch {
    /* non-blocking */
  }
}

function applyValues(values) {
  applyDvcValues(form, values)
}

async function onLeadSelected(lead) {
  showLeadPicker.value = false
  linkedLead.value = lead
  try {
    applyValues(await store.fetchPrefill(templateKey.value, lead.id))
    toast.showSuccess(t('contracts.prefilled'))
  } catch (e) {
    toast.showError(e?.message ?? t('contracts.loadFailed'))
  }
}

function clearLead() {
  linkedLead.value = null
}

const leadName = computed(() =>
  linkedLead.value
    ? [linkedLead.value.first_name, linkedLead.value.last_name].filter(Boolean).join(' ')
    : '',
)

async function generate() {
  fieldErrors.value = {}
  try {
    const contract = await store.generate({
      template_key: templateKey.value,
      dvc_type_version_id: template.value?.version_id ?? null,
      lead_id: linkedLead.value?.id ?? null,
      data: { ...form },
    })
    toast.showSuccess(t('contracts.generated'))
    await openPreview(contract)
  } catch (e) {
    fieldErrors.value = dvcFieldErrors(e?.errors)
    toast.showError(firstErrorMessage(e, t('contracts.generateFailed')))
  }
}

async function openPreview(contract) {
  previewContract.value = {
    original_filename: contract.original_filename,
    mime_type: 'application/pdf',
    type_label: contract.reference,
  }
  previewLoading.value = true
  previewBlobUrl.value = null
  try {
    previewBlobUrl.value = URL.createObjectURL(await store.downloadBlob(contract.id))
    previewContract.value._id = contract.id
  } catch (e) {
    toast.showError(e?.message ?? t('contracts.loadFailed'))
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  if (previewBlobUrl.value) URL.revokeObjectURL(previewBlobUrl.value)
  previewContract.value = null
  previewBlobUrl.value = null
}

function downloadFromPreview() {
  if (!previewBlobUrl.value || !previewContract.value) return
  const link = document.createElement('a')
  link.href = previewBlobUrl.value
  link.setAttribute('download', previewContract.value.original_filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
}
</script>

<template>
  <div class="max-w-4xl mx-auto flex flex-col gap-4 pb-24">
    <AppPageHeader
      :title="t('contracts.newContract')"
      :subtitle="t('contracts.newContractSub')"
      :breadcrumb="[{ label: t('contracts.title'), to: '/contracts' }, { label: t('contracts.newContract') }]"
    />

    <!-- Template + lead selection -->
    <AppCard>
      <div class="flex flex-col sm:flex-row sm:items-end gap-4">
        <div class="flex-1">
          <AppSelect
            v-model="templateKey"
            :label="t('contracts.template')"
            :options="templateOptions"
            @update:model-value="selectTemplate"
          />
        </div>
        <div class="flex items-center gap-2">
          <div
            v-if="linkedLead"
            class="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-full bg-primary-light"
          >
            <AppAvatar :name="leadName" size="xs" />
            <span class="text-sm font-medium text-primary truncate max-w-[160px]">{{ leadName }}</span>
            <button
              class="p-1 rounded-full text-primary hover:bg-white/60 transition-colors"
              @click="clearLead"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <AppButton variant="secondary" @click="showLeadPicker = true">
            <template #icon><UserSearch class="w-4 h-4" /></template>
            {{ linkedLead ? t('contracts.changeLead') : t('contracts.fillFromLead') }}
          </AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Loading skeleton -->
    <AppCard v-if="store.loading.templates">
      <div class="space-y-4">
        <AppSkeleton v-for="n in 5" :key="n" height="44px" />
      </div>
    </AppCard>

    <!-- Form generated from the DVC type's schema -->
    <AppCard v-else-if="template">
      <h2 class="font-display text-[15px] font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText class="w-4 h-4 text-primary" />
        {{ template.label }}
      </h2>
      <DvcSchemaForm v-model="form" :schema="template.schema" :errors="fieldErrors" />
    </AppCard>

    <!-- Sticky generate bar -->
    <div
      class="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur border-t border-gray-200 px-6 py-3 z-20"
    >
      <div class="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <p class="text-xs text-gray-400 hidden sm:block">{{ t('contracts.generateHint') }}</p>
        <AppButton :loading="store.loading.generate" @click="generate">
          <template #icon><Sparkles class="w-4 h-4" /></template>
          {{ t('contracts.generatePdf') }}
        </AppButton>
      </div>
    </div>

    <!-- Lead picker -->
    <LeadPickerModal
      :open="showLeadPicker"
      @close="showLeadPicker = false"
      @select="onLeadSelected"
    />

    <!-- Preview -->
    <DocumentPreviewModal
      :open="!!previewContract"
      :document="previewContract"
      :blob-url="previewBlobUrl"
      :loading="previewLoading"
      @close="closePreview"
      @download="downloadFromPreview"
    />
  </div>
</template>
