<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users.store'
import { useTeamsStore } from '@/stores/teams.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { ROLES } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'

const route = useRoute()
const router = useRouter()
const store = useUsersStore()
const teamsStore = useTeamsStore()
const toast = useToast()

const roleOptions = useEnumOptions(ROLES, 'roles')

const id = route.params.id
const form = reactive({ name: '', email: '', role: '', team_id: '' })
const errors = ref({})
const teamOptions = ref([{ value: '', label: 'No Team' }])

onMounted(async () => {
  try {
    await Promise.all([store.fetchOne(id), teamsStore.fetchList()])
    const user = store.current
    if (user) {
      form.name = user.name ?? ''
      form.email = user.email ?? ''
      form.role = user.role ?? 'agent'
      form.team_id = user.team?.id ?? ''
    }
    teamOptions.value = [
      { value: '', label: 'No Team' },
      ...teamsStore.list.map((t) => ({ value: t.id, label: t.name })),
    ]
  } catch {
    toast.showError('Failed to load user')
    router.replace({ name: 'users' })
  }
})

function validate() {
  errors.value = {}
  if (!form.name.trim()) errors.value.name = 'Name is required'
  if (!form.email.trim()) errors.value.email = 'Email is required'
  if (!form.role) errors.value.role = 'Role is required'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = { ...form }
    if (!payload.team_id) delete payload.team_id
    await store.update(id, payload)
    toast.showSuccess('User updated')
    router.push({ name: 'users.detail', params: { id } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? 'Failed to update user')
    }
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="router.back()">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        Back
      </AppButton>
      <h1 class="text-xl font-semibold text-gray-900">Edit User</h1>
    </div>

    <AppCard v-if="store.loading.detail">
      <div class="space-y-4">
        <AppSkeleton v-for="n in 4" :key="n" height="44px" />
      </div>
    </AppCard>

    <AppCard v-else>
      <form class="space-y-5" @submit.prevent="submit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            v-model="form.name"
            label="Full Name"
            :error="errors.name"
            required
            class="sm:col-span-2"
          />
          <AppInput
            v-model="form.email"
            label="Email"
            type="email"
            :error="errors.email"
            required
            class="sm:col-span-2"
          />
          <AppSelect
            v-model="form.role"
            label="Role"
            :options="roleOptions"
            :error="errors.role"
            required
          />
          <AppSelect
            v-model="form.team_id"
            label="Team"
            :options="teamOptions"
          />
        </div>

        <div class="flex items-center justify-end gap-3">
          <AppButton variant="ghost" type="button" @click="router.back()">Cancel</AppButton>
          <AppButton type="submit" :loading="store.loading.form">Save Changes</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>
