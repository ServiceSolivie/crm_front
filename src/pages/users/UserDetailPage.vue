<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronRight, Edit2, Trash2, Mail, Users } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import { formatDate } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = useUsersStore()
const ui = useUiStore()
const toast = useToast()

const id = route.params.id

onMounted(async () => {
  try {
    await store.fetchOne(id)
  } catch {
    router.replace({ name: 'users' })
  }
})

async function toggleActive() {
  try {
    await store.toggleStatus(id, !store.current.is_active)
    toast.showSuccess(store.current.is_active ? t('users.activateSuccess') : t('users.deactivateSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? t('users.statusUpdateFailed'))
  }
}

async function handleDelete() {
  const ok = await ui.confirm(t('users.deleteTitle'), t('users.deleteConfirm'), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await store.remove(id)
    toast.showSuccess(t('users.deleteSuccess'))
    router.replace({ name: 'users' })
  } catch (e) {
    toast.showError(e?.message ?? t('users.deleteFailed'))
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto flex flex-col gap-4">
    <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-[13px] text-gray-500">
      <RouterLink to="/users" class="text-gray-600 hover:text-gray-900">{{ t('users.title') }}</RouterLink>
      <ChevronRight class="w-3.5 h-3.5" />
      <span class="text-gray-900 truncate">{{ store.current?.name ?? '…' }}</span>
    </nav>

    <AppCard v-if="store.loading.detail">
      <div class="flex items-start gap-4">
        <AppSkeleton width="64px" height="64px" class="rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <AppSkeleton height="20px" width="40%" />
          <AppSkeleton height="14px" width="60%" />
          <AppSkeleton height="14px" width="30%" />
        </div>
      </div>
    </AppCard>

    <AppCard v-else-if="store.current">
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div class="flex items-start gap-4">
          <AppAvatar :name="store.current.name" size="lg" />
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="font-display text-2xl font-semibold tracking-tight text-gray-900">{{ store.current.name }}</h1>
              <AppBadge
                :variant="!store.current.is_active ? 'neutral' : 'success'"
                :label="store.current.is_active ? t('common.active') : t('common.inactive')"
                dot
              />
            </div>
            <div class="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
              <Mail class="w-4 h-4" />
              <span>{{ store.current.email }}</span>
            </div>
            <div class="flex items-center gap-2 mt-1.5">
              <AppBadge
                :variant="store.current.roles?.[0] === 'super_admin' ? 'danger' : store.current.roles?.[0] === 'manager' ? 'warning' : 'info'"
                :label="store.current.roles?.[0] ? t('roles.' + store.current.roles[0], store.current.roles[0]) : '—'"
              />
              <span v-if="store.current.team" class="flex items-center gap-1 text-xs text-gray-500">
                <Users class="w-3.5 h-3.5" />
                {{ store.current.team.name }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <AppButton
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'users.edit', params: { id } })"
          >
            <template #icon><Edit2 class="w-4 h-4" /></template>
            {{ t('common.edit') }}
          </AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            class="!text-danger"
            @click="handleDelete"
          >
            <template #icon><Trash2 class="w-4 h-4" /></template>
          </AppButton>
        </div>
      </div>

      <!-- Toggle active -->
      <div class="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">{{ t('users.accountStatus') }}</p>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ store.current.is_active ? t('users.activeDesc') : t('users.inactiveDesc') }}
          </p>
        </div>
        <AppToggle
          :model-value="store.current.is_active"
          :disabled="store.loading.action"
          @update:model-value="toggleActive"
        />
      </div>

      <!-- Meta info -->
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('users.memberSince') }}</p>
          <p class="text-sm text-gray-900">{{ formatDate(store.current.created_at) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{{ t('users.lastUpdated') }}</p>
          <p class="text-sm text-gray-900">{{ formatDate(store.current.updated_at) }}</p>
        </div>
      </div>
    </AppCard>
  </div>
</template>
