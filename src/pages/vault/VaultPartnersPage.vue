<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, Globe, Building2 } from 'lucide-vue-next'
import { useVaultPartnersStore } from '@/stores/vaultPartners.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import { firstErrorMessage } from '@/utils/errors'
import AppPageHeader from '@/components/base/AppPageHeader.vue'

const { t } = useI18n()
const store = useVaultPartnersStore()
const ui = useUiStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref(null)
const form = ref({
  name: '',
  login_url: '',
  domain: '',
  identity_selector: '',
  password_selector: '',
  form_selector: '',
  notes: '',
})
const formErrors = ref({})

onMounted(() => store.fetchList(true))

function openCreate() {
  editing.value = null
  form.value = { name: '', login_url: '', domain: '', identity_selector: '', password_selector: '', form_selector: '', notes: '' }
  formErrors.value = {}
  showModal.value = true
}

function openEdit(partner) {
  editing.value = partner
  const fm = partner.field_mapping ?? {}
  form.value = {
    name: partner.name,
    login_url: partner.login_url ?? '',
    domain: partner.domain ?? '',
    identity_selector: fm.identity_selector ?? '',
    password_selector: fm.password_selector ?? '',
    form_selector: fm.form_selector ?? '',
    notes: partner.notes ?? '',
  }
  formErrors.value = {}
  showModal.value = true
}

function validate() {
  formErrors.value = {}
  if (!form.value.name.trim()) formErrors.value.name = t('common.required')
  return Object.keys(formErrors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value)
      toast.showSuccess(t('vault.partners.updateSuccess'))
    } else {
      await store.create(form.value)
      toast.showSuccess(t('vault.partners.createSuccess'))
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

async function handleDelete(partner) {
  const ok = await ui.confirm(t('vault.partners.deleteTitle'), t('vault.partners.deleteConfirm', { name: partner.name }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.remove(partner.id)
    toast.showSuccess(t('vault.partners.deleteSuccess'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('vault.partners.title')">
      <template #meta>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ store.meta.total }} {{ t('vault.partners.total') }}</p>
      </template>
      <template #actions>
        <AppButton @click="openCreate">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('vault.partners.new') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Search -->
    <AppCard padding="sm">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('vault.partners.searchPlaceholder')"
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
      <Building2 class="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">{{ t('vault.partners.empty') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard
        v-for="partner in store.list"
        :key="partner.id"
        padding="sm"
        class="flex items-start justify-between gap-3"
      >
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
            <Building2 class="w-4 h-4 text-primary" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-gray-900 truncate text-sm">{{ partner.name }}</h3>
              <AppBadge v-if="!partner.is_active" variant="danger" >{{ t('common.inactive') }}</AppBadge>
            </div>
            <p v-if="partner.domain" class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Globe class="w-3 h-3" /> {{ partner.domain }}
            </p>
            <p v-if="partner.credentials_count !== undefined" class="text-xs text-gray-400 mt-1">
              {{ partner.credentials_count }} {{ t('vault.credentials.title').toLowerCase() }}
            </p>
          </div>
        </div>
        <div class="flex gap-1 shrink-0">
          <button
            :title="t('common.edit')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
            @click="openEdit(partner)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            :title="t('common.delete')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-danger-text hover:bg-danger-bg transition-colors"
            @click="handleDelete(partner)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </AppCard>
    </div>

    <!-- Pagination -->
    <AppPagination
      v-if="store.meta.last_page > 1"
      :current-page="store.meta.current_page"
      :last-page="store.meta.last_page"
      :total="store.meta.total"
      @page-change="store.setFilter('page', $event)"
    />

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="editing ? t('vault.partners.edit') : t('vault.partners.new')"
      size="md"
      @close="showModal = false"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <AppInput
          v-model="form.name"
          :label="t('vault.partners.name')"
          :placeholder="t('vault.partners.namePlaceholder')"
          :error="formErrors.name"
          required
        />
        <AppInput
          v-model="form.login_url"
          :label="t('vault.partners.loginUrl')"
          placeholder="https://partner.example.com/login"
          :error="formErrors.login_url"
        />
        <AppInput
          v-model="form.domain"
          :label="t('vault.partners.domain')"
          placeholder="partner.example.com"
          :error="formErrors.domain"
        />
        <div class="border-t pt-4">
          <p class="text-xs font-medium text-gray-500 uppercase mb-3">{{ t('vault.partners.selectors') }}</p>
          <div class="space-y-3">
            <AppInput
              v-model="form.form_selector"
              :label="t('vault.partners.formSelector')"
              placeholder="form#login"
              :error="formErrors.form_selector"
            />
            <AppInput
              v-model="form.identity_selector"
              :label="t('vault.partners.identitySelector')"
              placeholder="#email, #username"
              :error="formErrors.identity_selector"
            />
            <AppInput
              v-model="form.password_selector"
              :label="t('vault.partners.passwordSelector')"
              placeholder="#password"
              :error="formErrors.password_selector"
            />
          </div>
        </div>
        <AppTextarea
          v-model="form.notes"
          :label="t('vault.partners.notes')"
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
