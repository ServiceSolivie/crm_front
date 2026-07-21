<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, UserPlus, Trash2, Users, Crown } from 'lucide-vue-next'
import { useTeamsStore } from '@/stores/teams.store'
import { useUsersStore } from '@/stores/users.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSelect from '@/components/base/AppSelect.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = useTeamsStore()
const usersStore = useUsersStore()
const ui = useUiStore()
const toast = useToast()

const id = route.params.id
const showAddMember = ref(false)
const selectedUserId = ref('')
const agentOptions = ref([])

onMounted(async () => {
  try {
    await Promise.all([store.fetchOne(id), store.fetchMembers(id), store.fetchStats(id)])
    await usersStore.fetchList({ per_page: 100 })
    agentOptions.value = usersStore.list.map((u) => ({ value: u.id, label: u.name }))
  } catch {
    router.replace({ name: 'teams' })
  }
})

async function onAddMember() {
  if (!selectedUserId.value) return
  try {
    await store.addMember(id, selectedUserId.value)
    toast.showSuccess(t('teams.memberAdded'))
    showAddMember.value = false
    selectedUserId.value = ''
  } catch (e) {
    toast.showError(e?.message ?? t('teams.addMemberFailed'))
  }
}

async function onRemoveMember(member) {
  const ok = await ui.confirm(t('teams.removeMemberTitle'), t('teams.removeMemberConfirm', { name: member.name }))
  if (!ok) return
  try {
    await store.removeMember(id, member.id)
    toast.showSuccess(t('teams.memberRemoved'))
  } catch (e) {
    toast.showError(e?.message ?? t('teams.removeMemberFailed'))
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="router.back()">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        {{ t('common.back') }}
      </AppButton>
    </div>

    <!-- Loading -->
    <AppCard v-if="store.loading.detail">
      <div class="space-y-3">
        <AppSkeleton height="24px" width="40%" />
        <AppSkeleton height="16px" width="60%" />
      </div>
    </AppCard>

    <!-- Team header -->
    <AppCard v-else-if="store.current">
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center shrink-0">
            <Users class="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-900">{{ store.current.name }}</h1>
            <p v-if="store.current.description" class="text-sm text-gray-500 mt-0.5">
              {{ store.current.description }}
            </p>
            <div v-if="store.current.leader" class="flex items-center gap-1.5 mt-1">
              <Crown class="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span class="text-sm text-gray-600 font-medium">{{ store.current.leader.name }}</span>
            </div>
            <p class="text-sm text-gray-400 mt-1">{{ store.members.length }} {{ t('teams.members') }}</p>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Stats row -->
    <div v-if="store.stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-gray-900">{{ store.stats.leads.total  ?? 0 }}</p>
        <p class="text-xs text-gray-500">{{ t('dashboard.totalLeads') }}</p>
      </AppCard>
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-success">{{ store.stats.leads.by_status.VALIDE ?? 0 }}</p>
        <p class="text-xs text-gray-500">{{ t('teams.won') }}</p>
      </AppCard>
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-primary">
          {{ store.stats.leads.conversion_rate ? `${store.stats.leads.conversion_rate.toFixed(1)}%` : '—' }}
        </p>
        <p class="text-xs text-gray-500">{{ t('teams.conversion') }}</p>
      </AppCard>
      <AppCard padding="sm" class="text-center">
        <p class="text-2xl font-bold text-info">{{ store.stats.appointments.total ?? 0 }}</p>
        <p class="text-xs text-gray-500">{{ t('dashboard.appointments') }}</p>
      </AppCard>
    </div>

    <!-- Members card -->
    <AppCard padding="none">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="font-medium text-gray-900">{{ t('teams.membersTitle') }}</h2>
        <AppButton size="sm" @click="showAddMember = true">
          <template #icon><UserPlus class="w-4 h-4" /></template>
          {{ t('teams.addMember') }}
        </AppButton>
      </div>

      <div v-if="store.loading.members" class="p-5 space-y-3">
        <div v-for="n in 4" :key="n" class="flex items-center gap-3">
          <AppSkeleton width="40px" height="40px" class="rounded-full shrink-0" />
          <div class="flex-1 space-y-1.5">
            <AppSkeleton height="14px" width="40%" />
            <AppSkeleton height="12px" width="25%" />
          </div>
        </div>
      </div>

      <div v-else-if="store.members.length === 0" class="text-center py-12">
        <Users class="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p class="text-sm text-gray-400">{{ t('teams.noMembers') }}</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="member in store.members"
          :key="member.id"
          class="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <AppAvatar :name="member.name" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 text-sm truncate">{{ member.name }}</p>
            <p class="text-xs text-gray-400">{{ member.email }}</p>
          </div>
          <span
            v-if="store.current?.leader?.id === member.id"
            class="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"
          >
            <Crown class="w-3 h-3" />
            {{ t('teams.leader') }}
          </span>
          <span v-else class="text-xs text-gray-500 capitalize px-2 py-0.5 rounded-full bg-gray-100">
            {{ member.role }}
          </span>
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
            @click="onRemoveMember(member)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </AppCard>

    <!-- Add Member Modal -->
    <AppModal :open="showAddMember" :title="t('teams.addMember')" size="sm" @close="showAddMember = false">
      <AppSelect
        v-model="selectedUserId"
        :label="t('teams.selectUser')"
        :options="agentOptions"
        :placeholder="t('teams.chooseUser')"
      />
      <template #footer>
        <AppButton variant="ghost" @click="showAddMember = false">{{ t('common.cancel') }}</AppButton>
        <AppButton
          :disabled="!selectedUserId"
          :loading="store.loading.members"
          @click="onAddMember"
        >
          {{ t('teams.add') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
