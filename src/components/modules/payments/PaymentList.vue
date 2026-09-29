<script setup>
import { useI18n } from 'vue-i18n'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import PaymentRecordStatusBadge from './PaymentRecordStatusBadge.vue'
import { formatCurrency, formatDate } from '@/utils/formatters'

/**
 * Payments of a lead with their status (Reçu, En attente, Échoué, Annulé,
 * Remboursé). They come from Hyperswitch; the ones entered by hand in the
 * past stay visible. Read-only.
 */
const { t } = useI18n()

defineProps({
  payments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

// Money not (or no longer) received is shown struck through / greyed
const NOT_COUNTED = ['ECHOUE', 'ANNULE', 'REMBOURSE']

function methodLabel(payment) {
  if (payment.payment_method === 'AUTRE' && payment.custom_payment_method) {
    return payment.custom_payment_method
  }
  return t('paymentMethods.' + payment.payment_method, payment.payment_method)
}
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
          <!-- Bank refusal: Sogecommerce code (e.g. 51, 39) + message, for support -->
          <p v-if="payment.failure_reason" class="text-xs text-danger-text mt-0.5">
            <span v-if="payment.failure_code" class="font-mono">[{{ payment.failure_code }}]</span> {{ payment.failure_reason }}
          </p>
          <p v-if="payment.notes" class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ payment.notes }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
