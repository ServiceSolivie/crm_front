<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Phone, Smartphone } from 'lucide-vue-next'
import { callsApi } from '@/api/calls'
import { useAuthStore } from '@/stores/auth.store'
import { useRingoverPhone } from '@/composables/useRingoverPhone'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  // Needs id, reference, first_name, last_name, is_callable.
  lead: { type: Object, required: true },
  // "icon": compact round button (lists) · "button": labelled button (lead page)
  variant: { type: String, default: 'icon' },
})

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const phone = useRingoverPhone()
const starting = ref(false)

const visible = computed(() => auth.can('CALLS_MAKE'))

// The embedded phone works with whatever Ringover account the agent signs in with
const disabledReason = computed(() => {
  if (!props.lead.is_callable) return t('calls.phone.notCallable')
  if (phone.state.active) return t('calls.phone.callInProgress')
  return ''
})

// Ringing the agent's mobile first needs their Ringover account linked in the CRM
const mobileDisabledReason = computed(() =>
  disabledReason.value || (auth.user?.ringover?.is_linked ? '' : t('calls.phone.notLinked')),
)

async function callViaMobile() {
  if (mobileDisabledReason.value || starting.value) return
  starting.value = true
  try {
    await callsApi.initiateVia(props.lead.id, 'mobile')
    toast.showSuccess(t('calls.phone.mobileRinging'))
  } catch (e) {
    toast.showError(e?.message ?? t('calls.phone.unavailable'))
  } finally {
    starting.value = false
  }
}

async function call() {
  if (disabledReason.value || starting.value) return
  starting.value = true
  try {
    if ((await phone.callLead(props.lead)) === 'sign_in') toast.showInfo(t('calls.phone.signIn'))
  } catch (e) {
    const key = { phone_unavailable: 'calls.phone.unavailable', call_in_progress: 'calls.phone.callInProgress' }[e?.message]
    toast.showError(key ? t(key) : (e?.message ?? t('calls.phone.unavailable')))
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <template v-if="visible">
    <button
      v-if="variant === 'icon'"
      type="button"
      :title="disabledReason || t('calls.phone.call')"
      :aria-label="t('calls.phone.call')"
      :disabled="!!disabledReason || starting"
      class="inline-flex items-center justify-center w-8 h-8 rounded-full text-success bg-success-bg hover:brightness-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      @click.stop="call"
    >
      <Phone class="w-4 h-4" />
    </button>
    <div v-else class="inline-flex rounded-lg overflow-hidden">
      <button
        type="button"
        :title="disabledReason"
        :disabled="!!disabledReason || starting"
        class="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-success hover:brightness-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        @click.stop="call"
      >
        <Phone class="w-4 h-4" />
        {{ starting ? t('calls.phone.starting') : t('calls.phone.call') }}
      </button>
      <button
        type="button"
        :title="mobileDisabledReason || t('calls.phone.callViaMobile')"
        :aria-label="t('calls.phone.callViaMobile')"
        :disabled="!!mobileDisabledReason || starting"
        class="inline-flex items-center justify-center w-9 h-9 border-l border-white/30 text-white bg-success hover:brightness-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        @click.stop="callViaMobile"
      >
        <Smartphone class="w-4 h-4" />
      </button>
    </div>
  </template>
</template>
