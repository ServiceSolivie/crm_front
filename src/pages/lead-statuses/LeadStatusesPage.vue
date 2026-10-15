<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Lock, Eye, EyeOff } from 'lucide-vue-next'
import { useLeadStatusesStore } from '@/stores/leadStatuses.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import { LEAD_STATUS, LEAD_STAGES } from '@/utils/enums'
import { firstErrorMessage } from '@/utils/errors'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'

const { t } = useI18n()
const store = useLeadStatusesStore()
const ui = useUiStore()
const toast = useToast()

// Stages a custom status may be placed in; "new" and "won" belong to the system
const OPEN_STAGES = ['contact', 'follow_up', 'quote', 'lost']
const SYSTEM_CODES = Object.keys(LEAD_STATUS)

const showModal = ref(false)
const editing = ref(null)
const form = ref({ label: '', code: '', stage: 'contact' })
const formErrors = ref({})

onMounted(() => store.fetchList(true))

// One block per pipeline stage: its system statuses (locked) and its custom ones
const stages = computed(() =>
  Object.entries(LEAD_STAGES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({
      key,
      meta,
      open: OPEN_STAGES.includes(key),
      system: SYSTEM_CODES.filter((code) => LEAD_STATUS[code].stage === key),
      custom: store.list.filter((s) => s.stage === key),
    })),
)

const stageOptions = computed(() => OPEN_STAGES.map((key) => ({ value: key, label: t('stages.' + key) })))

function openCreate(stage = 'contact') {
  editing.value = null
  form.value = { label: '', code: '', stage }
  formErrors.value = {}
  showModal.value = true
}

function openEdit(status) {
  editing.value = status
  form.value = { label: status.label, code: status.code, stage: status.stage }
  formErrors.value = {}
  showModal.value = true
}

// "Documents manquants" → DOCUMENTS_MANQUANTS
function toCode(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^[_0-9]+|_+$/g, '')
    .substring(0, 40)
}

function validate() {
  formErrors.value = {}
  if (!form.value.label.trim()) formErrors.value.label = t('leadStatuses.labelRequired')
  else if (!editing.value && !form.value.code) formErrors.value.label = t('leadStatuses.labelUnusable')
  else if (!editing.value && SYSTEM_CODES.includes(form.value.code)) formErrors.value.label = t('leadStatuses.systemCode')
  return Object.keys(formErrors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (editing.value) {
      await store.update(editing.value.id, { label: form.value.label.trim(), stage: form.value.stage })
      toast.showSuccess(t('leadStatuses.updateSuccess'))
    } else {
      await store.create({ label: form.value.label.trim(), code: form.value.code, stage: form.value.stage })
      toast.showSuccess(t('leadStatuses.createSuccess'))
    }
    showModal.value = false
  } catch (e) {
    if (e?.errors) {
      formErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

async function toggleActive(status) {
  if (status.is_active) {
    const ok = await ui.confirm(
      t('leadStatuses.deactivateTitle'),
      t('leadStatuses.deactivateConfirmMsg', { name: status.label }),
      { confirmLabel: t('leadStatuses.deactivate') },
    )
    if (!ok) return
  }
  try {
    await store.update(status.id, { is_active: !status.is_active })
    toast.showSuccess(t(status.is_active ? 'leadStatuses.deactivated' : 'leadStatuses.reactivated'))
    showModal.value = false
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

async function handleDelete(status) {
  const ok = await ui.confirm(
    t('leadStatuses.deleteTitle'),
    t('leadStatuses.deleteConfirmMsg', { name: status.label }),
    { confirmLabel: t('common.delete') },
  )
  if (!ok) return
  try {
    await store.remove(status.id)
    toast.showSuccess(t('leadStatuses.deleteSuccess'))
    showModal.value = false
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

const PILL = 'inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[12.5px] font-medium whitespace-nowrap'
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader
      :eyebrow="t('nav.crmSettings')"
      :title="t('leadStatuses.title')"
      :subtitle="t('leadStatuses.subtitle')"
    >
      <template #actions>
        <AppButton @click="openCreate()">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('leadStatuses.newStatus') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <p class="text-[13px] text-gray-600">
      {{ t('leadStatuses.summary', { system: SYSTEM_CODES.length, custom: store.list.length }) }}
    </p>

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div
        v-for="stage in stages"
        :key="stage.key"
        class="grid grid-cols-1 md:grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-2 px-5 py-4 border-b border-gray-100 last:border-b-0"
      >
        <p class="flex items-center gap-2 h-6 text-[13px] font-medium text-gray-900">
          <span :class="['w-1.5 h-1.5 rounded-full', stage.meta.dot]" />
          {{ t('stages.' + stage.key) }}
        </p>

        <div class="min-w-0">
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="code in stage.system"
              :key="code"
              :class="[PILL, stage.meta.badge]"
              :title="t('leadStatuses.system')"
            >
              <Lock class="w-3 h-3 shrink-0 opacity-70" />
              {{ t('statuses.lead.' + code, code) }}
            </span>
            <!-- A custom status is only its pill here; everything else is in its window -->
            <button
              v-for="status in stage.custom"
              :key="status.id"
              type="button"
              :title="status.is_active ? t('leadStatuses.manage') : t('leadStatuses.inactive')"
              :class="[
                PILL,
                stage.meta.badge,
                'cursor-pointer hover:ring-2 hover:ring-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                !status.is_active && 'opacity-55',
              ]"
              @click="openEdit(status)"
            >
              <EyeOff v-if="!status.is_active" class="w-3 h-3 shrink-0" />
              {{ status.label }}
            </button>
          </div>

          <p v-if="!stage.open" class="mt-2 text-xs text-gray-500">
            {{ t(stage.key === 'won' ? 'leadStatuses.reservedWon' : 'leadStatuses.reservedStage') }}
          </p>

          <button
            v-else
            type="button"
            class="mt-1.5 inline-flex items-center gap-1 h-7 px-1.5 -ml-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary-light"
            @click="openCreate(stage.key)"
          >
            <Plus class="w-3.5 h-3.5" />
            {{ t('leadStatuses.add') }}
          </button>
        </div>
      </div>
    </section>

    <AppModal
      :open="showModal"
      :title="editing ? t('leadStatuses.editStatus') : t('leadStatuses.newStatus')"
      size="sm"
      @close="showModal = false"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <AppInput
          v-model="form.label"
          :label="t('leadStatuses.label')"
          :placeholder="t('leadStatuses.labelPlaceholder')"
          :error="formErrors.label"
          required
          @input="() => { if (!editing) form.code = toCode(form.label) }"
        />
        <AppInput
          :model-value="form.code"
          :label="t('leadStatuses.code')"
          :hint="editing ? t('leadStatuses.codeLocked') : t('leadStatuses.codeHint')"
          :error="formErrors.code"
          class="[&_input]:font-mono"
          disabled
        />
        <AppSelect
          v-model="form.stage"
          :label="t('leadStatuses.stage')"
          :options="stageOptions"
          :placeholder="t('leadStatuses.stage')"
          :hint="t('leadStatuses.stageHint')"
          :error="formErrors.stage"
          required
        />
        <div class="flex items-center gap-2.5">
          <span class="text-[13px] text-gray-600">{{ t('leadStatuses.preview') }}</span>
          <span :class="[PILL, LEAD_STAGES[form.stage].badge]">{{ form.label.trim() || t('leadStatuses.label') }}</span>
        </div>

        <div v-if="editing" class="pt-4 border-t border-gray-100 space-y-3">
          <p class="text-[13px] text-gray-600">
            {{ t('leadStatuses.leadsCount', { n: editing.leads_count ?? 0 }, editing.leads_count ?? 0) }}
            · {{ t(editing.is_active ? 'leadStatuses.active' : 'leadStatuses.inactive') }}
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton variant="secondary" size="sm" :loading="store.loading.form" @click="toggleActive(editing)">
              <template #icon><component :is="editing.is_active ? EyeOff : Eye" class="w-3.5 h-3.5" /></template>
              {{ t(editing.is_active ? 'leadStatuses.deactivate' : 'leadStatuses.reactivate') }}
            </AppButton>
            <!-- Only a status no lead is in can go for good; the others are switched off -->
            <AppButton
              v-if="!editing.leads_count"
              variant="ghost"
              size="sm"
              class="!text-danger-text hover:!bg-danger-bg"
              :loading="store.loading.action"
              @click="handleDelete(editing)"
            >
              <template #icon><Trash2 class="w-3.5 h-3.5" /></template>
              {{ t('common.delete') }}
            </AppButton>
          </div>
          <p v-if="editing.leads_count" class="text-xs text-gray-500">{{ t('leadStatuses.usedHint') }}</p>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="showModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submit">
          {{ editing ? t('common.save') : t('common.create') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
