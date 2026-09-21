<script setup>
import { useI18n } from 'vue-i18n'
import { Check, X, AlertTriangle, Info } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const { t } = useI18n()

const icons = { success: Check, error: X, warning: AlertTriangle, info: Info }

// Small coloured disc on a dark card — same look for every type
const discClasses = {
  success: 'bg-success',
  error: 'bg-urgent',
  warning: 'bg-warning',
  info: 'bg-primary-soft',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 left-5 sm:left-auto z-[100] pointer-events-none" aria-live="polite">
      <TransitionGroup name="toast" tag="div" class="flex flex-col items-end gap-2.5">
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          :role="toast.type === 'error' ? 'alert' : 'status'"
          class="pointer-events-auto w-full sm:w-auto sm:min-w-[320px] max-w-[440px] flex items-center gap-3 pl-3.5 pr-2 py-2.5 rounded-[10px] bg-sidebar text-white shadow-[0_10px_30px_rgba(17,24,39,0.25)]"
        >
          <span :class="['w-5.5 h-5.5 shrink-0 rounded-full flex items-center justify-center text-white', discClasses[toast.type]]">
            <component :is="icons[toast.type]" class="w-3 h-3" stroke-width="3" />
          </span>
          <p class="flex-1 text-[13.5px] leading-5">{{ toast.message }}</p>
          <button
            type="button"
            :aria-label="t('common.close')"
            class="shrink-0 w-7 h-7 rounded-md text-sidebar-icon hover:text-white hover:bg-white/10 flex items-center justify-center"
            @click="ui.dismissToast(toast.id)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
