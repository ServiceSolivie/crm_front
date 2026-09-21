<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, Link } from 'lucide-vue-next'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { firstErrorMessage } from '@/utils/errors'
import AppPageHeader from '@/components/base/AppPageHeader.vue'

const { t } = useI18n()
const store = useLeadSourcesStore()
const ui = useUiStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', code: '' })
const formErrors = ref({})

onMounted(() => store.fetchList(true))

const GRID = 'grid grid-cols-[minmax(240px,2fr)_minmax(140px,1fr)_90px_76px] items-center gap-x-4 px-5'

function openCreate() {
  editing.value = null
  form.value = { name: '', code: '' }
  formErrors.value = {}
  showModal.value = true
}

function openEdit(source) {
  editing.value = source
  form.value = { name: source.name, code: source.code ?? '' }
  formErrors.value = {}
  showModal.value = true
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 50)
}

function validate() {
  formErrors.value = {}
  if (!form.value.name.trim()) formErrors.value.name = t('common.nameRequired')
  if (!editing.value && !form.value.code.trim()) formErrors.value.code = t('common.required')
  return Object.keys(formErrors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value)
      toast.showSuccess(t('leadSources.updateSuccess'))
    } else {
      await store.create(form.value)
      toast.showSuccess(t('leadSources.createSuccess'))
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

async function handleDelete(source) {
  const ok = await ui.confirm(t('leadSources.deleteTitle'), t('leadSources.deleteConfirmMsg', { name: source.name }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.remove(source.id)
    toast.showSuccess(t('leadSources.deleteSuccess'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader
      :eyebrow="t('nav.crmSettings')"
      :title="t('leadSources.title')"
      :count="store.list.length"
      :subtitle="t('leadSources.subtitle')"
    >
      <template #actions>
        <AppButton @click="openCreate">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('leadSources.newSource') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppSearchInput
      :model-value="store.filters.search"
      :placeholder="t('leadSources.searchPlaceholder')"
      class="w-full sm:w-[300px]"
      @update:model-value="store.setFilter('search', $event)"
    />

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[640px] text-[13px]" role="table" :aria-label="t('leadSources.title')">
          <div role="row" :class="[GRID, 'h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
            <span role="columnheader">{{ t('leadSources.name') }}</span>
            <span role="columnheader">{{ t('leadSources.code') }}</span>
            <span role="columnheader" class="text-right">{{ t('leadSources.leads') }}</span>
            <span role="columnheader"><span class="sr-only">{{ t('common.actions') }}</span></span>
          </div>

          <template v-if="store.loading.list && !store.list.length">
            <div v-for="n in 6" :key="n" :class="[GRID, 'h-[56px] border-b border-gray-100']">
              <AppSkeleton height="12px" width="60%" /><AppSkeleton height="10px" width="50%" /><AppSkeleton height="10px" /><span />
            </div>
          </template>

          <div v-else-if="!store.list.length" class="flex flex-col items-center gap-2 py-14 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><Link class="w-5 h-5" /></span>
            <p class="text-[13px] text-gray-600">{{ store.filters.search ? t('leadSources.noMatch') : t('leadSources.noSourcesAdd') }}</p>
          </div>

          <template v-else>
            <div
              v-for="source in store.list"
              :key="source.id"
              role="row"
              :class="[GRID, 'min-h-[56px] py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50']"
            >
              <div role="cell" class="flex items-center gap-3 min-w-0">
                <AppAvatar :name="source.name" size="sm" tone="brand" />
                <div class="min-w-0">
                  <p class="font-medium text-gray-900 truncate">{{ source.name }}</p>
                  <p v-if="source.is_active === false" class="text-xs text-gray-500">{{ t('leadSources.inactive') }}</p>
                </div>
              </div>
              <span role="cell" class="font-mono text-[12.5px] text-gray-600 truncate">{{ source.code || '—' }}</span>
              <span role="cell" class="text-right font-mono text-gray-900">{{ source.leads_count ?? '—' }}</span>
              <span role="cell" class="flex justify-end gap-0.5">
                <button
                  type="button"
                  :title="t('common.edit')"
                  :aria-label="t('common.edit')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                  @click="openEdit(source)"
                ><Pencil class="w-3.5 h-3.5" /></button>
                <button
                  type="button"
                  :title="t('common.delete')"
                  :aria-label="t('common.delete')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
                  @click="handleDelete(source)"
                ><Trash2 class="w-3.5 h-3.5" /></button>
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <AppModal
      :open="showModal"
      :title="editing ? t('leadSources.editSource') : t('leadSources.newSource')"
      size="sm"
      @close="showModal = false"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <AppInput
          v-model="form.name"
          :label="t('leadSources.name')"
          :placeholder="t('leadSources.namePlaceholder')"
          :error="formErrors.name"
          required
          @input="() => { if (!editing) form.code = slugify(form.name) }"
        />
        <AppInput
          v-model="form.code"
          :label="t('leadSources.code')"
          :placeholder="t('leadSources.codePlaceholder')"
          :hint="editing ? t('leadSources.codeLocked') : t('leadSources.codeHint')"
          :error="formErrors.code"
          class="[&_input]:font-mono"
          required
          :disabled="!!editing"
        />
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
