<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users.store'
import { useTeamsStore } from '@/stores/teams.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import ResetPasswordModal from '@/components/modules/users/ResetPasswordModal.vue'
import { ROLES } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatDate } from '@/utils/formatters'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'

const router = useRouter()
const store = useUsersStore()
const teamsStore = useTeamsStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const showResetPasswordModal = ref(false)
const resetPasswordTarget = ref(null)

const COLUMNS = computed(() => [
  { key: 'name', label: t('users.name'), sortable: false },
  { key: 'email', label: t('users.email') },
  { key: 'roles', label: t('users.role') },
  { key: 'is_active', label: t('users.status') },
  { key: 'created_at', label: t('users.joined') },
  { key: 'actions', label: '', align: 'right', width: '120px' },
])

const roleEnumOptions = useEnumOptions(ROLES, 'roles')
const statusOptions = computed(() => [
  { value: '1', label: t('common.active') },
  { value: '0', label: t('common.inactive') },
])
const teamOptions = computed(() => [
  ...teamsStore.list.map((t) => ({ value: t.id, label: t.name })),
])

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => {
  store.fetchList()
  teamsStore.fetchList()
})

async function toggleActive(user) {
  try {
    await store.toggleStatus(user.id, !user.is_active)
    toast.showSuccess(user.is_active ? t('users.deactivateSuccess') : t('users.activateSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('users.statusFailed'))
  }
}

async function handleDelete(user) {
  const ok = await ui.confirm(t('users.deleteTitle'), t('users.deleteNamed', { name: user.name }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.remove(user.id)
    toast.showSuccess(t('users.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('users.deleteFailed'))
  }
}

function canResetPassword(user) {
  return auth.hasRole('super_admin') && !user.roles?.includes('super_admin')
}

function openResetPassword(user) {
  resetPasswordTarget.value = user
  showResetPasswordModal.value = true
}

async function onResetPassword(payload) {
  const user = resetPasswordTarget.value
  try {
    await store.resetPassword(user.id, payload)
    toast.showSuccess(t('users.resetPasswordSuccess'))
    showResetPasswordModal.value = false
    resetPasswordTarget.value = null
  } catch (e) {
    toast.showError(e?.message ?? t('users.resetPasswordFailed'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('users.title')">
      <template #meta>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ store.meta.total }} {{ t('users.total') }}</p>
      </template>
      <template #actions>
        <div class="flex items-center gap-2 shrink-0">
          <AppButton @click="router.push({ name: 'users.create' })">
            <template #icon><Plus class="w-4 h-4" /></template>
            {{ t('users.newUser') }}
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <div class="flex flex-wrap items-center gap-2">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('users.searchPlaceholder')"
        class="w-full sm:w-[280px]"
        @update:model-value="store.setFilter('search', $event)"
      />
      <AppFilterChip
        :label="t('users.role')"
        :model-value="store.filters.role"
        :options="roleEnumOptions"
        :searchable="false"
        @update:model-value="store.setFilter('role', $event)"
      />
      <AppFilterChip
        :label="t('users.status')"
        :model-value="store.filters.is_active"
        :options="statusOptions"
        :searchable="false"
        @update:model-value="store.setFilter('is_active', $event)"
      />
      <AppFilterChip
        :label="t('users.team')"
        :model-value="store.filters.team_id"
        :options="teamOptions"
        @update:model-value="store.setFilter('team_id', $event)"
      />
      <button
        v-if="store.filters.role || store.filters.is_active || store.filters.team_id || store.filters.search"
        type="button"
        class="h-9 px-2 text-[13px] text-gray-600 hover:text-gray-900"
        @click="store.resetFilters()"
      >{{ t('common.clear') }}</button>
    </div>

    <AppCard padding="none">
      <AppTable
        class="cursor-pointer"
        :columns="COLUMNS"
        :rows="store.list"
        :loading="store.loading.list"
        row-key="id"
        :empty-title="t('users.noUsers')"
        :empty-description="t('users.inviteFirst')"
        @row-click="(row) => router.push({ name: 'users.detail', params: { id: row.id } })"
      >
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2.5">
            <AppAvatar :name="row.name" size="sm" />
            <span class="font-medium text-gray-900 text-sm">{{ row.name }}</span>
          </div>
        </template>

        <template #cell-email="{ value }">
          <span class="text-sm text-gray-500">{{ value }}</span>
        </template>

        <template #cell-roles="{ value }">
          <AppBadge
            :variant="value?.[0] === 'super_admin' ? 'danger' : value?.[0] === 'manager' ? 'warning' : 'info'"
            :label="value?.[0]?.replace(/_/g, ' ') ?? '—'"
          />
        </template>

        <template #cell-is_active="{ row }">
          <div @click.stop>
            <AppToggle
              :model-value="row.is_active"
              @update:model-value="() => toggleActive(row)"
            />
          </div>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-sm text-gray-500">{{ formatDate(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1" @click.stop>
            <button
              v-if="canResetPassword(row)"
              :title="t('users.resetPassword')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="openResetPassword(row)"
            >
              <KeyRound class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="router.push({ name: 'users.edit', params: { id: row.id } })"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger-text hover:bg-danger-bg transition-colors"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </AppTable>

      <div class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          @page-change="store.setFilter('page', $event)"
          @per-page-change="store.setFilter('per_page', $event)"
        />
      </div>
    </AppCard>

    <ResetPasswordModal
      :open="showResetPasswordModal"
      :user="resetPasswordTarget"
      :loading="store.loading.action"
      @close="showResetPasswordModal = false"
      @reset="onResetPassword"
    />
  </div>
</template>
