<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import PaymentRecordStatusBadge from './PaymentRecordStatusBadge.vue'
import { PAYMENT_RECORD_STATUS } from '@/utils/enums'
import { formatCurrency, formatDate } from '@/utils/formatters'

/**
 * Payments of a lead with their status (Reçu, En attente, Échoué, Annulé,
 * Remboursé). Pending payments can be marked received / failed / cancelled;
 * received ones refunded (needs PAYMENTS_DELETE, like the backend).
 */
const { t } = useI18n()

defineProps({
  payments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['delete', 'status'])

const auth = useAuthStore()
const ui = useUiStore()
const deletingId = ref(null)
const busyId = ref(null)

// Money not (or no longer) received is shown struck through / greyed
const NOT_COUNTED = ['ECHOUE', 'ANNULE', 'REMBOURSE']

function methodLabel(payment) {
  if (payment.payment_method === 'AUTRE' && payment.custom_payment_method) {
    return payment.custom_payment_method
  }
  return t('paymentMethods.' + payment.payment_method, payment.payment_method)
}

function actionsFor(payment) {
  if (!auth.can('PAYMENTS_CREATE')) return []
  const next = PAYMENT_RECORD_STATUS[payment.status ?? 'REUSSI']?.next ?? []
  return next.filter((s) => s !== 'REMBOURSE' || auth.can('PAYMENTS_DELETE'))
}

async function onStatus(payment, status) {
  // Failures and refunds are final: ask before applying them
  if (status === 'ECHOUE' || status === 'REMBOURSE') {
    const ok = await ui.confirm(
      t('paymentList.actions.' + status),
      t('paymentList.confirm.' + status, { amount: formatCurrency(payment.amount) }),
      { confirmLabel: t('paymentList.actions.' + status) },
    )
    if (!ok) return
  }
  busyId.value = payment.id
  emit('status', payment, status)
}

async function onDelete(payment) {
  const ok = await ui.confirm(
    t('paymentList.deleteTitle'),
    t('paymentList.deleteConfirm', { amount: formatCurrency(payment.amount) }),
    { confirmLabel: t('common.delete') },
  )
  if (!ok) return
  deletingId.value = payment.id
  emit('delete', payment)
}

defineExpose({
  clearDeleting: () => (deletingId.value = null),
  clearBusy: () => (busyId.value = null),
})
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-2">
      <AppSkeleton v-for="n in 2" :key="n" height="44px" />
    </div>

    <p v-else-if="payments.length === 0" class="text-[13px] text-gray-500 py-1">{{ t('paymentList.empty') }}</p>

    <ul v-else class="flex flex-col">
      <li
        v-for="payment in payments"
        :key="payment.id"
        class="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-b-0"
      >
        <div class="flex-1 min-w-0">
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              :class="[
                'font-mono text-[13px] font-medium',
                NOT_COUNTED.includes(payment.status) ? 'text-gray-400 line-through'
                : payment.status === 'EN_ATTENTE' ? 'text-info-text' : 'text-success-text',
              ]"
            >{{ formatCurrency(payment.amount) }}</span>
            <span class="font-mono text-xs text-gray-500">{{ formatDate(payment.payment_date) }}</span>
            <PaymentRecordStatusBadge v-if="payment.status" :status="payment.status" />
          </p>
          <p class="text-xs text-gray-600 truncate">
            {{ methodLabel(payment) }}
            <template v-if="payment.reference_number"> · {{ t('paymentList.ref') }} <span class="font-mono">{{ payment.reference_number }}</span></template>
            <template v-if="payment.created_by"> · {{ payment.created_by.name }}</template>
            <template v-if="payment.source === 'HYPERSWITCH'"> · {{ t('paymentList.sources.HYPERSWITCH') }}</template>
          </p>
          <p v-if="payment.failure_reason" class="text-xs text-danger-text mt-0.5">{{ payment.failure_reason }}</p>
          <p v-if="payment.notes" class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ payment.notes }}</p>
          <div v-if="actionsFor(payment).length" class="flex flex-wrap gap-1.5 mt-1.5">
            <button
              v-for="s in actionsFor(payment)"
              :key="s"
              type="button"
              :disabled="busyId === payment.id"
              :class="[
                'h-6.5 px-2 rounded-md border text-xs disabled:opacity-50',
                s === 'REUSSI' ? 'border-success/40 text-success-text hover:bg-success-bg'
                : s === 'ANNULE' ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-danger/30 text-danger-text hover:bg-danger-bg',
              ]"
              @click="onStatus(payment, s)"
            >{{ t('paymentList.actions.' + s) }}</button>
          </div>
        </div>
        <button
          v-if="auth.can('PAYMENTS_DELETE')"
          type="button"
          :aria-label="t('common.delete')"
          :disabled="deletingId === payment.id"
          class="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg disabled:opacity-50"
          @click="onDelete(payment)"
        >
          <AppSpinner v-if="deletingId === payment.id" :size="14" />
          <Trash2 v-else class="w-3.5 h-3.5" />
        </button>
      </li>
    </ul>
  </div>
</template>
