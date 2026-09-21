<script setup>
import { watch, onMounted, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  // One line under the title explaining what the dialog does
  description: { type: String, default: '' },
  // Optional round icon left of the title (lucide component) and its colour
  icon: { type: Object, default: null },
  tone: { type: String, default: 'primary' }, // primary | success | warning | danger
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  closable: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])
const { t } = useI18n()
const titleId = useId()

const sizeClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const TONES = {
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
}

function close() {
  if (props.closable) emit('close')
}

function handleKey(e) {
  if (e.key === 'Escape' && props.open) close()
}

onMounted(() => document.addEventListener('keydown', handleKey))
onUnmounted(() => {
  document.removeEventListener('keydown', handleKey)
  document.body.style.overflow = ''
})

// Lock body scroll when modal is open
watch(
  () => props.open,
  (val) => {
    document.body.style.overflow = val ? 'hidden' : ''
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-gray-900/45" @click="close" />

        <!-- Panel -->
        <Transition name="modal-panel">
          <div
            v-if="open"
            :class="[
              'relative w-full bg-white rounded-2xl shadow-[0_24px_60px_rgba(17,24,39,0.3)] flex flex-col max-h-[90vh]',
              sizeClasses[size],
            ]"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? titleId : undefined"
          >
            <!-- Header -->
            <div v-if="title || closable" class="flex items-start gap-3 px-5.5 pt-5 pb-1 shrink-0">
              <span
                v-if="icon"
                :class="['w-9 h-9 shrink-0 rounded-full flex items-center justify-center', TONES[tone]]"
              ><component :is="icon" class="w-[18px] h-[18px]" /></span>
              <div class="flex-1 min-w-0">
                <h2 :id="titleId" class="font-display text-lg font-semibold text-gray-900 leading-7">{{ title }}</h2>
                <p v-if="description" class="text-[13px] leading-[19px] text-gray-600 mt-0.5">{{ description }}</p>
              </div>
              <button
                v-if="closable"
                type="button"
                :aria-label="t('common.close')"
                class="w-8 h-8 -mr-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none focus-ring"
                @click="close"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Body -->
            <div class="overflow-y-auto flex-1 px-5.5 py-4">
              <slot />
            </div>

            <!-- Footer slot -->
            <div
              v-if="$slots.footer"
              class="px-5.5 py-3.5 border-t border-gray-100 flex justify-end gap-2 shrink-0"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
