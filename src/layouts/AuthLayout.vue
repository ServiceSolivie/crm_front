<script setup>
// Split screen for the login and error pages: brand panel + centred content
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'

const { t, locale } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen flex bg-page">
    <!-- Brand panel (desktop) -->
    <aside class="hidden lg:flex w-[520px] xl:w-[560px] shrink-0 flex-col justify-between bg-sidebar text-white px-14 py-12">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-[9px] bg-primary-soft flex items-center justify-center font-display font-bold text-[15px]">BN</div>
        <div>
          <p class="font-display font-semibold text-[17px] leading-tight">BrandNova</p>
          <p class="text-[12.5px] text-sidebar-icon leading-tight">CRM</p>
        </div>
      </div>
      <p class="font-display text-4xl leading-[44px] font-semibold tracking-tight max-w-md">
        {{ t('auth.tagline') }}
      </p>
      <p class="text-[12.5px] text-sidebar-icon">© {{ year }} BrandNova</p>
    </aside>

    <!-- Content -->
    <main class="relative flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div role="group" :aria-label="t('nav.language')" class="absolute top-6 right-6 sm:top-8 sm:right-10 flex gap-0.5 p-[3px] rounded-lg bg-gray-200">
        <button
          v-for="lang in ['fr', 'en']"
          :key="lang"
          type="button"
          :aria-pressed="locale === lang"
          :class="[
            'h-7 px-3 rounded-md text-[12.5px] font-semibold uppercase transition-colors',
            locale === lang ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(17,24,39,0.08)]' : 'text-gray-600 hover:text-gray-900',
          ]"
          @click="setLocale(lang)"
        >{{ lang }}</button>
      </div>

      <!-- Brand mark (mobile) -->
      <div class="lg:hidden flex items-center gap-2.5 mb-8">
        <div class="w-9 h-9 rounded-[9px] bg-sidebar text-white flex items-center justify-center font-display font-bold text-[15px]">BN</div>
        <p class="font-display font-semibold text-[17px] text-gray-900">BrandNova</p>
      </div>

      <div class="w-full max-w-[400px] bg-white border border-gray-200 rounded-2xl p-8">
        <slot />
      </div>
    </main>
  </div>
</template>
