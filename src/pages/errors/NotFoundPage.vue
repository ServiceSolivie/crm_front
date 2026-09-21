<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SearchX } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import AppErrorState from '@/components/base/AppErrorState.vue'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

// Signed-in users go back to their landing page, others to the login screen
function goHome() {
  if (!auth.isAuthenticated) return router.push({ name: 'login' })
  router.push(auth.hasRole('gestion') ? '/gestion-dashboard' : '/dashboard')
}
</script>

<template>
  <AppErrorState
    :icon="SearchX"
    tone="neutral"
    code="404"
    :title="t('errors.404')"
    :description="t('errors.404desc')"
    :action-label="auth.isAuthenticated ? t('errors.backHome') : t('auth.login')"
    @action="goHome"
  />
</template>
