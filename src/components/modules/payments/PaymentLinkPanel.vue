<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy, ExternalLink, Link2, Pencil, RefreshCw } from 'lucide-vue-next'
import { paymentsApi } from '@/api/payments'
import { getEcho } from '@/plugins/echo'
import { useUiStore } from '@/stores/ui.store'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import { firstErrorMessage } from '@/utils/errors'
import { formatCurrency, formatDateTime } from '@/utils/formatters'

/**
 * Online payment (Hyperswitch). "Send a payment link" opens a modal asking
 * the amount and the client's e-mail (prefilled with the lead's; asked when
 * the lead has none). The link is e-mailed to the client and shown here,
 * with Copy / Open / Refresh / Cancel. The result (paid, failed…) arrives
 * live when the CRM syncs it with Hyperswitch.
 */
const { t } = useI18n()

const props = defineProps({
  leadId: { type: [Number, String], required: true },
  leadEmail: { type: String, default: '' },
  // Amount left to collect; null when the lead has no contract total yet
  remaining: { type: [Number, String], default: null },
  canSend: { type: Boolean, default: false },
  // May change the contract total (to ask an additional payment when nothing is left)
  canEditTotal: { type: Boolean, default: false },
})

const emit = defineEmits(['changed', 'edit-total'])

const ui = useUiStore()
const sessions = ref([])
const loading = ref(false)
const busy = ref(false)
const showModal = ref(false)
const form = ref({ amount: '', email: '' })
const errors = ref({})

const hasTotal = computed(() => props.remaining !== null && props.remaining !== undefined)
// Pending = blocks a new link: waiting for the client, or to check with Hyperswitch
const PENDING = ['OUVERTE', 'A_VERIFIER']
const openSession = computed(() => sessions.value.find((s) => s.status === 'OUVERTE'))
const toVerify = computed(() => sessions.value.find((s) => s.status === 'A_VERIFIER'))
const history = computed(() => sessions.value.filter((s) => !PENDING.includes(s.status)).slice(0, 3))
const nothingLeft = computed(() => hasTotal.value && Number(props.remaining) <= 0)
const canCreate = computed(() => props.canSend && !openSession.value && !toVerify.value && !nothingLeft.value)
const emailIsKnown = computed(() => !!props.leadEmail)

async function load() {
  loading.value = true
  try {
    sessions.value = (await paymentsApi.sessions.list(props.leadId)).data ?? []
  } catch {
    sessions.value = []
  } finally {
    loading.value = false
  }
}

function openModal() {
  errors.value = {}
  form.value = {
    // Balance left to collect when known, otherwise the agent types the amount
    amount: hasTotal.value ? String(Number(props.remaining).toFixed(2)) : '',
    email: props.leadEmail ?? '',
  }
  showModal.value = true
}

function validate() {
  const e = {}
  const amount = Number(String(form.value.amount).replace(',', '.'))
  if (!form.value.amount || !(amount > 0)) e.amount = t('paymentLink.errors.amountRequired')
  else if (hasTotal.value && amount > Number(props.remaining)) {
    e.amount = t('paymentLink.errors.amountTooHigh', { max: formatCurrency(props.remaining) })
  }
  if (!emailIsKnown.value || form.value.email !== props.leadEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email ?? '')) e.email = t('paymentLink.errors.emailRequired')
  }
  errors.value = e
  return Object.keys(e).length === 0
}

async function send() {
  if (!validate()) return
  busy.value = true
  try {
    const res = await paymentsApi.sessions.create(props.leadId, {
      amount: Number(String(form.value.amount).replace(',', '.')),
      email: form.value.email || null,
    })
    // Hyperswitch gave no clear answer: the request is kept "to check"
    if (res.data?.status === 'A_VERIFIER') ui.showWarning(res.message)
    else ui.showSuccess(res.message)
    showModal.value = false
    await load()
    emit('changed')
  } catch (e) {
    if (e?.errors) {
      errors.value = {
        amount: e.errors.amount?.[0] ?? '',
        email: e.errors.email?.[0] ?? '',
      }
    }
    ui.showError(firstErrorMessage(e, t('paymentLink.errors.create')))
  } finally {
    busy.value = false
  }
}

async function verify(session) {
  busy.value = true
  try {
    const res = await paymentsApi.sessions.verify(props.leadId, session.id)
    const status = res.data?.status
    if (status === 'PAYEE' || (status === 'OUVERTE' && session.status === 'A_VERIFIER')) ui.showSuccess(res.message)
    else if (status === 'ECHOUEE') ui.showWarning(res.message)
    else ui.showInfo(res.message)
    await load()
    emit('changed')
  } catch (e) {
    ui.showError(firstErrorMessage(e, t('paymentLink.errors.verify')))
  } finally {
    busy.value = false
  }
}

async function cancel(session) {
  const ok = await ui.confirm(
    t('paymentLink.cancelTitle'),
    t('paymentLink.cancelConfirm', { reference: session.reference }),
    { confirmLabel: t('paymentLink.cancel') },
  )
  if (!ok) return
  busy.value = true
  try {
    await paymentsApi.sessions.cancel(props.leadId, session.id)
    ui.showSuccess(t('paymentLink.cancelled'))
    await load()
    emit('changed')
  } catch (e) {
    ui.showError(firstErrorMessage(e, t('paymentLink.errors.cancel')))
  } finally {
    busy.value = false
  }
}

async function copy(url) {
  try {
    await navigator.clipboard.writeText(url)
    ui.showSuccess(t('paymentLink.copied'))
  } catch {
    ui.showError(t('paymentLink.errors.copy'))
  }
}

/* Live: the CRM broadcasts on "leads.{id}" when a payment request changes
   (paid, failed, expired…) — reload without the agent doing anything. */
let channelName = null
function subscribe(leadId) {
  const echo = getEcho()
  if (!echo || !leadId) return
  channelName = `leads.${leadId}`
  echo.private(channelName).listen('.payment-session.updated', async () => {
    await load()
    emit('changed')
  })
}
function unsubscribe() {
  if (channelName) getEcho()?.leave(channelName)
  channelName = null
}

watch(() => props.leadId, (id) => {
  unsubscribe()
  subscribe(id)
  load()
})
onMounted(() => {
  load()
  subscribe(props.leadId)
})
onBeforeUnmount(unsubscribe)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="loading && !sessions.length" class="flex items-center gap-2 text-[13px] text-gray-500">
      <AppSpinner :size="14" /> {{ t('paymentLink.loading') }}
    </div>

    <!-- Hyperswitch gave no clear answer: check before anything else -->
    <div v-else-if="toVerify" class="rounded-lg border border-warning/40 bg-warning-bg px-3 py-2.5 flex flex-col gap-1.5">
      <p class="text-[13px] text-gray-900">
        <span class="font-medium">{{ t('paymentLink.toVerify') }}</span>
        · <span class="font-mono">{{ formatCurrency(toVerify.amount) }}</span>
        · <span class="font-mono text-xs">{{ toVerify.reference }}</span>
      </p>
      <p class="text-xs text-gray-700">{{ t('paymentLink.toVerifyHint') }}</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-if="canSend"
          type="button"
          :disabled="busy"
          class="h-7 inline-flex items-center gap-1 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          @click="verify(toVerify)"
        ><AppSpinner v-if="busy" :size="12" />{{ t('paymentLink.verify') }}</button>
        <button
          v-if="canSend"
          type="button"
          :disabled="busy"
          class="h-7 px-2 rounded-md border border-danger/30 text-xs text-danger-text hover:bg-danger-bg disabled:opacity-50"
          @click="cancel(toVerify)"
        >{{ t('paymentLink.cancel') }}</button>
      </div>
    </div>

    <!-- Link waiting for the client -->
    <div v-else-if="openSession" class="rounded-lg border border-info/30 bg-info-bg px-3 py-2.5 flex flex-col gap-1.5">
      <p class="text-[13px] text-gray-900">
        <span class="font-medium">{{ t('paymentLink.waiting') }}</span>
        · <span class="font-mono">{{ formatCurrency(openSession.amount) }}</span>
        · <span class="font-mono text-xs">{{ openSession.reference }}</span>
      </p>
      <p class="text-xs text-gray-600">
        <template v-if="openSession.sent_at">{{ t('paymentLink.sentTo', { email: openSession.client_email, date: formatDateTime(openSession.sent_at) }) }}</template>
        <template v-else>{{ t('paymentLink.notEmailed', { email: openSession.client_email }) }}</template>
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="h-7 inline-flex items-center gap-1 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900 hover:bg-gray-50"
          @click="copy(openSession.payment_url)"
        ><Copy class="w-3.5 h-3.5" />{{ t('paymentLink.copy') }}</button>
        <a
          :href="openSession.payment_url"
          target="_blank"
          rel="noopener noreferrer"
          class="h-7 inline-flex items-center gap-1 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900 hover:bg-gray-50"
        ><ExternalLink class="w-3.5 h-3.5" />{{ t('paymentLink.open') }}</a>
        <button
          v-if="canSend"
          type="button"
          :disabled="busy"
          :title="t('paymentLink.refreshHint')"
          class="h-7 inline-flex items-center gap-1 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          @click="verify(openSession)"
        ><AppSpinner v-if="busy" :size="12" /><RefreshCw v-else class="w-3.5 h-3.5" />{{ t('paymentLink.refresh') }}</button>
        <button
          v-if="canSend"
          type="button"
          :disabled="busy"
          class="h-7 px-2 rounded-md border border-danger/30 text-xs text-danger-text hover:bg-danger-bg disabled:opacity-50"
          @click="cancel(openSession)"
        >{{ t('paymentLink.cancel') }}</button>
      </div>
    </div>

    <button
      v-else-if="canCreate"
      type="button"
      class="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
      @click="openModal"
    ><Link2 class="w-3.5 h-3.5" />{{ t('paymentLink.send') }}</button>

    <!-- Contract fully collected: a new payment needs a higher total first -->
    <div v-else-if="nothingLeft && (canSend || canEditTotal)" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 flex flex-col gap-1.5">
      <p class="text-[13px] font-medium text-gray-900">{{ t('paymentLink.nothingLeft') }}</p>
      <p class="text-xs text-gray-600">{{ t('paymentLink.nothingLeftHint') }}</p>
      <button
        v-if="canEditTotal"
        type="button"
        class="self-start h-7 inline-flex items-center gap-1 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900 hover:bg-gray-50"
        @click="emit('edit-total')"
      ><Pencil class="w-3.5 h-3.5" />{{ t('contractTotal.edit') }}</button>
    </div>

    <!-- Previous links -->
    <ul v-if="history.length" class="flex flex-col">
      <li v-for="s in history" :key="s.id" class="text-xs text-gray-500">
        <span class="font-mono">{{ s.reference }}</span> · {{ formatCurrency(s.amount) }} ·
        <span
          :class="s.status === 'PAYEE' ? 'text-success-text font-medium' : s.status === 'ECHOUEE' ? 'text-danger-text font-medium' : ''"
        >{{ t('paymentLink.statuses.' + s.status, s.status_label) }}</span>
        · {{ formatDateTime(s.created_at) }}
      </li>
    </ul>

    <AppModal :open="showModal" :title="t('paymentLink.modalTitle')" size="sm" @close="showModal = false">
      <form class="flex flex-col gap-3" @submit.prevent="send">
        <p class="text-[13px] text-gray-600">
          {{ hasTotal ? t('paymentLink.modalHintBalance', { remaining: formatCurrency(remaining) }) : t('paymentLink.modalHintTotal') }}
        </p>
        <AppInput
          v-model="form.amount"
          :label="t('paymentLink.amount')"
          type="text"
          placeholder="0,00"
          :error="errors.amount"
          required
        />
        <AppInput
          v-model="form.email"
          :label="t('paymentLink.email')"
          type="email"
          autocomplete="email"
          :hint="emailIsKnown ? t('paymentLink.emailFromLead') : t('paymentLink.emailMissing')"
          :error="errors.email"
          required
        />
        <button type="submit" class="hidden" tabindex="-1" aria-hidden="true" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="showModal = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="busy" @click="send">{{ t('paymentLink.confirm') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
