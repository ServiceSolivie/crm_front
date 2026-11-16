<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Lock, Pencil, Layers } from 'lucide-vue-next'
import { useInsuranceTypesStore } from '@/stores/insuranceTypes.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import { firstErrorMessage } from '@/utils/errors'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'

/**
 * Insurance types (super admin): their names, which leads page each one
 * shows on, whether the lead form asks for the company, and whether it can
 * still be picked. Also the extra leads pages themselves.
 */
const { t } = useI18n()
const store = useInsuranceTypesStore()
const ui = useUiStore()
const toast = useToast()

onMounted(() => store.fetchAll(true))

const pageOptions = computed(() => [
  { value: '', label: t('insuranceTypes.leadsPage') },
  ...store.pages.map((p) => ({ value: p.id, label: p.name })),
])
const typesOnPage = (pageId) => store.types.filter((type) => String(type.lead_page_id) === String(pageId)).length

function apiErrors(e) {
  return e?.errors ? Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) : {}
}

/* ── Types ─────────────────────────────────────────────────── */
const showTypeModal = ref(false)
const editingType = ref(null)
const typeForm = ref({})
const typeErrors = ref({})

// "Assurance Flotte" → ASSURANCE_FLOTTE
function toCode(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^[_0-9]+|_+$/g, '')
    .substring(0, 40)
}

function openType(type = null) {
  editingType.value = type
  typeForm.value = type
    ? { label: type.label, short_label: type.short_label, code: type.code, lead_page_id: type.lead_page_id ?? '', requires_company_info: type.requires_company_info }
    : { label: '', short_label: '', code: '', lead_page_id: '', requires_company_info: false }
  typeErrors.value = {}
  showTypeModal.value = true
}

async function submitType() {
  typeErrors.value = {}
  const f = typeForm.value
  if (!f.label.trim()) typeErrors.value.label = t('insuranceTypes.labelRequired')
  else if (!editingType.value && !f.code) typeErrors.value.label = t('insuranceTypes.labelUnusable')
  if (Object.keys(typeErrors.value).length) return

  const payload = {
    label: f.label.trim(),
    short_label: f.short_label.trim() || f.label.trim().slice(0, 40),
    lead_page_id: f.lead_page_id || null,
    requires_company_info: !!f.requires_company_info,
    ...(editingType.value ? {} : { code: f.code }),
  }
  try {
    await store.saveType(editingType.value?.id, payload)
    toast.showSuccess(t(editingType.value ? 'insuranceTypes.updateSuccess' : 'insuranceTypes.createSuccess'))
    showTypeModal.value = false
  } catch (e) {
    typeErrors.value = apiErrors(e)
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

// Inline changes from the table: page, company block, active
async function patchType(type, changes) {
  try {
    await store.saveType(type.id, changes)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

async function toggleActive(type) {
  if (type.is_active) {
    const ok = await ui.confirm(
      t('insuranceTypes.deactivateTitle'),
      t('insuranceTypes.deactivateConfirmMsg', { name: type.label }),
      { confirmLabel: t('insuranceTypes.deactivate') },
    )
    if (!ok) return
  }
  await patchType(type, { is_active: !type.is_active })
}

async function deleteType(type) {
  const ok = await ui.confirm(t('insuranceTypes.deleteTitle'), t('insuranceTypes.deleteConfirmMsg', { name: type.label }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.removeType(type.id)
    toast.showSuccess(t('insuranceTypes.deleteSuccess'))
    showTypeModal.value = false
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

/* ── Pages ─────────────────────────────────────────────────── */
const showPageModal = ref(false)
const editingPage = ref(null)
const pageName = ref('')
const pageErrors = ref({})

function openPage(page = null) {
  editingPage.value = page
  pageName.value = page?.name ?? ''
  pageErrors.value = {}
  showPageModal.value = true
}

async function submitPage() {
  pageErrors.value = {}
  if (!pageName.value.trim()) {
    pageErrors.value.name = t('insuranceTypes.pageNameRequired')
    return
  }
  try {
    await store.savePage(editingPage.value?.id, { name: pageName.value.trim() })
    toast.showSuccess(t(editingPage.value ? 'insuranceTypes.pageUpdated' : 'insuranceTypes.pageCreated'))
    showPageModal.value = false
  } catch (e) {
    pageErrors.value = apiErrors(e)
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

async function deletePage(page) {
  const ok = await ui.confirm(t('insuranceTypes.deletePageTitle'), t('insuranceTypes.deletePageConfirmMsg', { name: page.name }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.removePage(page.id)
    toast.showSuccess(t('insuranceTypes.pageDeleted'))
    showPageModal.value = false
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

const GRID = 'grid grid-cols-[minmax(160px,1.4fr)_minmax(110px,1fr)_70px_minmax(160px,1.2fr)_110px_80px] gap-x-4 items-center'
const SWITCH = 'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :eyebrow="t('nav.crmSettings')" :title="t('insuranceTypes.title')" :subtitle="t('insuranceTypes.subtitle')">
      <template #actions>
        <AppButton @click="openType()">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('insuranceTypes.newType') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Extra leads pages -->
    <section class="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('insuranceTypes.pagesTitle') }}</h2>
      <p class="text-[13px] text-gray-500 mt-0.5">{{ t('insuranceTypes.pagesHint') }}</p>
      <div class="flex flex-wrap items-center gap-2 mt-3">
        <span class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-100 text-[13px] text-gray-700" :title="t('insuranceTypes.leadsPageHint')">
          <Lock class="w-3.5 h-3.5 opacity-60" />{{ t('insuranceTypes.leadsPage') }}
        </span>
        <button
          v-for="page in store.pages"
          :key="page.id"
          type="button"
          class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 hover:bg-gray-50"
          @click="openPage(page)"
        >
          <Layers class="w-3.5 h-3.5 text-gray-500" />{{ page.name }}
          <span class="text-gray-500">· {{ typesOnPage(page.id) }}</span>
          <Pencil class="w-3 h-3 text-gray-400" />
        </button>
        <button type="button" class="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[13px] font-medium text-primary hover:bg-primary-light" @click="openPage()">
          <Plus class="w-3.5 h-3.5" />{{ t('insuranceTypes.addPage') }}
        </button>
      </div>
    </section>

    <!-- Types -->
    <section class="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <div class="min-w-[760px]">
        <div :class="[GRID, 'h-10 px-5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
          <span>{{ t('insuranceTypes.name') }}</span>
          <span>{{ t('insuranceTypes.code') }}</span>
          <span class="text-right">{{ t('insuranceTypes.leads') }}</span>
          <span>{{ t('insuranceTypes.page') }}</span>
          <span class="text-center">{{ t('insuranceTypes.companyInfo') }}</span>
          <span class="text-center">{{ t('insuranceTypes.active') }}</span>
        </div>

        <p v-if="store.loading.list && !store.types.length" class="px-5 py-10 text-center text-sm text-gray-500">{{ t('common.loading') }}</p>

        <div
          v-for="type in store.types"
          :key="type.id"
          :class="[GRID, 'min-h-[52px] px-5 py-2 border-b border-gray-100 last:border-b-0 text-[13px]', !type.is_active && 'bg-gray-50/60']"
        >
          <button type="button" class="min-w-0 text-left group" @click="openType(type)">
            <span :class="['block font-medium truncate group-hover:text-primary', type.is_active ? 'text-gray-900' : 'text-gray-500']">{{ type.label }}</span>
            <span class="block text-xs text-gray-500 truncate">{{ type.short_label }}<template v-if="type.is_system"> · {{ t('insuranceTypes.system') }}</template></span>
          </button>
          <span class="font-mono text-xs text-gray-600 truncate">{{ type.code }}</span>
          <span class="text-right font-mono">{{ type.leads_count ?? 0 }}</span>
          <select
            :value="type.lead_page_id ?? ''"
            :aria-label="t('insuranceTypes.pageOf', { name: type.label })"
            class="h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-[13px] text-gray-900"
            @change="patchType(type, { lead_page_id: $event.target.value ? Number($event.target.value) : null })"
          >
            <option v-for="o in pageOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <span class="flex justify-center">
            <button
              type="button"
              role="switch"
              :aria-checked="type.requires_company_info"
              :aria-label="t('insuranceTypes.companyInfoOf', { name: type.label })"
              :class="[SWITCH, type.requires_company_info ? 'bg-primary' : 'bg-gray-200']"
              @click="patchType(type, { requires_company_info: !type.requires_company_info })"
            >
              <span :class="['inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform', type.requires_company_info ? 'translate-x-[18px]' : 'translate-x-0.5']" />
            </button>
          </span>
          <span class="flex justify-center">
            <button
              type="button"
              role="switch"
              :aria-checked="type.is_active"
              :aria-label="t('insuranceTypes.activeOf', { name: type.label })"
              :class="[SWITCH, type.is_active ? 'bg-primary' : 'bg-gray-200']"
              @click="toggleActive(type)"
            >
              <span :class="['inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform', type.is_active ? 'translate-x-[18px]' : 'translate-x-0.5']" />
            </button>
          </span>
        </div>
      </div>
    </section>

    <!-- Type window -->
    <AppModal :open="showTypeModal" :title="editingType ? t('insuranceTypes.editType') : t('insuranceTypes.newType')" size="sm" @close="showTypeModal = false">
      <form class="space-y-4" @submit.prevent="submitType">
        <AppInput
          v-model="typeForm.label"
          :label="t('insuranceTypes.name')"
          :placeholder="t('insuranceTypes.namePlaceholder')"
          :error="typeErrors.label"
          required
          @input="() => { if (!editingType) typeForm.code = toCode(typeForm.label) }"
        />
        <AppInput v-model="typeForm.short_label" :label="t('insuranceTypes.shortName')" :hint="t('insuranceTypes.shortNameHint')" :error="typeErrors.short_label" />
        <AppInput
          :model-value="typeForm.code"
          :label="t('insuranceTypes.code')"
          :hint="editingType ? t('insuranceTypes.codeLocked') : t('insuranceTypes.codeHint')"
          :error="typeErrors.code"
          class="[&_input]:font-mono"
          disabled
        />
        <AppSelect v-model="typeForm.lead_page_id" :label="t('insuranceTypes.page')" :options="pageOptions" :hint="t('insuranceTypes.pageHint')" />
        <label class="flex items-start gap-2.5 text-[13px] text-gray-900">
          <input v-model="typeForm.requires_company_info" type="checkbox" class="mt-0.5 w-4 h-4 accent-primary">
          <span>{{ t('insuranceTypes.companyInfo') }}<span class="block text-xs text-gray-500">{{ t('insuranceTypes.companyInfoHint') }}</span></span>
        </label>

        <div v-if="editingType" class="pt-4 border-t border-gray-100 space-y-2">
          <p class="text-[13px] text-gray-600">{{ t('insuranceTypes.leadsCount', { n: editingType.leads_count ?? 0 }, editingType.leads_count ?? 0) }}</p>
          <AppButton
            v-if="!editingType.is_system && !editingType.leads_count"
            variant="ghost"
            size="sm"
            class="!text-danger-text hover:!bg-danger-bg"
            :loading="store.loading.action"
            @click="deleteType(editingType)"
          >
            <template #icon><Trash2 class="w-3.5 h-3.5" /></template>
            {{ t('common.delete') }}
          </AppButton>
          <p v-else class="text-xs text-gray-500">{{ t('insuranceTypes.usedHint') }}</p>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="showTypeModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submitType">{{ editingType ? t('common.save') : t('common.create') }}</AppButton>
      </template>
    </AppModal>

    <!-- Page window -->
    <AppModal :open="showPageModal" :title="editingPage ? t('insuranceTypes.editPage') : t('insuranceTypes.addPage')" size="sm" @close="showPageModal = false">
      <form class="space-y-4" @submit.prevent="submitPage">
        <AppInput v-model="pageName" :label="t('insuranceTypes.pageName')" :placeholder="t('insuranceTypes.pageNamePlaceholder')" :error="pageErrors.name" required />
        <p class="text-xs text-gray-500">{{ t('insuranceTypes.pageAssignHint') }}</p>
        <div v-if="editingPage" class="pt-4 border-t border-gray-100 space-y-2">
          <AppButton variant="ghost" size="sm" class="!text-danger-text hover:!bg-danger-bg" :loading="store.loading.action" @click="deletePage(editingPage)">
            <template #icon><Trash2 class="w-3.5 h-3.5" /></template>
            {{ t('common.delete') }}
          </AppButton>
          <p class="text-xs text-gray-500">{{ t('insuranceTypes.deletePageHint') }}</p>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="showPageModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submitPage">{{ editingPage ? t('common.save') : t('common.create') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
