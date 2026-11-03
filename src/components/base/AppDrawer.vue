<script setup>
import { watch, onMounted, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

/**
 * A panel that slides in from the right over the page, for long forms the user
 * fills while still seeing the record they are working on. Same contract as
 * AppModal (open / title / icon / footer slot), plus a `toolbar` slot that
 * stays put above the scrolling body.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  // Small line under the title: which record this drawer is about
  subtitle: { type: String, default: '' },
  // One line explaining what the drawer does
  description: { type: String, default: '' },
  // Optional round icon left of the title (lucide component) and its colour
  icon: { type: Object, default: null },
  tone: { type: String, default: 'primary' }, // primary | success | warning | danger
  width: { type: String, default: 'max-w-[480px]' },
  closable: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])
const { t } = useI18n()
const titleId = useId()

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

// Lock body scroll while the drawer is open
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
      <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
        <!-- Backdrop: the page stays readable behind it -->
        <div class="absolute inset-0 bg-gray-900/45" @click="close" />

        <Transition
          enter-active-class="transition-transform duration-200 ease-out"
          enter-from-class="translate-x-full"
          leave-active-class="transition-transform duration-150 ease-in"
          leave-to-class="translate-x-full"
        >
          <div
            v-if="open"
            :class="[
              'relative h-full w-full bg-white border-l border-gray-200 flex flex-col',
              'shadow-[-24px_0_60px_rgba(17,24,39,0.18)]',
              width,
            ]"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? titleId : undefined"
          >
            <!-- Header -->
            <div v-if="title || closable" class="flex items-start gap-3 px-5 pt-5 pb-4 shrink-0">
              <span
                v-if="icon"
                :class="['w-8.5 h-8.5 shrink-0 rounded-lg flex items-center justify-center', TONES[tone]]"
              ><component :is="icon" class="w-[17px] h-[17px]" /></span>
              <div class="flex-1 min-w-0">
                <h2 :id="titleId" class="font-display text-[17px] font-semibold text-gray-900 leading-6">{{ title }}</h2>
                <p v-if="subtitle" class="text-[12.5px] text-gray-500 mt-0.5 truncate">{{ subtitle }}</p>
                <p v-if="description" class="text-[12.5px] leading-[18px] text-gray-600 mt-1.5">{{ description }}</p>
              </div>
              <button
                v-if="closable"
                type="button"
                :aria-label="t('common.close')"
                class="w-7.5 h-7.5 shrink-0 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center transition-colors focus:outline-none focus-ring"
                @click="close"
              >
                <X class="w-[15px] h-[15px]" />
              </button>
            </div>

            <!-- Toolbar: stays above the scrolling body -->
            <div v-if="$slots.toolbar" class="px-5 pb-4 border-b border-gray-100 shrink-0">
              <slot name="toolbar" />
            </div>

            <!-- Body -->
            <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="px-5 py-3.5 border-t border-gray-200 bg-gray-50/60 flex items-center justify-end gap-2 shrink-0"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
