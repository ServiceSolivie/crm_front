<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Eye, Send, Trash2, History, AlertTriangle } from 'lucide-vue-next'
import { dvcTypesApi } from '@/api/dvcTypes'
import { useToast } from '@/composables/useToast'
import { useUiStore } from '@/stores/ui.store'
import { INSURANCE_TYPE } from '@/utils/enums'
import { formatDateTime } from '@/utils/formatters'
import { firstErrorMessage } from '@/utils/errors'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import DocumentPreviewModal from '@/components/modules/documents/DocumentPreviewModal.vue'

/**
 * Create or edit a DVC type (super admin). The type's form and PDF are its
 * JSON schema: check it, preview the PDF, then publish it as a new version.
 * DVCs already generated keep the version they were made with.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const ui = useUiStore()

// A minimal valid schema to start a new type from
const STARTER_SCHEMA = {
  title: 'Devoir de Conseil',
  subtitle: 'Étude personnalisée de vos besoins, réalisée conformément aux articles L.520-1 et R.520-1 du Code des assurances.',
  sections: [
    {
      type: 'fields', key: 'conseiller', title: 'Votre conseiller', columns: 2,
      fields: [
        { key: 'agent_name', label: 'Nom du conseiller', type: 'text', prefill: 'agent.name' },
        { key: 'interview_date', label: "Date de l'entretien", type: 'date', prefill: 'today' },
      ],
    },
    { type: 'broker', number: 'I', title: 'Informations légales' },
    {
      type: 'fields', key: 'souscripteur', title: 'Le souscripteur', columns: 2, page_break_before: true,
      fields: [
        { key: 'first_name', label: 'Prénom', type: 'text', required: true, prefill: 'lead.first_name' },
        { key: 'last_name', label: 'Nom', type: 'text', required: true, prefill: 'lead.last_name' },
        { key: 'email', label: 'Adresse e-mail', type: 'text', prefill: 'lead.email' },
        { key: 'phone', label: 'Téléphone', type: 'text', prefill: 'lead.phone' },
      ],
    },
    {
      type: 'garanties', key: 'garanties', title: 'Vos exigences et besoins',
      items: [{ key: 'g_rc', label: 'Responsabilité civile', default_included: true }],
    },
    {
      type: 'fields', key: 'tarification', title: 'Tarification', columns: 2,
      fields: [
        { key: 'compagnie', label: 'Compagnie partenaire', type: 'text' },
        { key: 'prime_annuelle', label: 'Prime annuelle (taxes incluses)', type: 'money', min: 0 },
      ],
    },
    {
      type: 'text',
      paragraphs: ['Le client {{first_name}} {{last_name}} reconnaît avoir pris connaissance du présent document.'],
    },
  ],
}

const SECTION_TYPES = ['fields', 'garanties', 'text', 'list', 'broker']
const FIELD_TYPES = ['text', 'textarea', 'number', 'money', 'date', 'select', 'boolean']
const PREFILL_SOURCES = [
  'lead.first_name', 'lead.last_name', 'lead.full_name', 'lead.birth_date', 'lead.phone', 'lead.email',
  'lead.address', 'lead.city', 'lead.full_address', 'lead.company_name', 'lead.company_legal_form',
  'lead.company_sector', 'lead.company_employee_count', 'lead.company_annual_revenue',
  'agent.name', 'agent.email', 'agent.phone', 'today',
]

const isNew = computed(() => route.name === 'dvc-types.create')
const dvcType = ref(null)
const loading = ref(false)
const busy = ref('') // validate | preview | save | publish | delete

const meta = ref({ insurance_type: '', label: '', filename_prefix: 'DVC', is_active: true })
const metaErrors = ref({})
const schemaText = ref('')
const changeNote = ref('')
const loadedVersion = ref(null) // version shown in the editor when it is not the current one
const jsonError = ref('')
const schemaErrors = ref({})
const schemaValid = ref(false)

const preview = ref(null)
const previewUrl = ref(null)

const insuranceOptions = computed(() =>
  Object.keys(INSURANCE_TYPE).map((value) => ({ value, label: t('insuranceTypes.' + value) })),
)

onMounted(load)
watch(() => route.params.id, (id, old) => { if (id && id !== old) load() })

async function load() {
  resetFeedback()
  changeNote.value = ''
  loadedVersion.value = null
  if (isNew.value) {
    dvcType.value = null
    const insuranceType = route.query.insurance_type ?? ''
    meta.value = {
      insurance_type: insuranceType,
      label: insuranceType ? `Devoir de Conseil — ${t('insuranceTypes.' + insuranceType)}` : '',
      filename_prefix: insuranceType ? `DVC-${insuranceType.replace(/_/g, '-')}` : 'DVC',
      is_active: true,
    }
    schemaText.value = JSON.stringify(STARTER_SCHEMA, null, 2)
    return
  }

  loading.value = true
  try {
    dvcType.value = (await dvcTypesApi.get(route.params.id)).data
    meta.value = {
      insurance_type: dvcType.value.insurance_type,
      label: dvcType.value.label,
      filename_prefix: dvcType.value.filename_prefix,
      is_active: dvcType.value.is_active,
    }
    schemaText.value = JSON.stringify(dvcType.value.current_version?.schema ?? {}, null, 2)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('dvc.types.loadFailed')))
    router.replace({ name: 'dvc-types' })
  } finally {
    loading.value = false
  }
}

function resetFeedback() {
  jsonError.value = ''
  schemaErrors.value = {}
  schemaValid.value = false
}

watch(schemaText, () => {
  schemaValid.value = false
})

/** The editor's JSON, or null with the parse error shown. */
function parsedSchema() {
  resetFeedback()
  try {
    return JSON.parse(schemaText.value)
  } catch (e) {
    jsonError.value = t('dvc.editor.invalidJson', { error: e.message })
    return null
  }
}

function showSchemaErrors(e) {
  // Errors of the schema itself are keyed by their path: "sections.3.fields.0.key"
  schemaErrors.value = e?.errors && !Array.isArray(e.errors) ? e.errors : {}
  if (!Object.keys(schemaErrors.value).length) toast.showError(firstErrorMessage(e, t('dvc.editor.failed')))
}

async function check() {
  const schema = parsedSchema()
  if (!schema) return false
  busy.value = 'validate'
  try {
    await dvcTypesApi.validate(schema)
    schemaValid.value = true
    return true
  } catch (e) {
    showSchemaErrors(e)
    return false
  } finally {
    busy.value = ''
  }
}

function formatJson() {
  const schema = parsedSchema()
  if (schema) schemaText.value = JSON.stringify(schema, null, 2)
}

async function openPreview() {
  if (!(await check())) return
  busy.value = 'preview'
  preview.value = { original_filename: 'apercu-dvc.pdf', mime_type: 'application/pdf', type_label: t('dvc.editor.previewTitle') }
  previewUrl.value = null
  try {
    const response = await dvcTypesApi.preview(JSON.parse(schemaText.value))
    previewUrl.value = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  } catch (e) {
    preview.value = null
    toast.showError(firstErrorMessage(e, t('dvc.editor.failed')))
  } finally {
    busy.value = ''
  }
}

function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  preview.value = null
  previewUrl.value = null
}

function downloadPreview() {
  const link = document.createElement('a')
  link.href = previewUrl.value
  link.setAttribute('download', 'apercu-dvc.pdf')
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function create() {
  const schema = parsedSchema()
  if (!schema) return
  metaErrors.value = {}
  busy.value = 'save'
  try {
    const created = (await dvcTypesApi.create({ ...meta.value, schema, change_note: changeNote.value || null })).data
    toast.showSuccess(t('dvc.editor.created'))
    router.replace({ name: 'dvc-types.edit', params: { id: created.id } })
  } catch (e) {
    metaErrors.value = Object.fromEntries(
      Object.entries(e?.errors ?? {})
        .filter(([key]) => ['insurance_type', 'label', 'filename_prefix'].includes(key))
        .map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : messages]),
    )
    showSchemaErrors(e)
  } finally {
    busy.value = ''
  }
}

async function saveMeta() {
  metaErrors.value = {}
  busy.value = 'save'
  try {
    const { label, filename_prefix, is_active } = meta.value
    dvcType.value = (await dvcTypesApi.update(dvcType.value.id, { label, filename_prefix, is_active })).data
    toast.showSuccess(t('dvc.editor.saved'))
  } catch (e) {
    metaErrors.value = Object.fromEntries(
      Object.entries(e?.errors ?? {}).map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : messages]),
    )
    toast.showError(firstErrorMessage(e, t('dvc.editor.failed')))
  } finally {
    busy.value = ''
  }
}

async function publish() {
  const schema = parsedSchema()
  if (!schema) return
  const ok = await ui.confirm(
    t('dvc.editor.publishTitle'),
    t('dvc.editor.publishConfirm', { version: (dvcType.value.current_version?.version ?? 0) + 1 }),
    { confirmLabel: t('dvc.editor.publish'), tone: 'primary' },
  )
  if (!ok) return
  busy.value = 'publish'
  try {
    dvcType.value = (await dvcTypesApi.publish(dvcType.value.id, { schema, change_note: changeNote.value || null })).data
    schemaText.value = JSON.stringify(dvcType.value.current_version.schema, null, 2)
    changeNote.value = ''
    loadedVersion.value = null
    toast.showSuccess(t('dvc.editor.published', { version: dvcType.value.current_version.version }))
  } catch (e) {
    showSchemaErrors(e)
  } finally {
    busy.value = ''
  }
}

async function loadVersion(version) {
  try {
    const { data } = await dvcTypesApi.version(dvcType.value.id, version.version)
    schemaText.value = JSON.stringify(data.schema, null, 2)
    loadedVersion.value = version.version === dvcType.value.current_version?.version ? null : version.version
    resetFeedback()
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('dvc.types.loadFailed')))
  }
}

async function remove() {
  const ok = await ui.confirm(t('dvc.editor.deleteTitle'), t('dvc.editor.deleteConfirm', { name: dvcType.value.label }), {
    confirmLabel: t('common.delete'),
  })
  if (!ok) return
  busy.value = 'delete'
  try {
    await dvcTypesApi.remove(dvcType.value.id)
    toast.showSuccess(t('dvc.editor.deleted'))
    router.replace({ name: 'dvc-types' })
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('dvc.editor.failed')))
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto pb-10">
    <AppPageHeader
      :title="isNew ? t('dvc.editor.newTitle') : (dvcType?.label ?? t('dvc.types.title'))"
      :subtitle="t('dvc.editor.subtitle')"
      :breadcrumb="[{ label: t('dvc.types.title'), to: '/dvc-types' }, { label: isNew ? t('dvc.editor.newTitle') : (dvcType ? t('insuranceTypes.' + dvcType.insurance_type) : '…') }]"
    />

    <div v-if="loading" class="space-y-3">
      <AppSkeleton v-for="n in 4" :key="n" height="56px" />
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      <!-- Schema editor -->
      <section class="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-display text-[15px] font-semibold text-gray-900 mr-auto">{{ t('dvc.editor.schema') }}</h2>
          <span v-if="schemaValid" class="inline-flex items-center gap-1 text-xs text-success-text">
            <CheckCircle2 class="w-3.5 h-3.5" />{{ t('dvc.editor.valid') }}
          </span>
          <AppButton variant="ghost" size="sm" @click="formatJson">{{ t('dvc.editor.format') }}</AppButton>
          <AppButton variant="secondary" size="sm" :loading="busy === 'validate'" @click="check">
            {{ t('dvc.editor.check') }}
          </AppButton>
          <AppButton variant="secondary" size="sm" :loading="busy === 'preview'" @click="openPreview">
            <template #icon><Eye class="w-3.5 h-3.5" /></template>
            {{ t('dvc.editor.preview') }}
          </AppButton>
        </div>

        <p v-if="loadedVersion" class="text-[12.5px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {{ t('dvc.editor.olderVersion', { version: loadedVersion }) }}
        </p>

        <textarea
          v-model="schemaText"
          spellcheck="false"
          :aria-label="t('dvc.editor.schema')"
          :class="[
            'w-full min-h-[560px] rounded-lg border bg-gray-50 font-mono text-[12.5px] leading-5 text-gray-900 p-3 resize-y',
            'focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary-soft/20',
            jsonError || Object.keys(schemaErrors).length ? 'border-danger' : 'border-gray-300',
          ]"
          @keydown.tab.prevent="$event.target.setRangeText('  ', $event.target.selectionStart, $event.target.selectionEnd, 'end'); schemaText = $event.target.value"
        />

        <!-- Errors, by their path in the JSON -->
        <div
          v-if="jsonError || Object.keys(schemaErrors).length"
          class="rounded-lg border border-danger/40 bg-danger-bg/40 px-3 py-2.5 flex flex-col gap-1.5"
        >
          <p class="flex items-center gap-1.5 text-[13px] font-medium text-danger-text">
            <AlertTriangle class="w-4 h-4" />{{ t('dvc.editor.errors') }}
          </p>
          <p v-if="jsonError" class="text-[12.5px] text-danger-text">{{ jsonError }}</p>
          <ul class="flex flex-col gap-1">
            <li v-for="(message, path) in schemaErrors" :key="path" class="text-[12.5px] text-gray-800">
              <code class="font-mono text-[11.5px] text-danger-text">{{ path }}</code> — {{ Array.isArray(message) ? message[0] : message }}
            </li>
          </ul>
        </div>
      </section>

      <aside class="flex flex-col gap-4">
        <!-- Type settings -->
        <section class="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('dvc.editor.settings') }}</h2>
          <AppSelect
            v-model="meta.insurance_type"
            :label="t('dvc.editor.insuranceType')"
            :options="insuranceOptions"
            :disabled="!isNew"
            :error="metaErrors.insurance_type ?? ''"
            :hint="isNew ? t('dvc.editor.oneTypePerInsurance') : ''"
            required
          />
          <AppInput v-model="meta.label" :label="t('dvc.editor.label')" :error="metaErrors.label ?? ''" required />
          <AppInput
            v-model="meta.filename_prefix"
            :label="t('dvc.editor.filenamePrefix')"
            :error="metaErrors.filename_prefix ?? ''"
            :hint="t('dvc.editor.filenamePrefixHint')"
          />
          <AppToggle v-model="meta.is_active" :label="t('dvc.editor.active')" />
          <AppButton v-if="!isNew" variant="secondary" :loading="busy === 'save'" @click="saveMeta">
            {{ t('common.save') }}
          </AppButton>
        </section>

        <!-- Publish -->
        <section class="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">
            {{ isNew ? t('dvc.editor.createTitle') : t('dvc.editor.publishTitle') }}
          </h2>
          <p class="text-[12.5px] leading-[18px] text-gray-600">
            {{ isNew ? t('dvc.editor.createHint') : t('dvc.editor.publishHint') }}
          </p>
          <AppInput v-model="changeNote" :label="t('dvc.editor.changeNote')" :placeholder="t('dvc.editor.changeNotePlaceholder')" />
          <AppButton v-if="isNew" :loading="busy === 'save'" @click="create">{{ t('dvc.editor.create') }}</AppButton>
          <AppButton v-else :loading="busy === 'publish'" @click="publish">
            <template #icon><Send class="w-3.5 h-3.5" /></template>
            {{ t('dvc.editor.publish') }}
          </AppButton>
        </section>

        <!-- Versions -->
        <section v-if="dvcType?.versions?.length" class="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
          <h2 class="font-display text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            <History class="w-4 h-4 text-gray-500" />{{ t('dvc.editor.versions') }}
          </h2>
          <ul class="flex flex-col">
            <li
              v-for="version in dvcType.versions"
              :key="version.id"
              class="flex items-start gap-2 py-2 border-b border-gray-100 last:border-b-0"
            >
              <span class="font-mono text-[12.5px] text-gray-900 w-8 shrink-0">v{{ version.version }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-[12.5px] text-gray-900 truncate">{{ version.change_note || '—' }}</p>
                <p class="text-[11.5px] text-gray-500">
                  {{ formatDateTime(version.created_at) }}<template v-if="version.created_by"> · {{ version.created_by.name }}</template>
                  · {{ t('dvc.editor.dvcCount', { count: version.contracts_count ?? 0 }, version.contracts_count ?? 0) }}
                </p>
              </div>
              <span v-if="version.id === dvcType.current_version?.id" class="text-[11px] font-medium text-success-text shrink-0">
                {{ t('dvc.editor.current') }}
              </span>
              <button
                v-else
                type="button"
                class="text-[12px] font-medium text-primary hover:underline shrink-0"
                @click="loadVersion(version)"
              >{{ t('dvc.editor.load') }}</button>
            </li>
          </ul>
        </section>

        <!-- Reference -->
        <details class="bg-white border border-gray-200 rounded-xl p-4 text-[12.5px] text-gray-700">
          <summary class="cursor-pointer font-display text-[15px] font-semibold text-gray-900">{{ t('dvc.editor.reference') }}</summary>
          <div class="mt-3 flex flex-col gap-2.5 leading-[18px]">
            <p><strong>{{ t('dvc.editor.refSections') }}</strong> <code class="font-mono">{{ SECTION_TYPES.join(', ') }}</code></p>
            <p><strong>{{ t('dvc.editor.refFields') }}</strong> <code class="font-mono">{{ FIELD_TYPES.join(', ') }}</code></p>
            <p>{{ t('dvc.editor.refFieldProps') }}</p>
            <p>{{ t('dvc.editor.refTexts') }}</p>
            <p><strong>{{ t('dvc.editor.refPrefill') }}</strong></p>
            <p class="font-mono text-[11.5px] break-words">{{ PREFILL_SOURCES.join(', ') }}</p>
          </div>
        </details>

        <AppButton v-if="!isNew && dvcType" variant="ghost" :loading="busy === 'delete'" @click="remove">
          <template #icon><Trash2 class="w-3.5 h-3.5" /></template>
          {{ t('dvc.editor.delete') }}
        </AppButton>
      </aside>
    </div>

    <DocumentPreviewModal
      :open="!!preview"
      :document="preview"
      :blob-url="previewUrl"
      :loading="busy === 'preview'"
      @close="closePreview"
      @download="downloadPreview"
    />
  </div>
</template>
