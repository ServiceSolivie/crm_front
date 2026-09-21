<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { UserX } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import AppErrorState from '@/components/base/AppErrorState.vue'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

function goToLogin() {
  auth.clearSession()
  router.push({ name: 'login' })
}
</script>

<template>
  <AppErrorState
    :icon="UserX"
    tone="warning"
    :title="t('errors.deactivatedTitle')"
    :description="t('errors.deactivatedDesc')"
    :action-label="t('errors.backToLogin')"
    @action="goToLogin"
  />
</template>
