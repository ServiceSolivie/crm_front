<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, Filter, X, Pencil, Trash2 } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users.store'
import { useTeamsStore } from '@/stores/teams.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import { ROLES } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatDate } from '@/utils/formatters'

const router = useRouter()
const store = useUsersStore()
const teamsStore = useTeamsStore()
const ui = useUiStore()
const toast = useToast()
const { t } = useI18n()

const showFilters = ref(false)

const COLUMNS = computed(() => [
  { key: 'name', label: t('users.name'), sortable: false },
  { key: 'email', label: t('users.email') },
  { key: 'roles', label: t('users.role') },
  { key: 'is_active', label: t('users.status') },
  { key: 'created_at', label: t('users.joined') },
  { key: 'actions', label: '', align: 'right', width: '120px' },
])

const roleEnumOptions = useEnumOptions(ROLES, 'roles')
const roleOptions = computed(() => [{ value: '', label: t('users.allRoles') }, ...roleEnumOptions.value])
const statusOptions = computed(() => [
  { value: '', label: t('users.allStatuses') },
  { value: '1', label: t('common.active') },
  { value: '0', label: t('common.inactive') },
])
const teamOptions = computed(() => [
  { value: '', label: t('users.allTeams') },
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
    toast.showError(e?.message ?? 'Failed to update status')
  }
}

async function handleDelete(user) {
  const ok = await ui.confirm(t('users.deleteTitle'), `Delete "${user.name}"? This cannot be undone.`)
  if (!ok) return
  try {
    await store.remove(user.id)
    toast.showSuccess(t('users.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to delete user')
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
          <h1 class="text-2xl font-bold text-white">{{ t('users.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('users.total') }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <AppButton variant="secondary" size="sm" @click="showFilters = !showFilters">
            <template #icon><Filter class="w-4 h-4" /></template>
            {{ t('common.filter') }}
          </AppButton>
          <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="router.push({ name: 'users.create' })">
            <template #icon><Plus class="w-4 h-4" /></template>
            {{ t('users.newUser') }}
          </AppButton>
        </div>
      </div>
    </div>

    <AppCard padding="sm" class="space-y-3">
      <AppSearchInput
        :model-value="store.filters.search"
        placeholder="Search name or email…"
        @update:model-value="store.setFilter('search', $event)"
      />
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showFilters" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AppSelect
            :model-value="store.filters.role"
            :options="roleOptions"
            @update:model-value="store.setFilter('role', $event)"
          />
          <AppSelect
            :model-value="store.filters.is_active"
            :options="statusOptions"
            @update:model-value="store.setFilter('is_active', $event)"
          />
          <AppSelect
            :model-value="store.filters.team_id"
            :options="teamOptions"
            @update:model-value="store.setFilter('team_id', $event)"
          />
          <div class="flex items-end">
            <AppButton
              v-if="store.filters.role || store.filters.is_active || store.filters.team_id"
              variant="danger"
              size="sm"
              class="w-full"
              @click="store.resetFilters()"
            >
              <template #icon><X class="w-3.5 h-3.5" /></template>
              Clear
            </AppButton>
          </div>
        </div>
      </Transition>
    </AppCard>

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
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="router.push({ name: 'users.edit', params: { id: row.id } })"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
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
  </div>
</template>
