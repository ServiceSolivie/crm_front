<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUsersStore } from '@/stores/users.store'
import { useTeamsStore } from '@/stores/teams.store'
import { useToast } from '@/composables/useToast'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { ROLES } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { firstErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const store = useUsersStore()
const teamsStore = useTeamsStore()
const toast = useToast()
const { t } = useI18n()

const roleOptions = useEnumOptions(ROLES, 'roles')

const id = route.params.id
const form = reactive({ name: '', email: '', role: '', team_id: '' })
const errors = ref({})
const loaded = ref(false)
const teamOptions = computed(() => [
  { value: '', label: t('users.noTeam') },
  ...teamsStore.list.map((team) => ({ value: team.id, label: team.name })),
])

onMounted(async () => {
  try {
    await Promise.all([store.fetchOne(id), teamsStore.fetchList()])
    const user = store.current
    if (user) {
      form.name = user.name ?? ''
      form.email = user.email ?? ''
      form.role = user.role ?? user.roles?.[0] ?? 'agent'
      form.team_id = user.team?.id ?? ''
    }
    loaded.value = true
  } catch {
    toast.showError(t('users.loadFailed'))
    router.replace({ name: 'users' })
  }
})

function validate() {
  errors.value = {}
  if (!form.name.trim()) errors.value.name = t('users.nameRequired')
  if (!form.email.trim()) errors.value.email = t('users.emailRequired')
  if (!form.role) errors.value.role = t('users.roleRequired')
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = { ...form }
    if (!payload.team_id) delete payload.team_id
    await store.update(id, payload)
    toast.showSuccess(t('users.updateSuccess'))
    router.push({ name: 'users.detail', params: { id } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('users.updateFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-2xl mx-auto">
    <AppPageHeader
      :title="t('users.editUser')"
      :subtitle="form.name"
      :breadcrumb="[{ label: t('users.title'), to: '/users' }, { label: form.name || '…', to: `/users/${id}` }, { label: t('common.edit') }]"
    >
      <template #actions>
        <AppButton variant="secondary" @click="router.back()">{{ t('common.cancel') }}</AppButton>
        <AppButton type="submit" form="user-form" :disabled="!loaded" :loading="store.loading.form">{{ t('common.saveChanges') }}</AppButton>
      </template>
    </AppPageHeader>

    <section class="bg-white border border-gray-200 rounded-xl px-5 pt-4.5 pb-5">
      <div v-if="!loaded" class="space-y-4"><AppSkeleton v-for="n in 4" :key="n" height="40px" /></div>
      <form v-else id="user-form" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
        <div class="flex flex-col gap-3.5">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('users.accountDetails') }}</h2>
          <AppInput v-model="form.name" :label="t('users.name')" :error="errors.name" required />
          <AppInput v-model="form.email" :label="t('users.email')" type="email" :error="errors.email" required />
        </div>
        <div class="flex flex-col gap-3.5 pt-4 border-t border-gray-100">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('users.roleAndTeam') }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
            <AppSelect v-model="form.role" :label="t('users.role')" :options="roleOptions" :error="errors.role" required />
            <AppSelect v-model="form.team_id" :label="t('users.team')" :options="teamOptions" :error="errors.team_id" />
          </div>
        </div>
      </form>
    </section>
  </div>
</template>
