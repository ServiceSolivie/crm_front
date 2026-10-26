<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Phone, PhoneCall, PhoneIncoming, AlertTriangle, X, ChevronRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useRingoverPhone } from '@/composables/useRingoverPhone'
import PostCallModal from './PostCallModal.vue'

/**
 * The embedded Ringover phone, in a panel that slides in from the right over
 * the full height of the screen, with the call in progress (lead, number,
 * timer) above it. Also shows the after-call popup.
 */
const CONTAINER_ID = 'ringover-phone-container'

const { t } = useI18n()
const auth = useAuthStore()
const phone = useRingoverPhone()
const { state } = phone

// Anyone allowed to call gets the phone: they sign in to Ringover inside it.
const enabled = computed(() => auth.can('CALLS_MAKE'))

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

const pendingName = computed(() =>
  [state.pendingLead?.first_name, state.pendingLead?.last_name].filter(Boolean).join(' '),
)

function sync() {
  if (enabled.value) {
    phone.init({ linkedUserId: auth.user?.ringover?.user_id, containerId: CONTAINER_ID })
  } else {
    phone.destroy()
  }
}

function onKeydown(e) {
  if (e.key === 'Escape' && state.open) phone.hidePhone()
}

onMounted(() => {
  sync()
  ticker = setInterval(() => (now.value = Date.now()), 1000)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearInterval(ticker)
  window.removeEventListener('keydown', onKeydown)
})

// After the DOM update, so the panel's container exists when the phone is created
watch(enabled, sync, { flush: 'post' })
</script>

<template>
  <template v-if="enabled">
    <!-- Wrong Ringover account -->
    <div
      v-if="wrongAccount"
      class="fixed top-3 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 px-4 py-2 rounded-xl bg-warning-bg text-warning text-sm shadow-card"
    >
      <AlertTriangle class="w-4 h-4 shrink-0" />
      {{ t('calls.phone.wrongAccount') }}
    </div>

    <!-- Tab on the right edge: opens the panel -->
    <button
      v-show="!state.open"
      type="button"
      :aria-label="t('calls.phone.open')"
      :title="t('calls.phone.open')"
      :class="[
        'fixed right-0 top-1/2 -translate-y-1/2 z-[9000] flex flex-col items-center gap-2 py-3 px-2 rounded-l-xl text-white shadow-lg cursor-pointer transition-colors',
        state.active ? 'bg-success hover:brightness-95' : 'bg-gray-900 hover:bg-gray-800',
      ]"
      @click="phone.showPhone()"
    >
      <span class="relative flex">
        <span v-if="state.active && state.active.phase !== 'answered'" class="absolute inset-0 rounded-full bg-white animate-ping opacity-60" />
        <Phone class="relative w-5 h-5" />
      </span>
      <span v-if="state.active" class="font-mono text-[11px] tabular-nums [writing-mode:vertical-rl] rotate-180">{{ elapsed }}</span>
    </button>

    <!-- Slide-over panel (kept mounted so the Ringover session survives closing it) -->
    <aside
      :aria-hidden="!state.open"
      :class="[
        'fixed top-0 right-0 z-[9000] h-screen w-[400px] max-w-full flex flex-col bg-white border-l border-gray-200 shadow-2xl',
        'transition-transform duration-300 ease-out',
        state.open ? 'translate-x-0' : 'translate-x-full',
      ]"
    >
      <header class="shrink-0 flex items-center justify-between gap-2 px-4 h-12 border-b border-gray-100">
        <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('calls.phone.panelTitle') }}</h2>
        <div class="flex items-center gap-1">
          <button
            type="button"
            :aria-label="t('calls.phone.hide')"
            :title="t('calls.phone.hide')"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            @click="phone.hidePhone()"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
          <button
            type="button"
            :aria-label="t('common.close')"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            @click="phone.hidePhone()"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </header>

      <!-- Call in progress: who, which number, how long -->
      <div v-if="state.active" class="shrink-0 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white">
        <span class="relative flex w-9 h-9 shrink-0 items-center justify-center rounded-full bg-success">
          <span v-if="state.active.phase !== 'answered'" class="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
          <PhoneIncoming v-if="state.active.direction === 'in'" class="relative w-4 h-4" />
          <PhoneCall v-else class="relative w-4 h-4" />
        </span>
        <div class="min-w-0 flex-1 leading-tight">
          <RouterLink
            v-if="state.active.lead"
            :to="`/leads/${state.active.lead.id}`"
            class="block font-medium truncate hover:underline"
          >
            {{ state.active.lead.name }}
            <span class="text-gray-400 font-normal">· {{ state.active.lead.reference }}</span>
          </RouterLink>
          <p class="font-mono text-[13px] text-gray-200 truncate">{{ state.active.number }}</p>
          <p class="text-xs text-gray-400">{{ t(`calls.phone.phase.${state.active.phase}`) }}</p>
        </div>
        <span class="font-mono tabular-nums text-sm text-gray-200">{{ elapsed }}</span>
      </div>

      <!-- Asked to call before signing in -->
      <div v-else-if="state.pendingLead" class="shrink-0 px-4 py-3 bg-primary-light/50 border-b border-primary-light">
        <p class="text-xs text-gray-600">{{ t('calls.phone.pending') }}</p>
        <p class="text-sm font-medium text-gray-900 truncate">
          {{ pendingName || state.pendingLead.reference }}
          <span class="font-mono font-normal text-gray-600">· {{ state.pendingLead.phone }}</span>
        </p>
      </div>

      <!-- The Ringover phone fills the rest of the panel -->
      <div :id="CONTAINER_ID" class="relative flex-1 min-h-0" />
    </aside>
  </template>

  <PostCallModal :post-call="state.postCall" @close="phone.closePostCall()" />
</template>
