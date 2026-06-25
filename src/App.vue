<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ToastContainer from '@/components/base/ToastContainer.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const routerReady = ref(false)
router.isReady().then(() => { routerReady.value = true })

const isBooting = computed(() => {
  if (!auth.token) return false
  return !routerReady.value
})

const layout = computed(() => {
  const l = route.meta?.layout
  if (l === 'dashboard') return DashboardLayout
  return AuthLayout
})
</script>

<template>
  <div v-if="isBooting" class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
  </div>

  <template v-else>
    <component :is="layout">
      <RouterView />
    </component>
    <ToastContainer />
    <ConfirmDialog />
  </template>
</template>
