<script setup>
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-vue-next'
import { useVaultCredentialsStore } from '@/stores/vaultCredentials.store'
import { useVaultPartnersStore } from '@/stores/vaultPartners.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import { firstErrorMessage } from '@/utils/errors'

const { t } = useI18n()
const store = useVaultCredentialsStore()
const partnersStore = useVaultPartnersStore()
const ui = useUiStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref(null)
const form = ref({
  partner_id: '',
  label: '',
  username: '',
  email: '',
  password: '',
})
const formErrors = ref({})

const columns = computed(() => [
  { key: 'label', label: t('vault.credentials.label'), width: '25%' },
  { key: 'partner', label: t('vault.partners.name'), width: '20%' },
  { key: 'username', label: t('vault.credentials.username'), width: '20%' },
  { key: 'email', label: t('vault.credentials.email'), width: '20%' },
  { key: 'status', label: t('common.status'), width: '10%', align: 'center' },
  { key: 'actions', label: '', width: '5%', align: 'right' },
])

onMounted(() => {
  store.fetchList(true)
  partnersStore.fetchList()
})

function openCreate() {
  editing.value = null
  form.value = { partner_id: '', label: '', username: '', email: '', password: '' }
  formErrors.value = {}
  showModal.value = true
}

function openEdit(cred) {
  editing.value = cred
  form.value = {
    partner_id: cred.partner?.id ?? '',
    label: cred.label,
    username: '',
    email: '',
    password: '',
  }
  formErrors.value = {}
  showModal.value = true
}

function validate() {
  formErrors.value = {}
  if (!form.value.label.trim()) formErrors.value.label = t('common.required')
  if (!editing.value && !form.value.partner_id) formErrors.value.partner_id = t('common.required')
  return Object.keys(formErrors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value)
      toast.showSuccess(t('vault.credentials.updateSuccess'))
    } else {
      await store.create(form.value)
      toast.showSuccess(t('vault.credentials.createSuccess'))
    }
    showModal.value = false
    store.fetchList(true)
  } catch (e) {
    if (e?.errors) {
      formErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

async function handleDelete(cred) {
  const ok = await ui.confirm(t('vault.credentials.deleteTitle'), t('vault.credentials.deleteConfirm', { label: cred.label }))
  if (!ok) return
  try {
    await store.remove(cred.id)
    toast.showSuccess(t('vault.credentials.deleteSuccess'))
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
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
          <h1 class="text-2xl font-bold text-white">{{ t('vault.credentials.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('vault.credentials.total') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="openCreate">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('vault.credentials.new') }}
        </AppButton>
      </div>
    </div>

    <!-- Filters -->
    <AppCard padding="sm">
      <div class="flex flex-wrap gap-3">
        <div class="flex-1 min-w-[200px]">
          <AppSearchInput
            :model-value="store.filters.search"
            :placeholder="t('vault.credentials.searchPlaceholder')"
            @update:model-value="store.setFilter('search', $event)"
          />
        </div>
        <div class="w-48">
          <AppSelect
            :model-value="store.filters.partner_id"
            :options="[{ label: t('vault.credentials.allPartners'), value: '' }, ...partnersStore.options()]"
            @update:model-value="store.setFilter('partner_id', $event)"
          />
        </div>
      </div>
    </AppCard>

    <!-- Table -->
    <AppCard padding="none">
      <AppTable
        :columns="columns"
        :rows="store.list"
        :loading="store.loading.list"
        :empty-title="t('vault.credentials.empty')"
      >
        <template #cell-label="{ row }">
          <div class="flex items-center gap-2">
            <KeyRound class="w-4 h-4 text-primary shrink-0" />
            <span class="font-medium">{{ row.label }}</span>
          </div>
        </template>
        <template #cell-partner="{ row }">
          {{ row.partner?.name ?? '—' }}
        </template>
        <template #cell-username="{ row }">
          <span class="text-gray-400">{{ row.has_username ? '••••••••' : '—' }}</span>
        </template>
        <template #cell-email="{ row }">
          <span class="text-gray-400">{{ row.has_email ? '••••••••' : '—' }}</span>
        </template>
        <template #cell-status="{ row }">
          <AppBadge :variant="row.is_active ? 'success' : 'danger'" >
            {{ row.is_active ? t('common.active') : t('common.inactive') }}
          </AppBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1 justify-end">
            <button
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click.stop="openEdit(row)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
              @click.stop="handleDelete(row)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </AppTable>
    </AppCard>

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
      :title="editing ? t('vault.credentials.edit') : t('vault.credentials.new')"
      size="md"
      @close="showModal = false"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <AppSelect
          v-model="form.partner_id"
          :label="t('vault.partners.name')"
          :options="partnersStore.options()"
          :error="formErrors.partner_id"
          :disabled="!!editing"
          required
        />
        <AppInput
          v-model="form.label"
          :label="t('vault.credentials.label')"
          :placeholder="t('vault.credentials.labelPlaceholder')"
          :error="formErrors.label"
          required
        />
        <div class="border-t pt-4">
          <p class="text-xs font-medium text-gray-500 uppercase mb-3">{{ t('vault.credentials.secrets') }}</p>
          <p v-if="editing" class="text-xs text-gray-400 mb-3">{{ t('vault.credentials.leaveBlank') }}</p>
          <div class="space-y-3">
            <AppInput
              v-model="form.username"
              :label="t('vault.credentials.username')"
              :error="formErrors.username"
              autocomplete="off"
            />
            <AppInput
              v-model="form.email"
              :label="t('vault.credentials.email')"
              type="email"
              :error="formErrors.email"
              autocomplete="off"
            />
            <AppInput
              v-model="form.password"
              :label="t('vault.credentials.password')"
              type="password"
              :error="formErrors.password"
              autocomplete="off"
            />
          </div>
        </div>
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
