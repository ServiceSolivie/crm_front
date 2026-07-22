<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, Link } from 'lucide-vue-next'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

const { t } = useI18n()
const store = useLeadSourcesStore()
const ui = useUiStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', code: '', description: '' })
const formErrors = ref({})

onMounted(() => store.fetchList(true))

function openCreate() {
  editing.value = null
  form.value = { name: '', code: '', description: '' }
  formErrors.value = {}
  showModal.value = true
}

function openEdit(source) {
  editing.value = source
  form.value = { name: source.name, code: source.code ?? '', description: source.description ?? '' }
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
    } else {
      toast.showError(e?.message ?? t('common.noData'))
    }
  }
}

async function handleDelete(source) {
  const ok = await ui.confirm(t('leadSources.deleteTitle'), t('leadSources.deleteConfirmMsg', { name: source.name }))
  if (!ok) return
  try {
    await store.remove(source.id)
    toast.showSuccess(t('leadSources.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('common.noData'))
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('leadSources.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.list.length }} {{ t('leadSources.total') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="openCreate">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('leadSources.newSource') }}
        </AppButton>
      </div>
    </div>

    <!-- Search -->
    <AppCard padding="sm">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('leadSources.searchPlaceholder')"
        @update:model-value="store.setFilter('search', $event)"
      />
    </AppCard>

    <!-- Grid -->
    <div v-if="store.loading.list" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard v-for="n in 6" :key="n" padding="sm">
        <AppSkeleton height="16px" width="60%" class="mb-2" />
        <AppSkeleton height="12px" />
        <AppSkeleton height="12px" width="70%" class="mt-1" />
      </AppCard>
    </div>

    <div v-else-if="store.list.length === 0" class="text-center py-16">
      <Link class="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">{{ t('leadSources.noSourcesAdd') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard
        v-for="source in store.list"
        :key="source.id"
        padding="sm"
        class="flex items-start justify-between gap-3"
      >
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
            <Link class="w-4 h-4 text-primary" />
          </div>
          <div class="min-w-0">
            <h3 class="font-medium text-gray-900 truncate text-sm">{{ source.name }}</h3>
            <p v-if="source.description" class="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {{ source.description }}
            </p>
            <p v-if="source.leads_count !== undefined" class="text-xs text-gray-400 mt-1">
              {{ source.leads_count }} {{ t('teams.leads') }}
            </p>
          </div>
        </div>
        <div class="flex gap-1 shrink-0">
          <button
            :title="t('common.edit')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
            @click="openEdit(source)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            :title="t('common.delete')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
            @click="handleDelete(source)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </AppCard>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="editing ? t('leadSources.name') : t('leadSources.newSource')"
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
          :error="formErrors.code"
          required
          :disabled="!!editing"
        />
        <AppTextarea
          v-model="form.description"
          :label="t('leadSources.descriptionOptional')"
          :rows="2"
        />
      </form>
      <template #footer>
        <AppButton variant="ghost" @click="showModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submit">
          {{ editing ? t('common.save') : t('common.create') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
