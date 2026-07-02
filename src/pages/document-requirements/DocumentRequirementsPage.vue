<script setup>
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, FileText, Settings2 } from 'lucide-vue-next'
import { useDocumentRequirementsStore } from '@/stores/documentRequirements.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

const { t } = useI18n()
const store = useDocumentRequirementsStore()
const ui = useUiStore()
const toast = useToast()

const showTypeModal = ref(false)
const editingType = ref(null)
const typeForm = ref({ name: '', label: '', is_active: true, sort_order: 0 })
const typeErrors = ref({})

const activeTab = ref('types')

onMounted(() => {
  store.fetchDocumentTypes(true)
  store.fetchMatrix(true)
})

function openCreateType() {
  editingType.value = null
  typeForm.value = { name: '', label: '', is_active: true, sort_order: 0 }
  typeErrors.value = {}
  showTypeModal.value = true
}

function openEditType(type) {
  editingType.value = type
  typeForm.value = {
    name: type.name,
    label: type.label,
    is_active: type.is_active,
    sort_order: type.sort_order,
  }
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
      await store.createDocumentType(typeForm.value)
      toast.showSuccess(t('documentRequirements.typeCreated'))
    }
    showTypeModal.value = false
    store.fetchMatrix(true)
  } catch (e) {
    if (e?.errors) {
      typeErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? t('common.noData'))
    }
  }
}

async function handleDeleteType(type) {
  const ok = await ui.confirm(
    t('documentRequirements.deleteTypeTitle'),
    t('documentRequirements.deleteTypeConfirm', { name: type.label }),
  )
  if (!ok) return
  try {
    await store.removeDocumentType(type.id)
    toast.showSuccess(t('documentRequirements.typeDeleted'))
    store.fetchMatrix(true)
  } catch (e) {
    toast.showError(e?.message ?? t('common.noData'))
  }
}

function isDocTypeRequired(matrixEntry, groupIdx, docTypeId) {
  const group = matrixEntry.groups[groupIdx]
  return group?.document_type_ids?.includes(docTypeId) ?? false
}

async function toggleRequirement(matrixEntry, groupIdx, docTypeId) {
  const group = matrixEntry.groups[groupIdx]
  const current = [...(group.document_type_ids || [])]
  const idx = current.indexOf(docTypeId)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(docTypeId)
  }
  try {
    await store.syncRequirements(matrixEntry.insurance_type, group.client_type, current)
  } catch (e) {
    toast.showError(e?.message ?? t('common.noData'))
  }
}

const insuranceTypesWithRequirements = computed(() => {
  return store.matrix.filter(
    (m) => m.groups.some((g) => g.document_type_ids.length > 0) || m.requires_client_type,
  )
})
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card"
    >
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div
        class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5"
      />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">
            {{ t('documentRequirements.title') }}
          </h1>
          <p class="text-sm text-indigo-200 mt-0.5">
            {{ t('documentRequirements.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-gray-200">
      <button
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'types'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700',
        ]"
        @click="activeTab = 'types'"
      >
        <FileText class="w-4 h-4 inline mr-1.5 -mt-0.5" />
        {{ t('documentRequirements.documentTypes') }}
      </button>
      <button
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'matrix'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700',
        ]"
        @click="activeTab = 'matrix'"
      >
        <Settings2 class="w-4 h-4 inline mr-1.5 -mt-0.5" />
        {{ t('documentRequirements.requirementsMatrix') }}
      </button>
    </div>

    <!-- Section 1: Document Types -->
    <div v-if="activeTab === 'types'">
      <div class="flex justify-end mb-4">
        <AppButton size="sm" @click="openCreateType">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('documentRequirements.newType') }}
        </AppButton>
      </div>

      <div v-if="store.loading.types" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <AppCard v-for="n in 6" :key="n" padding="sm">
          <AppSkeleton height="16px" width="60%" class="mb-2" />
          <AppSkeleton height="12px" />
        </AppCard>
      </div>

      <div v-else-if="store.documentTypes.length === 0" class="text-center py-16">
        <FileText class="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ t('documentRequirements.noTypes') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <AppCard
          v-for="dtype in store.documentTypes"
          :key="dtype.id"
          padding="sm"
          class="flex items-start justify-between gap-3"
        >
          <div class="flex items-start gap-3 min-w-0">
            <div
              :class="[
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                dtype.is_active ? 'bg-primary-light' : 'bg-gray-100',
              ]"
            >
              <FileText
                :class="['w-4 h-4', dtype.is_active ? 'text-primary' : 'text-gray-400']"
              />
            </div>
            <div class="min-w-0">
              <h3 class="font-medium text-gray-900 truncate text-sm">{{ dtype.label }}</h3>
              <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ dtype.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span
                  :class="[
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                    dtype.is_active
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500',
                  ]"
                >
                  {{ dtype.is_active ? t('documentRequirements.active') : t('documentRequirements.inactive') }}
                </span>
                <span class="text-[10px] text-gray-400">
                  #{{ dtype.sort_order }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <button
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="openEditType(dtype)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
              @click="handleDeleteType(dtype)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Section 2: Requirements Matrix -->
    <div v-if="activeTab === 'matrix'">
      <div v-if="store.loading.matrix" class="space-y-4">
        <AppCard v-for="n in 3" :key="n" padding="sm">
          <AppSkeleton height="20px" width="40%" class="mb-3" />
          <AppSkeleton height="14px" class="mb-2" />
          <AppSkeleton height="14px" width="80%" />
        </AppCard>
      </div>

      <div v-else-if="store.matrix.length === 0" class="text-center py-16">
        <Settings2 class="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ t('documentRequirements.noMatrix') }}</p>
      </div>

      <div v-else class="space-y-4">
        <AppCard v-for="entry in store.matrix" :key="entry.insurance_type" padding="md">
          <h3 class="font-semibold text-gray-900 text-sm mb-3">
            {{ entry.insurance_type_label }}
            <span class="text-xs font-mono text-gray-400 ml-2">{{ entry.insurance_type }}</span>
          </h3>

          <div v-if="entry.requires_client_type" class="space-y-4">
            <div v-for="(group, gi) in entry.groups" :key="gi">
              <p class="text-xs font-medium text-gray-600 mb-2">
                {{ group.client_type_label ?? t('documentRequirements.allClients') }}
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <label
                  v-for="dtype in store.matrixDocumentTypes"
                  :key="dtype.id"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50"
                  :class="
                    isDocTypeRequired(entry, gi, dtype.id)
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-gray-200'
                  "
                >
                  <input
                    type="checkbox"
                    :checked="isDocTypeRequired(entry, gi, dtype.id)"
                    :disabled="store.loading.sync"
                    class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    @change="toggleRequirement(entry, gi, dtype.id)"
                  />
                  <span class="text-sm text-gray-700">{{ dtype.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <label
                v-for="dtype in store.matrixDocumentTypes"
                :key="dtype.id"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50"
                :class="
                  isDocTypeRequired(entry, 0, dtype.id)
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-gray-200'
                "
              >
                <input
                  type="checkbox"
                  :checked="isDocTypeRequired(entry, 0, dtype.id)"
                  :disabled="store.loading.sync"
                  class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  @change="toggleRequirement(entry, 0, dtype.id)"
                />
                <span class="text-sm text-gray-700">{{ dtype.label }}</span>
              </label>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Document Type Modal -->
    <AppModal
      :open="showTypeModal"
      :title="editingType ? t('documentRequirements.editType') : t('documentRequirements.newType')"
      size="sm"
      @close="showTypeModal = false"
    >
      <form class="space-y-4" @submit.prevent="submitType">
        <AppInput
          v-model="typeForm.name"
          :label="t('documentRequirements.typeName')"
          :placeholder="t('documentRequirements.typeNamePlaceholder')"
          :error="typeErrors.name"
          :disabled="!!editingType"
          required
        />
        <AppInput
          v-model="typeForm.label"
          :label="t('documentRequirements.typeLabel')"
          :placeholder="t('documentRequirements.typeLabelPlaceholder')"
          :error="typeErrors.label"
          required
        />
        <AppInput
          v-model.number="typeForm.sort_order"
          :label="t('documentRequirements.sortOrder')"
          type="number"
          :min="0"
        />
        <AppToggle v-model="typeForm.is_active" :label="t('documentRequirements.activeToggle')" />
      </form>
      <template #footer>
        <AppButton variant="ghost" @click="showTypeModal = false">{{
          t('common.cancel')
        }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submitType">
          {{ editingType ? t('common.save') : t('common.create') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
