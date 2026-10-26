<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhoneCall, PhoneIncoming, AlertTriangle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useRingoverPhone } from '@/composables/useRingoverPhone'
import PostCallModal from './PostCallModal.vue'

/**
 * Mounts the embedded Ringover phone for users allowed to call and linked to
 * Ringover, and shows the call-in-progress bar and the after-call popup.
 */
const { t } = useI18n()
const auth = useAuthStore()
const phone = useRingoverPhone()
const { state } = phone

const enabled = computed(() => auth.can('CALLS_MAKE') && !!auth.user?.ringover?.is_linked)

// Signed in to Ringover with a different account than the one linked to this CRM user:
// calls would be attributed to someone else.
const wrongAccount = computed(() =>
  state.signedInUserId !== null
  && state.linkedUserId !== null
  && state.signedInUserId !== state.linkedUserId,
)

const now = ref(Date.now())
let ticker = null

const elapsed = computed(() => {
  const a = state.active
  if (!a) return ''
  const since = a.answeredAt ?? a.startedAt
  const s = Math.max(0, Math.floor((now.value - since) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

function sync() {
  if (enabled.value) {
    phone.init({ linkedUserId: auth.user.ringover.user_id })
  } else {
    phone.destroy()
  }
}

onMounted(() => {
  sync()
  ticker = setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => clearInterval(ticker))

watch(enabled, sync)
</script>

<template>
  <!-- Wrong Ringover account -->
  <div
    v-if="enabled && wrongAccount"
    class="fixed top-3 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 px-4 py-2 rounded-xl bg-warning-bg text-warning text-sm shadow-card"
  >
    <AlertTriangle class="w-4 h-4 shrink-0" />
    {{ t('calls.phone.wrongAccount') }}
  </div>

  <!-- Call in progress -->
  <div
    v-if="state.active"
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 pl-3 pr-4 py-2 rounded-full bg-gray-900 text-white text-sm shadow-lg"
  >
    <span class="relative flex w-8 h-8 items-center justify-center rounded-full bg-success">
      <span v-if="state.active.phase !== 'answered'" class="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
      <PhoneIncoming v-if="state.active.direction === 'in'" class="relative w-4 h-4" />
      <PhoneCall v-else class="relative w-4 h-4" />
    </span>
    <div class="leading-tight">
      <RouterLink
        v-if="state.active.lead"
        :to="`/leads/${state.active.lead.id}`"
        class="font-medium hover:underline"
      >
        {{ state.active.lead.name }} <span class="text-gray-400 font-normal">· {{ state.active.lead.reference }}</span>
      </RouterLink>
      <p v-else class="font-medium">{{ state.active.number }}</p>
      <p class="text-xs text-gray-400">{{ t(`calls.phone.phase.${state.active.phase}`) }}</p>
    </div>
    <span class="font-mono tabular-nums text-gray-200">{{ elapsed }}</span>
    <button type="button" class="text-xs text-gray-300 hover:text-white underline cursor-pointer" @click="phone.showPhone()">
      {{ t('calls.phone.open') }}
    </button>
  </div>

  <PostCallModal :post-call="state.postCall" @close="phone.closePostCall()" />
</template>
