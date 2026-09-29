<script setup>
// Pages for the CRM's clients (not the agents), e.g. the payment result:
// centred content, language switch, no CRM navigation or branding.
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'

const { t, locale } = useI18n()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-page">
    <header class="flex justify-end px-4 sm:px-8 pt-5">
      <div role="group" :aria-label="t('nav.language')" class="flex gap-0.5 p-[3px] rounded-lg bg-gray-200">
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
    </header>
    <main class="flex-1 flex items-center justify-center px-4 py-10">
      <slot />
    </main>
  </div>
</template>
