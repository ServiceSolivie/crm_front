<script setup>
import { useI18n } from 'vue-i18n'
import { Menu } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui.store'
import TheSidebar from './TheSidebar.vue'

const ui = useUiStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-page">
    <!-- Mobile backdrop -->
    <Transition name="modal">
      <div
        v-if="ui.sidebarOpen"
        class="fixed inset-0 z-20 bg-black/40 lg:hidden"
        @click="ui.toggleSidebar()"
      />
    </Transition>

    <TheSidebar />

    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- Mobile-only bar: the sidebar is a drawer below lg -->
      <header class="lg:hidden h-14 shrink-0 flex items-center gap-3 px-4 bg-sidebar text-white">
        <button
          class="p-2 -ml-2 rounded-lg text-sidebar-icon hover:bg-white/10 hover:text-white"
          :aria-label="t('nav.openMenu')"
          @click="ui.toggleSidebar()"
        >
          <Menu class="w-5 h-5" />
        </button>
        <span class="font-display font-semibold">BrandNova</span>
      </header>

      <main class="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
        <slot />
      </main>
    </div>
  </div>
</template>
