<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, Users, TrendingUp, Pencil, Trash2, Crown } from 'lucide-vue-next'
import { useTeamsStore } from '@/stores/teams.store'
import { useUsersStore } from '@/stores/users.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppPagination from '@/components/base/AppPagination.vue'

const router = useRouter()
const { t } = useI18n()
const store = useTeamsStore()
const usersStore = useUsersStore()
const ui = useUiStore()
const toast = useToast()

const showCreateModal = ref(false)
const editingTeam = ref(null)
const form = ref({ name: '', description: '', leader_id: '' })
const formErrors = ref({})
const leaderOptions = ref([{ value: '', label: '' }])

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(async () => {
  await Promise.all([store.fetchList(), usersStore.fetchList({ per_page: 100 })])
  leaderOptions.value = [
    { value: '', label: t('teams.noLeader') },
    ...usersStore.list
      .filter((u) => u.role === 'team_leader')
      .map((u) => ({ value: u.id, label: u.name })),
  ]
})

function openCreate() {
  editingTeam.value = null
  form.value = { name: '', description: '', leader_id: '' }
  formErrors.value = {}
  showCreateModal.value = true
}

function openEdit(team) {
  editingTeam.value = team
  form.value = { name: team.name, description: team.description ?? '', leader_id: team.leader?.id ?? '' }
  formErrors.value = {}
  showCreateModal.value = true
}

function validate() {
  formErrors.value = {}
  if (!form.value.name.trim()) formErrors.value.name = t('common.nameRequired')
  return Object.keys(formErrors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = { ...form.value }
    if (!payload.leader_id) payload.leader_id = null
    if (editingTeam.value) {
      await store.update(editingTeam.value.id, payload)
      toast.showSuccess(t('teams.updateSuccess'))
    } else {
      await store.create(payload)
      toast.showSuccess(t('teams.createSuccess'))
    }
    showCreateModal.value = false
  } catch (e) {
    if (e?.errors) {
      formErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? t('teams.addMemberFailed'))
    }
  }
}

async function handleDelete(team) {
  const ok = await ui.confirm(t('teams.deleteTitle'), t('teams.deleteConfirmMsg', { name: team.name }))
  if (!ok) return
  try {
    await store.remove(team.id)
    toast.showSuccess(t('teams.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('teams.removeMemberFailed'))
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
          <h1 class="text-2xl font-bold text-white">{{ t('teams.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('teams.total') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="openCreate">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('teams.newTeam') }}
        </AppButton>
      </div>
    </div>

    <!-- Search -->
    <AppCard padding="sm">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('teams.searchPlaceholder')"
        @update:model-value="store.setFilter('search', $event)"
      />
    </AppCard>

    <!-- Teams grid -->
    <div v-if="store.loading.list" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard v-for="n in 6" :key="n" padding="sm">
        <div class="space-y-2">
          <AppSkeleton height="20px" width="60%" />
          <AppSkeleton height="14px" />
          <AppSkeleton height="14px" width="40%" />
        </div>
      </AppCard>
    </div>

    <div v-else-if="store.list.length === 0" class="text-center py-16">
      <Users class="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">{{ t('teams.noTeams') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard
        v-for="team in store.list"
        :key="team.id"
        padding="sm"
        class="cursor-pointer hover:shadow-md transition-shadow"
        @click="router.push({ name: 'teams.detail', params: { id: team.id } })"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <Users class="w-5 h-5 text-primary" />
            </div>
            <div class="min-w-0">
              <h3 class="font-medium text-gray-900 truncate">{{ team.name }}</h3>
              <p v-if="team.description" class="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {{ team.description }}
              </p>
              <div v-if="team.leader" class="flex items-center gap-1.5 mt-1.5">
                <Crown class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span class="text-xs text-gray-600 font-medium truncate">{{ team.leader.name }}</span>
              </div>
              <div class="flex items-center gap-3 mt-1.5">
                <span class="text-xs text-gray-500">
                  {{ team.members_count ?? 0 }} {{ t('teams.members') }}
                </span>
                <span v-if="team.leads_count !== undefined" class="text-xs text-gray-500">
                  {{ team.leads_count }} {{ t('teams.leads') }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex gap-1 shrink-0" @click.stop>
            <button
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="openEdit(team)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
              @click="handleDelete(team)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Pagination -->
    <div v-if="store.meta.last_page > 1">
      <AppPagination
        :current-page="store.meta.current_page"
        :last-page="store.meta.last_page"
        :total="store.meta.total"
        :from="from"
        :to="to"
        :per-page="store.meta.per_page"
        @page-change="store.setFilter('page', $event)"
      />
    </div>

    <!-- Create / Edit Modal -->
    <AppModal
      :open="showCreateModal"
      :title="editingTeam ? t('teams.editTeam') : t('teams.newTeam')"
      size="sm"
      @close="showCreateModal = false"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <AppInput
          v-model="form.name"
          :label="t('teams.name')"
          :placeholder="t('teams.namePlaceholder')"
          :error="formErrors.name"
          required
        />
        <AppSelect
          v-model="form.leader_id"
          :label="t('teams.leader')"
          :options="leaderOptions"
          :placeholder="t('teams.chooseLeader')"
        />
        <AppTextarea
          v-model="form.description"
          :label="t('teams.descriptionOptional')"
          :placeholder="t('teams.descriptionPlaceholder')"
          :rows="3"
        />
      </form>
      <template #footer>
        <AppButton variant="ghost" @click="showCreateModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.form" @click="submit">
          {{ editingTeam ? t('common.saveChanges') : t('teams.newTeam') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
