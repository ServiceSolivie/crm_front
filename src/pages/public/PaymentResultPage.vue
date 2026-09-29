<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CheckCircle2, XCircle, Clock, Link2Off } from 'lucide-vue-next'
import { publicPaymentsApi } from '@/api/publicPayments'
import AppSpinner from '@/components/base/AppSpinner.vue'
import { formatCurrency } from '@/utils/formatters'

/**
 * Where the client lands after paying (Hyperswitch return_url). The query
 * params Hyperswitch appends are ignored: the status always comes from the
 * CRM, which asks Hyperswitch itself. While the payment is being
 * confirmed, the page reads the saved status every few seconds (the CRM
 * decides when to really ask Hyperswitch), for about two minutes.
 */
const { t } = useI18n()
const route = useRoute()

const POLL_MS = 3000
const MAX_WAIT_MS = 2 * 60 * 1000

const payment = ref(null)
const state = ref('loading') // loading | pending | paid | failed | cancelled | expired | link_expired | not_found | error | slow
let timer = null
const startedAt = Date.now()

const icon = computed(() => ({
  paid: CheckCircle2,
  failed: XCircle,
  cancelled: Link2Off,
  expired: Link2Off,
  link_expired: Link2Off,
  not_found: Link2Off,
  error: XCircle,
  slow: Clock,
}[state.value]))

const tone = computed(() => ({
  paid: 'bg-success-bg text-success-text',
  failed: 'bg-danger-bg text-danger-text',
  error: 'bg-danger-bg text-danger-text',
  slow: 'bg-info-bg text-info-text',
}[state.value] ?? 'bg-gray-100 text-gray-600'))

function apply(data) {
  payment.value = data
  if (data.status !== 'pending') {
    state.value = data.status
    stop()
  } else if (Date.now() - startedAt >= MAX_WAIT_MS) {
    // Still not confirmed: the CRM keeps following it in the background
    state.value = 'slow'
    stop()
  } else {
    state.value = 'pending'
  }
}

function onError(e) {
  const status = e?.response?.status
  state.value = status === 410 ? 'link_expired' : status === 404 ? 'not_found' : 'error'
  stop()
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

async function poll() {
  try {
    apply(await publicPaymentsApi.status(route.params.token))
  } catch (e) {
    // A network hiccup while waiting: keep trying until the time limit
    if (e?.response) onError(e)
  }
}

// The token in the URL is the key of this page: not indexed, never sent as referrer
const addedMeta = []
function addMeta(name, content) {
  const el = document.createElement('meta')
  el.name = name
  el.content = content
  document.head.appendChild(el)
  addedMeta.push(el)
}

onMounted(async () => {
  addMeta('robots', 'noindex, nofollow')
  addMeta('referrer', 'no-referrer')
  try {
    apply(await publicPaymentsApi.markReturned(route.params.token))
    if (state.value === 'pending') timer = setInterval(poll, POLL_MS)
  } catch (e) {
    onError(e)
  }
})

onBeforeUnmount(() => {
  stop()
  addedMeta.forEach((el) => el.remove())
})
</script>

<template>
  <div class="w-full max-w-[440px] bg-white border border-gray-200 rounded-2xl px-6 py-8 sm:px-8 flex flex-col items-center text-center gap-4">
    <p v-if="payment?.company" class="text-[13px] font-medium text-gray-500">{{ payment.company }}</p>

    <template v-if="state === 'loading' || state === 'pending'">
      <AppSpinner :size="36" />
      <h1 class="font-display text-xl font-semibold text-gray-900">{{ t('paymentResult.pending.title') }}</h1>
      <p class="text-[14px] text-gray-600">{{ t('paymentResult.pending.text') }}</p>
    </template>

    <template v-else>
      <span :class="['w-14 h-14 rounded-full flex items-center justify-center', tone]">
        <component :is="icon" class="w-7 h-7" />
      </span>
      <h1 class="font-display text-xl font-semibold text-gray-900">{{ t(`paymentResult.${state}.title`) }}</h1>
      <p class="text-[14px] text-gray-600">{{ t(`paymentResult.${state}.text`) }}</p>
    </template>

    <dl v-if="payment && !['not_found', 'link_expired'].includes(state)" class="w-full mt-2 border-t border-gray-100 pt-4 grid grid-cols-2 gap-y-2 text-[13px]">
      <dt class="text-left text-gray-500">{{ t('paymentResult.amount') }}</dt>
      <dd class="text-right font-mono font-medium text-gray-900">{{ formatCurrency(payment.amount, payment.currency) }}</dd>
      <dt class="text-left text-gray-500">{{ t('paymentResult.reference') }}</dt>
      <dd class="text-right font-mono text-gray-900">{{ payment.reference }}</dd>
    </dl>

    <p class="text-[12px] text-gray-400 mt-2">{{ t('paymentResult.canClose') }}</p>
  </div>
</template>
