<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users.store'
import { useTeamsStore } from '@/stores/teams.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import { ROLES } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'

const router = useRouter()
const store = useUsersStore()
const teamsStore = useTeamsStore()
const toast = useToast()
const { t } = useI18n()

const roleOptions = useEnumOptions(ROLES, 'roles')

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'agent',
  team_id: '',
})
const errors = ref({})
const teamOptions = ref([])

onMounted(async () => {
  await teamsStore.fetchList()
  teamOptions.value = [
    { value: '', label: t('users.noTeam') },
    ...teamsStore.list.map((team) => ({ value: team.id, label: team.name })),
  ]
})

function validate() {
  errors.value = {}
  if (!form.name.trim()) errors.value.name = t('users.nameRequired')
  if (!form.email.trim()) errors.value.email = t('users.emailRequired')
  if (!form.password) errors.value.password = t('users.passwordRequired')
  if (form.password && form.password.length < 8) errors.value.password = t('users.passwordMin')
  if (form.password !== form.password_confirmation)
    errors.value.password_confirmation = t('users.passwordMismatch')
  if (!form.role) errors.value.role = t('users.roleRequired')
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = { ...form }
    if (!payload.team_id) delete payload.team_id
    const user = await store.create(payload)
    toast.showSuccess(t('users.createSuccess'))
    router.push({ name: 'users.detail', params: { id: user.id } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? t('users.createFailed'))
    }
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="router.back()">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        {{ t('common.back') }}
      </AppButton>
      <div>
        <h1 class="text-xl font-semibold text-gray-900">{{ t('users.newUser') }}</h1>
        <p class="text-sm text-gray-500">{{ t('users.createDesc') }}</p>
      </div>
    </div>

    <AppCard>
      <form class="space-y-5" @submit.prevent="submit">
        <div>
          <h2 class="text-sm font-semibold text-gray-700 mb-3">{{ t('users.accountDetails') }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput
              v-model="form.name"
              :label="t('users.name')"
              :placeholder="t('users.namePlaceholder')"
              :error="errors.name"
              required
              class="sm:col-span-2"
            />
            <AppInput
              v-model="form.email"
              :label="t('users.email')"
              type="email"
              :placeholder="t('users.emailPlaceholder')"
              :error="errors.email"
              required
              class="sm:col-span-2"
            />
            <AppInput
              v-model="form.password"
              :label="t('users.password')"
              type="password"
              :error="errors.password"
              required
            />
            <AppInput
              v-model="form.password_confirmation"
              :label="t('users.confirmPassword')"
              type="password"
              :error="errors.password_confirmation"
              required
            />
          </div>
        </div>

        <div class="border-t border-gray-100" />

        <div>
          <h2 class="text-sm font-semibold text-gray-700 mb-3">{{ t('users.roleAndTeam') }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppSelect
              v-model="form.role"
              :label="t('users.role')"
              :options="roleOptions"
              :error="errors.role"
              required
            />
            <AppSelect
              v-model="form.team_id"
              :label="t('users.team')"
              :options="teamOptions"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3">
          <AppButton variant="ghost" type="button" @click="router.back()">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" :loading="store.loading.form">{{ t('users.createUser') }}</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>
