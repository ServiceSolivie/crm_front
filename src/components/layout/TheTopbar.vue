<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Menu } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import AppAvatar from '@/components/base/AppAvatar.vue'
import TheNotificationBell from './TheNotificationBell.vue'
import { setLocale } from '@/i18n'

const route = useRoute()
const ui = useUiStore()
const auth = useAuthStore()
const { locale } = useI18n()

const pageTitle = computed(() => route.meta?.title ?? 'CRM')
</script>

<template>
  <header class="relative z-40 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
    <!-- Mobile hamburger -->
    <button
      class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      @click="ui.toggleSidebar()"
    >
      <Menu class="w-5 h-5" />
    </button>

    <!-- Page title -->
    <h1 class="text-lg font-semibold text-gray-900 truncate flex-1">
      {{ pageTitle }}
    </h1>

    <!-- Right zone -->
    <div class="flex items-center gap-3 shrink-0">
      <!-- Language switcher -->
      <div class="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
        <button
          :class="[
            'px-2.5 py-1 text-xs font-semibold transition-colors',
            locale === 'fr' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50 bg-white',
          ]"
          @click="setLocale('fr')"
        >FR</button>
        <button
          :class="[
            'px-2.5 py-1 text-xs font-semibold border-l border-gray-200 transition-colors',
            locale === 'en' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50 bg-white',
          ]"
          @click="setLocale('en')"
        >EN</button>
      </div>

      <!-- Notification bell -->
      <TheNotificationBell />

      <!-- User info -->
      <div class="flex items-center gap-2">
        <AppAvatar :name="auth.user?.name" size="sm" />
        <div class="hidden sm:block text-right">
          <p class="text-sm font-medium text-gray-900 leading-none">{{ auth.user?.name }}</p>
          <p class="text-xs text-gray-500 mt-0.5 capitalize">{{ auth.user?.roles?.[0] ?? '' }}</p>
        </div>
      </div>
    </div>
  </header>
</template>
