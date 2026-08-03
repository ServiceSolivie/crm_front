<script setup>
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const variantClasses = {
  success: 'border-success bg-success-bg text-success',
  error: 'border-danger bg-danger-bg text-danger',
  warning: 'border-warning bg-warning-bg text-warning',
  info: 'border-info bg-info-bg text-info',
}

const iconWrapClasses = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-white',
  info: 'bg-info text-white',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
      aria-live="assertive"
    >
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-3">
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl border-2 shadow-2xl',
            'min-w-[340px] max-w-[460px] bg-white',
            variantClasses[toast.type],
          ]"
          role="alert"
        >
          <!-- Icon -->
          <div
            :class="['flex items-center justify-center w-10 h-10 rounded-full shrink-0', iconWrapClasses[toast.type]]"
          >
            <component :is="icons[toast.type]" class="w-5 h-5" />
          </div>

          <!-- Message -->
          <p class="flex-1 text-base font-semibold text-gray-900 leading-snug">
            {{ toast.message }}
          </p>

          <!-- Dismiss -->
          <button
            class="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            @click="ui.dismissToast(toast.id)"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
