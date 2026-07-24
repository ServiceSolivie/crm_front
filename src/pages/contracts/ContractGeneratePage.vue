<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, FileText, UserSearch, X, Sparkles } from 'lucide-vue-next'
import { useContractsStore } from '@/stores/contracts.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadPickerModal from '@/components/modules/contracts/LeadPickerModal.vue'
import DocumentPreviewModal from '@/components/modules/documents/DocumentPreviewModal.vue'

const router = useRouter()
const { t } = useI18n()
const store = useContractsStore()
const toast = useToast()

const template = ref(null)
const templateKey = ref('')
const form = reactive({})
const linkedLead = ref(null)
const showLeadPicker = ref(false)

const previewContract = ref(null)
const previewBlobUrl = ref(null)
const previewLoading = ref(false)

const templateOptions = computed(() =>
  store.templates.map((tpl) => ({ value: tpl.key, label: tpl.label })),
)

onMounted(async () => {
  try {
    await store.fetchTemplates()
    if (store.templates.length) {
      templateKey.value = store.templates[0].key
      await selectTemplate(templateKey.value)
    }
  } catch {
    toast.showError(t('contracts.loadFailed'))
  }
})

async function selectTemplate(key) {
  template.value = store.templates.find((tpl) => tpl.key === key) ?? null
  if (!template.value) return

  // Reset the form to the template's field set
  Object.keys(form).forEach((k) => delete form[k])
  for (const section of template.value.schema) {
    if (section.type === 'garanties') {
      for (const item of section.items) {
        form[`${item.key}_included`] = false
        form[`${item.key}_franchise`] = ''
      }
    } else {
      for (const field of section.fields) {
        form[field.key] = ''
      }
    }
  }

  // Server defaults (agent identity etc.)
  try {
    applyValues(await store.fetchPrefill(key, null))
  } catch {
    /* non-blocking */
  }
}

function applyValues(values) {
  Object.entries(values ?? {}).forEach(([k, v]) => {
    if (k in form) form[k] = typeof v === 'boolean' ? v : (v ?? '')
  })
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
  try {
    const contract = await store.generate({
      template_key: templateKey.value,
      lead_id: linkedLead.value?.id ?? null,
      data: { ...form },
    })
    toast.showSuccess(t('contracts.generated'))
    await openPreview(contract)
  } catch (e) {
    toast.showError(e?.message ?? t('contracts.generateFailed'))
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
  <div class="max-w-4xl mx-auto space-y-5 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="router.push({ name: 'contracts' })">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        {{ t('common.back') }}
      </AppButton>
      <div>
        <h1 class="text-xl font-semibold text-gray-900">{{ t('contracts.newContract') }}</h1>
        <p class="text-sm text-gray-500">{{ t('contracts.newContractSub') }}</p>
      </div>
    </div>

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

    <!-- Dynamic sections -->
    <template v-else-if="template">
      <AppCard v-for="section in template.schema" :key="section.key">
        <h2 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText class="w-4 h-4 text-primary" />
          {{ section.title }}
        </h2>

        <!-- Garanties matrix -->
        <div v-if="section.type === 'garanties'" class="divide-y divide-gray-100">
          <div
            v-for="item in section.items"
            :key="item.key"
            class="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5"
          >
            <label class="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
              <input
                v-model="form[`${item.key}_included`]"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span class="text-sm text-gray-800">{{ item.label }}</span>
            </label>
            <input
              v-model="form[`${item.key}_franchise`]"
              type="text"
              :placeholder="t('contracts.franchisePlaceholder')"
              :disabled="!form[`${item.key}_included`]"
              class="w-full sm:w-52 h-9 px-3 rounded-lg border border-gray-200 text-sm
                     focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        <!-- Standard fields grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <template v-for="field in section.fields" :key="field.key">
            <AppSelect
              v-if="field.type === 'select'"
              v-model="form[field.key]"
              :label="field.label"
              :options="[{ value: '', label: '—' }, ...field.options.map((o) => ({ value: o, label: o }))]"
            />
            <AppInput
              v-else
              v-model="form[field.key]"
              :label="field.label"
              :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
            />
          </template>
        </div>
      </AppCard>
    </template>

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
