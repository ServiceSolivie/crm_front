<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import AppInput from '@/components/base/AppInput.vue'
import AppButton from '@/components/base/AppButton.vue'
import { Mail, Lock } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '', general: '' })
const loading = ref(false)

function validate() {
  errors.email = ''
  errors.password = ''
  errors.general = ''
  let ok = true
  if (!form.email) { errors.email = t('auth.email') + ' is required.'; ok = false }
  if (!form.password) { errors.password = t('auth.password') + ' is required.'; ok = false }
  return ok
}

async function submit() {
  if (!validate()) return
  loading.value = true
  try {
    await auth.login(form.email, form.password)
    const defaultLanding = auth.hasRole('gestion') ? '/gestion-dashboard' : '/dashboard'
    const redirect = route.query.redirect ?? defaultLanding
    router.push(redirect)
  } catch (err) {
    if (err.type === 'validation') {
      if (err.errors?.email) errors.email = err.errors.email[0]
      if (err.errors?.password) errors.password = err.errors.password[0]
    } else if (err.type === 'deactivated') {
      router.push({ name: 'deactivated' })
    } else {
      errors.general = 'Invalid email or password.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ t('auth.loginTitle') }}</h2>
    <p class="text-sm text-gray-500 mb-8">{{ t('auth.loginSubtitle') }}</p>

    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <!-- General error -->
      <div
        v-if="errors.general"
        class="px-4 py-3 rounded-xl bg-danger-bg border border-danger/20 text-sm text-danger"
      >
        {{ errors.general }}
      </div>

      <AppInput
        v-model="form.email"
        :label="t('auth.email')"
        type="email"
        placeholder="you@example.com"
        :error="errors.email"
        required
        autocomplete="email"
      >
        <template #prefix><Mail class="w-4 h-4" /></template>
      </AppInput>

      <AppInput
        v-model="form.password"
        :label="t('auth.password')"
        type="password"
        placeholder="••••••••"
        :error="errors.password"
        required
        autocomplete="current-password"
      >
        <template #prefix><Lock class="w-4 h-4" /></template>
      </AppInput>

      <AppButton
        type="submit"
        variant="primary"
        size="lg"
        :loading="loading"
        class="w-full mt-2"
      >
        {{ t('auth.login') }}
      </AppButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Don't have an account?
      <RouterLink to="/register" class="text-primary font-medium hover:underline">
        Register
      </RouterLink>
    </p>
  </div>
</template>
