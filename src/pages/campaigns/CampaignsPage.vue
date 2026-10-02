<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, RadioTower } from 'lucide-vue-next'
import { useCampaignsStore } from '@/stores/campaigns.store'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useToast } from '@/composables/useToast'
import { INSURANCE_TYPE } from '@/utils/enums'
import { firstErrorMessage } from '@/utils/errors'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppToggle from '@/components/base/AppToggle.vue'

const { t } = useI18n()
const campaigns = useCampaignsStore()
const sources = useLeadSourcesStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref(null)
const formErrors = ref({})

const sourceOptions = computed(() =>
  sources.list
    .filter((source) => source.code === 'google_ads')
    .map((source) => ({ value: source.id, label: source.name })),
)

const insuranceTypeOptions = computed(() =>
  Object.keys(INSURANCE_TYPE).map((type) => ({ value: type, label: t(`insuranceTypes.${type}`) })),
)

const GRID =
  'grid grid-cols-[minmax(220px,1.5fr)_minmax(190px,1.25fr)_minmax(150px,1fr)_90px_76px] items-center gap-x-4 px-5'

const form = ref(defaultForm())

function defaultForm() {
  return {
    lead_source_id: sourceOptions.value[0]?.value ?? '',
    name: '',
    external_campaign_id: '',
    form_id: '',
    form_name: '',
    insurance_type: '',
    is_active: true,
  }
}

function openCreate() {
  editing.value = null
  form.value = defaultForm()
  formErrors.value = {}
  showModal.value = true
}

function openEdit(campaign) {
  editing.value = campaign
  form.value = {
    lead_source_id: campaign.lead_source?.id ?? '',
    name: campaign.name,
    external_campaign_id: campaign.external_campaign_id,
    form_id: campaign.form_id,
    form_name: campaign.form_name ?? '',
    insurance_type: campaign.insurance_type,
    is_active: campaign.is_active,
  }
  formErrors.value = {}
  showModal.value = true
}

function validate() {
  formErrors.value = {}
  if (!form.value.lead_source_id) formErrors.value.lead_source_id = t('common.required')
  if (!form.value.name.trim()) formErrors.value.name = t('common.required')
  if (!form.value.external_campaign_id.trim())
    formErrors.value.external_campaign_id = t('common.required')
  if (!form.value.form_id.trim()) formErrors.value.form_id = t('common.required')
  if (!form.value.insurance_type) formErrors.value.insurance_type = t('common.required')
  return Object.keys(formErrors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (editing.value) {
      await campaigns.update(editing.value.id, form.value)
      toast.showSuccess(t('campaigns.updateSuccess'))
    } else {
      await campaigns.create(form.value)
      toast.showSuccess(t('campaigns.createSuccess'))
    }
    showModal.value = false
  } catch (error) {
    if (error?.errors)
      formErrors.value = Object.fromEntries(
        Object.entries(error.errors).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ]),
      )
    toast.showError(firstErrorMessage(error, t('common.noData')))
  }
}

async function toggle(campaign) {
  try {
    await campaigns.update(campaign.id, { is_active: !campaign.is_active })
    toast.showSuccess(
      campaign.is_active ? t('campaigns.deactivateSuccess') : t('campaigns.activateSuccess'),
    )
  } catch (error) {
    toast.showError(firstErrorMessage(error, t('common.noData')))
  }
}

onMounted(async () => {
  await Promise.all([sources.fetchList(), campaigns.fetchList()])
})
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader
      :eyebrow="t('nav.crmSettings')"
      :title="t('campaigns.title')"
      :count="campaigns.list.length"
      :subtitle="t('campaigns.subtitle')"
    >
      <template #actions
        ><AppButton @click="openCreate"
          ><template #icon><Plus class="w-4 h-4" /></template
          >{{ t('campaigns.newCampaign') }}</AppButton
        ></template
      >
    </AppPageHeader>

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[800px] text-[13px]" role="table" :aria-label="t('campaigns.title')">
          <div
            role="row"
            :class="[
              GRID,
              'h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600',
            ]"
          >
            <span role="columnheader">{{ t('campaigns.campaign') }}</span
            ><span role="columnheader">{{ t('campaigns.form') }}</span
            ><span role="columnheader">{{ t('campaigns.product') }}</span
            ><span role="columnheader">{{ t('campaigns.status') }}</span
            ><span role="columnheader"
              ><span class="sr-only">{{ t('common.actions') }}</span></span
            >
          </div>
          <template v-if="campaigns.loading.list && !campaigns.list.length"
            ><div v-for="n in 6" :key="n" :class="[GRID, 'h-[64px] border-b border-gray-100']">
              <AppSkeleton height="12px" width="65%" /><AppSkeleton
                height="12px"
                width="60%"
              /><AppSkeleton height="12px" width="70%" /><AppSkeleton
                height="20px"
                width="45px"
              /><span /></div
          ></template>
          <div
            v-else-if="!campaigns.list.length"
            class="flex flex-col items-center gap-2 py-14 text-center"
          >
            <span
              class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"
              ><RadioTower class="w-5 h-5"
            /></span>
            <p class="text-[13px] text-gray-600">{{ t('campaigns.noCampaignsAdd') }}</p>
          </div>
          <template v-else
            ><div
              v-for="campaign in campaigns.list"
              :key="campaign.id"
              role="row"
              :class="[
                GRID,
                'min-h-[64px] py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50',
              ]"
            >
              <div role="cell" class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ campaign.name }}</p>
                <p class="font-mono text-[12px] text-gray-500 truncate">
                  {{ campaign.external_campaign_id }}
                </p>
              </div>
              <div role="cell" class="min-w-0">
                <p class="text-gray-900 truncate">{{ campaign.form_name || '—' }}</p>
                <p class="font-mono text-[12px] text-gray-500 truncate">{{ campaign.form_id }}</p>
              </div>
              <span role="cell" class="text-gray-700">{{ campaign.insurance_type_label }}</span>
              <span role="cell"
                ><AppToggle
                  :model-value="campaign.is_active"
                  :aria-label="
                    campaign.is_active ? t('campaigns.deactivate') : t('campaigns.activate')
                  "
                  @update:model-value="toggle(campaign)"
              /></span>
              <span role="cell" class="flex justify-end"
                ><button
                  type="button"
                  :title="t('common.edit')"
                  :aria-label="t('common.edit')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                  @click="openEdit(campaign)"
                >
                  <Pencil class="w-3.5 h-3.5" /></button
              ></span></div
          ></template>
        </div>
      </div>
    </section>

    <AppModal
      :open="showModal"
      :title="editing ? t('campaigns.editCampaign') : t('campaigns.newCampaign')"
      :description="t('campaigns.modalDescription')"
      :icon="RadioTower"
      size="lg"
      @close="showModal = false"
    >
      <form class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="submit">
        <AppSelect
          v-model="form.lead_source_id"
          :label="t('campaigns.source')"
          :options="sourceOptions"
          :placeholder="t('campaigns.sourcePlaceholder')"
          :error="formErrors.lead_source_id"
          required
        />
        <AppInput
          v-model="form.name"
          :label="t('campaigns.name')"
          :placeholder="t('campaigns.namePlaceholder')"
          :error="formErrors.name"
          required
        />
        <AppInput
          v-model="form.external_campaign_id"
          :label="t('campaigns.externalCampaignId')"
          :error="formErrors.external_campaign_id"
          class="[&_input]:font-mono"
          required
        />
        <AppInput
          v-model="form.form_id"
          :label="t('campaigns.formId')"
          :error="formErrors.form_id"
          class="[&_input]:font-mono"
          required
        />
        <AppInput
          v-model="form.form_name"
          :label="t('campaigns.formName')"
          :placeholder="t('campaigns.formNamePlaceholder')"
        />
        <AppSelect
          v-model="form.insurance_type"
          :label="t('campaigns.product')"
          :options="insuranceTypeOptions"
          :placeholder="t('campaigns.productPlaceholder')"
          :error="formErrors.insurance_type"
          required
        />
        <div class="sm:col-span-2 pt-1">
          <AppToggle v-model="form.is_active" :label="t('campaigns.active')" />
        </div>
      </form>
      <template #footer
        ><AppButton variant="secondary" @click="showModal = false">{{
          t('common.cancel')
        }}</AppButton
        ><AppButton :loading="campaigns.loading.form" @click="submit">{{
          editing ? t('common.save') : t('common.create')
        }}</AppButton></template
      >
    </AppModal>
  </div>
</template>
