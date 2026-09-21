<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Eye, EyeOff } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import AppInput from '@/components/base/AppInput.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '', general: '' })
const loading = ref(false)

// Local errors are stored as i18n keys (so they follow the language switch); server errors as text
const msg = (v) => (v && /^(auth|errors)\.[\w.]+$/.test(v) ? t(v) : v)
const showPassword = ref(false)

// Login lock after too many wrong passwords: count down, then allow again
const lockedFor = ref(0)
let lockTimer = null
function startLock(seconds) {
  lockedFor.value = Math.max(1, Math.round(seconds))
  clearInterval(lockTimer)
  lockTimer = setInterval(() => {
    lockedFor.value -= 1
    if (lockedFor.value <= 0) {
      clearInterval(lockTimer)
      errors.general = ''
    }
  }, 1000)
}
onBeforeUnmount(() => clearInterval(lockTimer))
const attemptsLeft = ref(null)
const generalText = computed(() =>
  lockedFor.value > 0 ? t('auth.errors.locked', { n: lockedFor.value }) : msg(errors.general),
)

function validate() {
  errors.email = ''
  errors.password = ''
  errors.general = ''
  let ok = true
  if (!form.email.trim()) { errors.email = 'auth.errors.emailRequired'; ok = false }
  if (!form.password) { errors.password = 'auth.errors.passwordRequired'; ok = false }
  return ok
}

async function submit() {
  if (!validate() || lockedFor.value > 0) return
  loading.value = true
  attemptsLeft.value = null
  try {
    await auth.login(form.email.trim(), form.password)
    const defaultLanding = auth.hasRole('gestion') ? '/gestion-dashboard' : '/dashboard'
    const redirect = route.query.redirect ?? defaultLanding
    router.push(redirect)
  } catch (err) {
    if (err.type === 'validation') {
      if (err.errors?.email) errors.email = err.errors.email[0]
      if (err.errors?.password) errors.password = err.errors.password[0]
      if (!err.errors?.email && !err.errors?.password) errors.general = 'auth.invalidCredentials'
    } else if (err.type === 'deactivated') {
      router.push({ name: 'deactivated' })
    } else if (err.type === 'rate_limited') {
      errors.general = 'auth.errors.locked'
      startLock(err.retryAfter ?? 60)
    } else if (err.type === 'network') {
      errors.general = 'errors.network'
    } else {
      errors.general = 'auth.invalidCredentials'
      const left = err.errors?.attempts_left
      if (typeof left === 'number') {
        attemptsLeft.value = left
        if (left === 0) startLock(60)
      }
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight text-gray-900">{{ t('auth.loginTitle') }}</h1>
      <p class="text-[13.5px] text-gray-600 mt-1">{{ t('auth.loginSubtitle') }}</p>
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div
        v-if="errors.general || lockedFor > 0"
        role="alert"
        class="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger-bg/60 border border-red-200 text-[13px] text-danger-text"
      >
        <AlertCircle class="w-4 h-4 shrink-0 mt-px" />
        <span>
          {{ generalText }}
          <span v-if="lockedFor === 0 && attemptsLeft !== null && attemptsLeft > 0" class="block text-[12.5px] mt-0.5 opacity-90">
            {{ t('auth.errors.attemptsLeft', { n: attemptsLeft }, attemptsLeft) }}
          </span>
        </span>
      </div>

      <AppInput
        v-model="form.email"
        :label="t('auth.email')"
        type="email"
        placeholder="prenom.nom@brandnova.fr"
        :error="msg(errors.email)"
        required
        autocomplete="email"
      />

      <AppInput
        v-model="form.password"
        :label="t('auth.password')"
        :type="showPassword ? 'text' : 'password'"
        :error="msg(errors.password)"
        placeholder="************"
        required
        autocomplete="current-password"
      >
        <template #suffix>
          <button
            type="button"
            class="p-1 -mr-1 rounded text-gray-500 hover:text-gray-900"
            :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-4 h-4" />
            <Eye v-else class="w-4 h-4" />
          </button>
        </template>
      </AppInput>

      <button
        type="submit"
        :disabled="loading || lockedFor > 0"
        class="h-11 mt-1 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60"
      >{{ loading ? t('common.loading') : lockedFor > 0 ? t('auth.lockedButton', { n: lockedFor }) : t('auth.login') }}</button>
    </form>

    <!-- No self sign-up: accounts are created by a super admin -->
    <p class="text-center text-[13px] text-gray-600">{{ t('auth.accountsByAdmin') }}</p>
  </div>
</template>
