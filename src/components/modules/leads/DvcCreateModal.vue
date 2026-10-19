<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FilePenLine } from 'lucide-vue-next'
import { useContractsStore } from '@/stores/contracts.store'
import { useToast } from '@/composables/useToast'
import AppModal from '@/components/base/AppModal.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import DvcSchemaForm from '@/components/modules/contracts/DvcSchemaForm.vue'
import { blankDvcValues, applyDvcValues, dvcFieldErrors } from '@/utils/dvcSchema'
import { firstErrorMessage } from '@/utils/errors'
import { formatDateTime } from '@/utils/formatters'

/**
 * Create a DVC from the lead page: the agent picks the DVC type (the one of
 * the lead's insurance type is pre-selected), fills the form generated from
 * that type's schema and generates the PDF.
 *
 * Each field takes the value of the lead's last DVC of the same type, else of
 * its most recent DVC of another type with a field of the same key, else of
 * the lead itself.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  lead: { type: Object, default: null },
  // The lead's generated DVCs (contracts), newest first
  previousDvcs: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'generated'])
const { t } = useI18n()
const store = useContractsStore()
const toast = useToast()

const templateKey = ref('')
const form = reactive({})
const errors = ref({})
const loadingForm = ref(false)
// The DVCs the form took values from (same type first)
const sourceDvcs = ref([])

const template = computed(() => store.templates.find((tpl) => tpl.key === templateKey.value) ?? null)
const typeOptions = computed(() =>
  store.templates.map((tpl) => ({ value: tpl.key, label: tpl.label })),
)
// "DVC Auto n°2 du 16/10/2026 14:02, DVC Décennale n°1 du …"
const sourcesLabel = computed(() =>
  sourceDvcs.value
    .map((dvc) => {
      const insuranceType = dvc.template_key?.replace(/_dvc$/, '').toUpperCase()
      return t('dvc.create.source', {
        type: t('insuranceTypes.' + insuranceType, insuranceType),
        version: dvc.version,
        date: formatDateTime(dvc.created_at),
      })
    })
    .join(', '),
)
const noTypeForLead = computed(
  () => !!props.lead?.insurance_type && !store.templates.some((tpl) => tpl.insurance_type === props.lead.insurance_type),
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    templateKey.value = ''
    errors.value = {}
    try {
      await store.fetchTemplates({ force: true })
    } catch {
      toast.showError(t('contracts.loadFailed'))
      return
    }
    // The lead's insurance type, else the type of its last DVC
    const forLead = store.templates.find((tpl) => tpl.insurance_type === props.lead?.insurance_type)
      ?? store.templates.find((tpl) => tpl.key === props.previousDvcs[0]?.template_key)
    if (forLead) await selectType(forLead.key)
  },
)

async function selectType(key) {
  templateKey.value = key
  errors.value = {}
  sourceDvcs.value = []
  Object.keys(form).forEach((k) => delete form[k])
  if (!template.value) return

  Object.assign(form, blankDvcValues(template.value.schema))
  loadingForm.value = true
  try {
    applyDvcValues(form, await store.fetchPrefill(key, props.lead?.id))
  } catch {
    /* non-blocking: the agent fills the form by hand */
  } finally {
    loadingForm.value = false
  }

  // Then the lead's previous DVCs win over the lead: for each field, the value
  // of the last DVC of this type, else of the most recent DVC of another type
  // that has a field with the same key. Fields the new type doesn't have are ignored.
  const fields = Object.fromEntries(
    template.value.schema.sections.flatMap((section) => section.fields ?? []).map((field) => [field.key, field]),
  )
  const ordered = [
    ...props.previousDvcs.filter((dvc) => dvc.template_key === key),
    ...props.previousDvcs.filter((dvc) => dvc.template_key !== key),
  ]
  const taken = new Set()
  const used = []
  for (const dvc of ordered) {
    const values = {}
    for (const [field, value] of Object.entries(dvc.form_data ?? {})) {
      if (taken.has(field) || !(field in form) || value === null || value === '') continue
      // A field prefilled with "today" (e.g. the interview date) stays today's date
      if (fields[field]?.prefill === 'today') continue
      // A list value must still be one of this type's options
      if (fields[field]?.type === 'select' && !fields[field].options?.includes(value)) continue
      values[field] = value
      taken.add(field)
    }
    if (Object.keys(values).length) {
      applyDvcValues(form, values)
      used.push(dvc)
    }
  }
  sourceDvcs.value = used
}

async function generate() {
  if (!template.value) return
  errors.value = {}
  try {
    const contract = await store.generate({
      template_key: template.value.key,
      dvc_type_version_id: template.value.version_id,
      lead_id: props.lead?.id ?? null,
      data: { ...form },
    })
    toast.showSuccess(t('contracts.generated'))
    emit('generated', contract)
  } catch (e) {
    errors.value = dvcFieldErrors(e?.errors)
    toast.showError(firstErrorMessage(e, t('contracts.generateFailed')))
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('dvc.create.title')"
    :description="t('dvc.create.description')"
    :icon="FilePenLine"
    size="xl"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-5">
      <AppSkeleton v-if="store.loading.templates && !store.templates.length" height="64px" />

      <template v-else>
        <p v-if="!store.templates.length" class="text-[13px] text-gray-600">{{ t('dvc.create.noTypes') }}</p>
        <template v-else>
          <AppSelect
            :model-value="templateKey"
            :label="t('dvc.create.type')"
            :placeholder="t('dvc.create.typePlaceholder')"
            :options="typeOptions"
            :hint="noTypeForLead ? t('dvc.create.noTypeForLead') : ''"
            @update:model-value="selectType"
          />

          <p
            v-if="sourceDvcs.length && !loadingForm"
            class="rounded-lg bg-info-bg/60 border border-info/30 px-3 py-2 text-[12.5px] leading-[18px] text-info-text"
          >
            {{ t('dvc.create.fromPrevious', { sources: sourcesLabel }) }}
          </p>

          <div v-if="loadingForm" class="space-y-3">
            <AppSkeleton v-for="n in 4" :key="n" height="44px" />
          </div>
          <DvcSchemaForm
            v-else-if="template"
            v-model="form"
            :schema="template.schema"
            :errors="errors"
            :disabled="store.loading.generate"
          />
        </template>
      </template>
    </div>

    <template #footer>
      <p v-if="template" class="text-xs text-gray-400 mr-auto self-center">
        {{ t('dvc.create.version', { version: template.version }) }}
      </p>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :disabled="!template || loadingForm" :loading="store.loading.generate" @click="generate">
        {{ t('contracts.generatePdf') }}
      </AppButton>
    </template>
  </AppModal>
</template>
