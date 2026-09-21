<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, HelpCircle } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const { t } = useI18n()

const state = computed(() => ui.confirmState)
const isDanger = computed(() => (state.value?.tone ?? 'danger') === 'danger')
const cancelRef = ref(null)

// Focus "Annuler" first so Enter never confirms a destructive action by accident
watch(state, async (s) => {
  if (!s) return
  await nextTick()
  cancelRef.value?.focus()
})

function onKey(e) {
  if (e.key === 'Escape' && state.value) ui.resolveConfirm(false)
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="state" class="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/45" @click="ui.resolveConfirm(false)" />

        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          class="relative w-full max-w-[400px] bg-white rounded-2xl shadow-[0_24px_60px_rgba(17,24,39,0.3)]"
        >
          <div class="flex items-start gap-3 px-5.5 pt-5 pb-4.5">
            <span
              :class="[
                'w-9 h-9 shrink-0 rounded-full flex items-center justify-center',
                isDanger ? 'bg-danger-bg text-danger-text' : 'bg-primary-light text-primary',
              ]"
            >
              <AlertTriangle v-if="isDanger" class="w-[18px] h-[18px]" />
              <HelpCircle v-else class="w-[18px] h-[18px]" />
            </span>
            <div class="min-w-0">
              <h2 id="confirm-title" class="font-display text-lg font-semibold text-gray-900 leading-7">{{ state.title }}</h2>
              <p id="confirm-message" class="text-[13px] leading-[19px] text-gray-600 mt-0.5">{{ state.message }}</p>
            </div>
          </div>

          <div class="px-5.5 py-3.5 border-t border-gray-100 flex justify-end gap-2">
            <button
              ref="cancelRef"
              type="button"
              class="h-9 px-3.5 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50 focus:outline-none focus-ring"
              @click="ui.resolveConfirm(false)"
            >{{ state.cancelLabel ?? t('common.cancel') }}</button>
            <button
              type="button"
              :class="[
                'h-9 px-4 rounded-lg text-[13px] font-medium text-white focus:outline-none focus-ring',
                isDanger ? 'bg-urgent hover:bg-red-700' : 'bg-primary hover:bg-primary-hover',
              ]"
              @click="ui.resolveConfirm(true)"
            >{{ state.confirmLabel ?? t('common.confirm') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
