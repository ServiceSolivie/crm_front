<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, FileText, Lock, Info } from 'lucide-vue-next'
import { useDocumentRequirementsStore } from '@/stores/documentRequirements.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import { firstErrorMessage } from '@/utils/errors'

/**
 * CRM settings → documents: the document types, and which ones each
 * product asks for (one grid: document × product / client type).
 * The signed DVC is a system type: required for every product, locked.
 */
const { t } = useI18n()
const store = useDocumentRequirementsStore()
const ui = useUiStore()
const toast = useToast()

const activeTab = ref('types')
const showTypeModal = ref(false)
const editingType = ref(null)
const typeForm = ref({ name: '', label: '', is_active: true, sort_order: 0 })
const typeErrors = ref({})

onMounted(() => {
  store.fetchDocumentTypes(true)
  store.fetchMatrix(true)
})

/* ── Document types ─────────────────────────────────────────── */
function openCreateType() {
  editingType.value = null
  const next = Math.max(0, ...store.documentTypes.map((d) => d.sort_order ?? 0)) + 1
  typeForm.value = { name: '', label: '', is_active: true, sort_order: next }
  typeErrors.value = {}
  showTypeModal.value = true
}

function openEditType(type) {
  editingType.value = type
  typeForm.value = { name: type.name, label: type.label, is_active: type.is_active, sort_order: type.sort_order }
  typeErrors.value = {}
  showTypeModal.value = true
}

function validateType() {
  typeErrors.value = {}
  if (!typeForm.value.name.trim()) typeErrors.value.name = t('documentRequirements.nameRequired')
  if (!typeForm.value.label.trim()) typeErrors.value.label = t('documentRequirements.labelRequired')
  return Object.keys(typeErrors.value).length === 0
}

async function submitType() {
  if (!validateType()) return
  try {
    if (editingType.value) {
      await store.updateDocumentType(editingType.value.id, typeForm.value)
      toast.showSuccess(t('documentRequirements.typeUpdated'))
    } else {
      await store.createDocumentType({ ...typeForm.value, name: typeForm.value.name.trim().toUpperCase() })
      toast.showSuccess(t('documentRequirements.typeCreated'))
    }
    showTypeModal.value = false
    store.fetchDocumentTypes(true)
    store.fetchMatrix(true)
  } catch (e) {
    if (e?.errors) {
      typeErrors.value = Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
    }
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

async function handleDeleteType(type) {
  const ok = await ui.confirm(
    t('documentRequirements.deleteTypeTitle'),
    t('documentRequirements.deleteTypeConfirm', { name: type.label }),
    { confirmLabel: t('common.delete') },
  )
  if (!ok) return
  try {
    await store.removeDocumentType(type.id)
    toast.showSuccess(t('documentRequirements.typeDeleted'))
    store.fetchMatrix(true)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

function usageLabel(type) {
  if (type.is_system) return t('documentRequirements.allProducts')
  const n = type.requirements_count ?? 0
  return n ? t('documentRequirements.usedIn', { n }, n) : t('documentRequirements.unused')
}

/* ── Requirements grid ──────────────────────────────────────── */
// One column per product, or per product × client type when the product needs one
const columns = computed(() =>
  store.matrix.flatMap((entry) =>
    entry.groups.map((group, gi) => ({
      key: `${entry.insurance_type}-${group.client_type ?? 'all'}`,
      entry,
      gi,
      label: t('insuranceTypesShort.' + entry.insurance_type, entry.insurance_type),
      title: entry.insurance_type_label,
      sub: entry.requires_client_type
        ? (group.client_type ? t('clientTypes.' + group.client_type, group.client_type_label) : t('documentRequirements.allClients'))
        : '',
    })),
  ),
)

function isRequired(col, typeId) {
  return col.entry.groups[col.gi]?.document_type_ids?.includes(typeId) ?? false
}

function countFor(col) {
  return col.entry.groups[col.gi]?.document_type_ids?.length ?? 0
}

async function toggle(col, typeId) {
  const group = col.entry.groups[col.gi]
  const current = [...(group.document_type_ids || [])]
  const idx = current.indexOf(typeId)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(typeId)
  try {
    await store.syncRequirements(col.entry.insurance_type, group.client_type, current)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

const tabs = computed(() => [
  { key: 'types', label: t('documentRequirements.documentTypes'), count: store.documentTypes.length },
  { key: 'matrix', label: t('documentRequirements.requirementsMatrix'), count: null },
])
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader
      :eyebrow="t('nav.crmSettings')"
      :title="t('documentRequirements.title')"
      :subtitle="t('documentRequirements.subtitle')"
    >
      <template #actions>
        <AppButton v-if="activeTab === 'types'" @click="openCreateType">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('documentRequirements.newType') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Tabs -->
    <div role="tablist" class="flex items-end gap-6 border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :class="[
          'h-9.5 -mb-px px-0.5 border-b-2 text-[13.5px] flex items-center gap-2',
          activeTab === tab.key ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.count !== null" class="font-mono text-xs text-gray-500">{{ tab.count }}</span>
      </button>
    </div>

    <!-- ── Document types ──────────────────────────────────────── -->
    <section v-if="activeTab === 'types'" class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[720px] text-[13px]" role="table">
          <div role="row" class="grid grid-cols-[minmax(240px,2fr)_80px_minmax(160px,1fr)_120px_84px] items-center h-10 px-5 gap-x-4 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
            <span role="columnheader">{{ t('documentRequirements.document') }}</span>
            <span role="columnheader" class="text-right">{{ t('documentRequirements.order') }}</span>
            <span role="columnheader">{{ t('documentRequirements.requiredFor') }}</span>
            <span role="columnheader">{{ t('documentRequirements.status') }}</span>
            <span role="columnheader"><span class="sr-only">{{ t('common.actions') }}</span></span>
          </div>

          <template v-if="store.loading.types && !store.documentTypes.length">
            <div v-for="n in 6" :key="n" class="grid grid-cols-[minmax(240px,2fr)_80px_minmax(160px,1fr)_120px_84px] items-center h-[56px] px-5 gap-x-4 border-b border-gray-100">
              <AppSkeleton height="12px" width="60%" /><AppSkeleton height="10px" /><AppSkeleton height="10px" width="70%" /><AppSkeleton height="18px" width="60px" /><span />
            </div>
          </template>

          <div v-else-if="!store.documentTypes.length" class="flex flex-col items-center gap-2 py-14 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><FileText class="w-5 h-5" /></span>
            <p class="text-[13px] text-gray-600">{{ t('documentRequirements.noTypes') }}</p>
          </div>

          <template v-else>
            <div
              v-for="dtype in store.documentTypes"
              :key="dtype.id"
              role="row"
              class="grid grid-cols-[minmax(240px,2fr)_80px_minmax(160px,1fr)_120px_84px] items-center min-h-[56px] py-2 px-5 gap-x-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <div role="cell" class="flex items-center gap-3 min-w-0">
                <span :class="['w-8 h-8 rounded-lg flex items-center justify-center shrink-0', dtype.is_system ? 'bg-primary text-white' : dtype.is_active ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400']">
                  <Lock v-if="dtype.is_system" class="w-3.5 h-3.5" />
                  <FileText v-else class="w-4 h-4" />
                </span>
                <div class="min-w-0">
                  <p class="font-medium text-gray-900 truncate">{{ dtype.label }}</p>
                  <p class="font-mono text-[11.5px] text-gray-500 truncate">{{ dtype.name }}</p>
                </div>
              </div>
              <span role="cell" class="text-right font-mono text-gray-600">{{ dtype.sort_order }}</span>
              <span role="cell" :class="['truncate', dtype.is_system ? 'text-gray-900 font-medium' : 'text-gray-600']">{{ usageLabel(dtype) }}</span>
              <span role="cell" class="flex flex-wrap gap-1">
                <span v-if="dtype.is_system" class="px-1.5 rounded text-[11px] leading-5 font-medium bg-primary-light text-primary-hover">{{ t('documentRequirements.system') }}</span>
                <span
                  v-else
                  :class="['px-1.5 rounded text-[11px] leading-5 font-medium', dtype.is_active ? 'bg-success-bg text-success-text' : 'bg-gray-100 text-gray-500']"
                >{{ dtype.is_active ? t('documentRequirements.active') : t('documentRequirements.inactive') }}</span>
              </span>
              <span role="cell" class="flex justify-end gap-0.5">
                <button
                  type="button"
                  :title="t('common.edit')"
                  :aria-label="t('common.edit')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                  @click="openEditType(dtype)"
                ><Pencil class="w-3.5 h-3.5" /></button>
                <button
                  v-if="!dtype.is_system"
                  type="button"
                  :title="t('common.delete')"
                  :aria-label="t('common.delete')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
                  @click="handleDeleteType(dtype)"
                ><Trash2 class="w-3.5 h-3.5" /></button>
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ── Requirements grid: document × product ──────────────── -->
    <template v-if="activeTab === 'matrix'">
      <p class="flex items-start gap-2 text-[13px] text-gray-600">
        <Info class="w-4 h-4 text-primary shrink-0 mt-0.5" />
        {{ t('documentRequirements.matrixHint') }}
      </p>

      <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div v-if="store.loading.matrix && !store.matrix.length" class="p-5 space-y-3">
          <AppSkeleton v-for="n in 6" :key="n" height="28px" />
        </div>

        <p v-else-if="!store.matrix.length" class="px-5 py-12 text-center text-[13px] text-gray-500">{{ t('documentRequirements.noMatrix') }}</p>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-[13px] border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
                <th scope="col" class="sticky left-0 z-10 bg-gray-50 text-left font-medium px-5 h-12 min-w-[220px]">{{ t('documentRequirements.document') }}</th>
                <th
                  v-for="col in columns"
                  :key="col.key"
                  scope="col"
                  :title="col.title"
                  class="px-2 h-12 min-w-[84px] text-center font-medium whitespace-nowrap"
                >
                  <span class="block text-gray-900">{{ col.label }}</span>
                  <span v-if="col.sub" class="block text-[11px] font-normal text-gray-500">{{ col.sub }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Always required (signed DVC) -->
              <tr v-for="dtype in store.alwaysRequired" :key="'sys-' + dtype.id" class="border-b border-gray-100 bg-primary-light/40">
                <th scope="row" class="sticky left-0 z-10 bg-[#f5f6ff] text-left font-medium px-5 h-11">
                  <span class="flex items-center gap-2 text-gray-900">
                    <Lock class="w-3.5 h-3.5 text-primary shrink-0" />{{ dtype.label }}
                  </span>
                </th>
                <td v-for="col in columns" :key="col.key" class="text-center" :title="t('documentRequirements.lockedCell')">
                  <input type="checkbox" checked disabled class="w-4 h-4 accent-primary opacity-70 cursor-not-allowed" :aria-label="`${dtype.label} — ${col.title}`" />
                </td>
              </tr>

              <tr v-for="dtype in store.matrixDocumentTypes" :key="dtype.id" class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <th scope="row" class="sticky left-0 z-10 bg-white text-left font-medium text-gray-900 px-5 h-11">{{ dtype.label }}</th>
                <td v-for="col in columns" :key="col.key" class="text-center">
                  <input
                    type="checkbox"
                    :checked="isRequired(col, dtype.id)"
                    :disabled="store.loading.sync"
                    class="w-4 h-4 accent-primary cursor-pointer disabled:cursor-wait"
                    :aria-label="`${dtype.label} — ${col.title}${col.sub ? ' · ' + col.sub : ''}`"
                    @change="toggle(col, dtype.id)"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                <th scope="row" class="sticky left-0 z-10 bg-gray-50 text-left font-medium px-5 h-10">{{ t('documentRequirements.perProduct') }}</th>
                <td v-for="col in columns" :key="col.key" class="text-center font-mono">{{ countFor(col) + store.alwaysRequired.length }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </template>

    <!-- Document type modal -->
    <AppModal
      :open="showTypeModal"
      :title="editingType ? t('documentRequirements.editType') : t('documentRequirements.newType')"
      size="sm"
      @close="showTypeModal = false"
    >
      <form class="space-y-4" @submit.prevent="submitType">
        <AppInput
          v-model="typeForm.label"
          :label="t('documentRequirements.typeLabel')"
          :placeholder="t('documentRequirements.typeLabelPlaceholder')"
          :error="typeErrors.label"
          required
        />
        <AppInput
          v-model="typeForm.name"
          :label="t('documentRequirements.typeName')"
          :placeholder="t('documentRequirements.typeNamePlaceholder')"
          :hint="editingType ? t('documentRequirements.codeLocked') : t('documentRequirements.codeHint')"
          :error="typeErrors.name"
          :disabled="!!editingType"
          class="[&_input]:font-mono"
          required
        />
        <AppInput
          v-model.number="typeForm.sort_order"
          :label="t('documentRequirements.sortOrder')"
          :hint="t('documentRequirements.sortHint')"
          type="number"
          :min="0"
        />
        <AppToggle
          v-if="!editingType?.is_system"
          v-model="typeForm.is_active"
          :label="t('documentRequirements.activeToggle')"
        />
        <p v-else class="flex items-start gap-2 text-[12.5px] text-gray-600">
          <Lock class="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />{{ t('documentRequirements.systemHint') }}
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="showTypeModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submitType">
          {{ editingType ? t('common.save') : t('common.create') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
