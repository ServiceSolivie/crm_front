<script setup>
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { authApi } from '@/api/auth'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import { formatDate } from '@/utils/formatters'
import { firstErrorMessage } from '@/utils/errors'
import AppPageHeader from '@/components/base/AppPageHeader.vue'

const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const profileForm = reactive({
  name: auth.user?.name ?? '',
  email: auth.user?.email ?? '',
})

const passwordForm = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})

const profileErrors = ref({})
const passwordErrors = ref({})
const savingProfile = ref(false)
const savingPassword = ref(false)

const roleLabel = computed(() => {
  const r = auth.user?.roles?.[0] ?? auth.user?.role ?? ''
  return r ? t('roles.' + r, r) : '—'
})

function validateProfile() {
  profileErrors.value = {}
  if (!profileForm.name.trim()) profileErrors.value.name = 'Name is required'
  if (!profileForm.email.trim()) profileErrors.value.email = 'Email is required'
  return Object.keys(profileErrors.value).length === 0
}

async function saveProfile() {
  if (!validateProfile()) return
  savingProfile.value = true
  try {
    await authApi.updateProfile(profileForm)
    await auth.boot()
    toast.showSuccess(t('profile.updateSuccess'))
  } catch (e) {
    if (e?.errors) {
      profileErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, 'Failed to update profile'))
  } finally {
    savingProfile.value = false
  }
}

function validatePassword() {
  passwordErrors.value = {}
  if (!passwordForm.current_password) passwordErrors.value.current_password = 'Current password is required'
  if (!passwordForm.password) passwordErrors.value.password = 'New password is required'
  if (passwordForm.password && passwordForm.password.length < 8)
    passwordErrors.value.password = 'Password must be at least 8 characters'
  if (passwordForm.password !== passwordForm.password_confirmation)
    passwordErrors.value.password_confirmation = 'Passwords do not match'
  return Object.keys(passwordErrors.value).length === 0
}

async function savePassword() {
  if (!validatePassword()) return
  savingPassword.value = true
  try {
    await authApi.changePassword(passwordForm)
    toast.showSuccess(t('profile.passwordSuccess'))
    Object.assign(passwordForm, { current_password: '', password: '', password_confirmation: '' })
  } catch (e) {
    if (e?.errors) {
      passwordErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, 'Failed to change password'))
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <AppPageHeader :title="t('profile.title')">
      <template #meta>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ t('profile.subtitle') }}</p>
      </template>
    </AppPageHeader>

    <!-- Profile overview -->
    <AppCard>
      <div class="flex items-start gap-4">
        <AppAvatar :name="auth.user?.name ?? '?'" size="lg" />
        <div>
          <h2 class="text-base font-semibold text-gray-900">{{ auth.user?.name }}</h2>
          <p class="text-sm text-gray-500">{{ auth.user?.email }}</p>
          <div class="flex items-center gap-2 mt-2">
            <AppBadge
              :variant="(auth.user?.roles?.[0] ?? auth.user?.role) === 'super_admin' ? 'danger' : (auth.user?.roles?.[0] ?? auth.user?.role) === 'manager' ? 'warning' : 'info'"
              :label="roleLabel"
            />
            <span v-if="auth.user?.team" class="text-xs text-gray-500">
              {{ auth.user.team.name }}
            </span>
            <span class="text-xs text-gray-400">
              Member since {{ formatDate(auth.user?.created_at) }}
            </span>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Edit profile -->
    <AppCard>
      <h2 class="text-sm font-semibold text-gray-700 mb-4">{{ t('profile.editProfile') }}</h2>
      <form class="space-y-4" @submit.prevent="saveProfile">
        <AppInput
          v-model="profileForm.name"
          :label="t('users.name')"
          :error="profileErrors.name"
          required
        />
        <AppInput
          v-model="profileForm.email"
          :label="t('users.email')"
          type="email"
          :error="profileErrors.email"
          required
        />
        <div class="flex justify-end">
          <AppButton type="submit" :loading="savingProfile">{{ t('profile.saveChanges') }}</AppButton>
        </div>
      </form>
    </AppCard>

    <!-- Change password -->
    <AppCard>
      <h2 class="text-sm font-semibold text-gray-700 mb-4">{{ t('profile.changePassword') }}</h2>
      <form class="space-y-4" @submit.prevent="savePassword">
        <AppInput
          v-model="passwordForm.current_password"
          :label="t('profile.currentPassword')"
          type="password"
          :error="passwordErrors.current_password"
          required
          autocomplete="current-password"
        />
        <AppInput
          v-model="passwordForm.password"
          :label="t('profile.newPassword')"
          type="password"
          :error="passwordErrors.password"
          required
          autocomplete="new-password"
        />
        <AppInput
          v-model="passwordForm.password_confirmation"
          :label="t('profile.confirmPassword')"
          type="password"
          :error="passwordErrors.password_confirmation"
          required
          autocomplete="new-password"
        />
        <div class="flex justify-end">
          <AppButton type="submit" :loading="savingPassword">{{ t('profile.changePassword') }}</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>
