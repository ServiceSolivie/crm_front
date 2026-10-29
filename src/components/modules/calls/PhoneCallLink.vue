<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Phone, Copy, Check } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { dialNumber, formatPhone } from '@/utils/phone'
import CallButton from './CallButton.vue'

/**
 * A lead's phone number that calls when clicked: through the embedded
 * Ringover phone for users who make calls from the CRM, otherwise through
 * the computer's phone app (tel:). A copy button shows on hover.
 */
const props = defineProps({
  // Needs phone, plus what CallButton needs (id, reference, names, is_callable)
  lead: { type: Object, required: true },
})

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()

const display = computed(() => formatPhone(props.lead.phone))
const viaRingover = computed(() => auth.can('CALLS_MAKE'))
const fullName = computed(() => [props.lead.first_name, props.lead.last_name].filter(Boolean).join(' ') || props.lead.reference)

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.lead.phone)
  } catch {
    // The clipboard API needs https or localhost: fall back to the old way
    const field = document.createElement('textarea')
    field.value = props.lead.phone
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    if (!ok) {
      toast.showError(t('leadDetail.phoneCopyFailed'))
      return
    }
  }
  copied.value = true
  toast.showSuccess(t('leadDetail.phoneCopied'))
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <span class="group/phone inline-flex items-center gap-0.5 min-w-0 max-w-full">
    <CallButton v-if="viaRingover" :lead="lead" variant="number" :label="display" />
    <a
      v-else
      :href="`tel:${dialNumber(lead.phone)}`"
      class="phone-link group/call"
      :title="t('leads.callName', { name: fullName })"
      :aria-label="t('leads.callName', { name: fullName })"
      @click.stop
    >
      <Phone class="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover/call:text-success-text" />
      <span class="truncate">{{ display }}</span>
    </a>
    <button
      type="button"
      class="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 opacity-0 group-hover/phone:opacity-100 focus-visible:opacity-100 transition-opacity"
      :title="t('leadDetail.copyPhone')"
      :aria-label="t('leadDetail.copyPhone')"
      @click.stop="copy"
    >
      <component :is="copied ? Check : Copy" class="w-3.5 h-3.5" />
    </button>
  </span>
</template>
