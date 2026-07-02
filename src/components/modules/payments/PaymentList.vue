<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2, CreditCard, Banknote } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { formatCurrency, formatDate } from '@/utils/formatters'

const { t } = useI18n()

defineProps({
  payments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['delete'])

const auth = useAuthStore()
const ui = useUiStore()
const deletingId = ref(null)

function methodLabel(payment) {
  if (payment.payment_method === 'AUTRE' && payment.custom_payment_method) {
    return payment.custom_payment_method
  }
  return t('paymentMethods.' + payment.payment_method, payment.payment_method)
}

async function onDelete(payment) {
  const ok = await ui.confirm(
    'Supprimer le paiement',
    `Voulez-vous vraiment supprimer ce paiement de ${formatCurrency(payment.amount)} ?`,
  )
  if (!ok) return
  deletingId.value = payment.id
  emit('delete', payment)
}

defineExpose({ clearDeleting: () => (deletingId.value = null) })
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-3">
      <AppSkeleton v-for="n in 3" :key="n" height="64px" class="rounded-xl" />
    </div>

    <div v-else-if="payments.length === 0" class="text-center py-10">
      <Banknote class="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-500">Aucun paiement enregistré</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="payment in payments"
        :key="payment.id"
        class="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
      >
        <div class="w-9 h-9 rounded-xl bg-success-bg flex items-center justify-center shrink-0">
          <CreditCard class="w-4 h-4 text-success" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-semibold text-gray-900">
              {{ formatCurrency(payment.amount) }}
            </span>
            <span class="text-xs text-gray-400">•</span>
            <span class="text-xs text-gray-500">{{ formatDate(payment.payment_date) }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {{ methodLabel(payment) }}
            </span>
            <span v-if="payment.reference_number" class="text-xs text-gray-400">
              Réf: {{ payment.reference_number }}
            </span>
          </div>
          <p v-if="payment.notes" class="text-xs text-gray-400 mt-1 line-clamp-2">{{ payment.notes }}</p>
          <div v-if="payment.created_by" class="flex items-center gap-1.5 mt-1.5">
            <AppAvatar :name="payment.created_by.name" size="xs" />
            <span class="text-xs text-gray-400">{{ payment.created_by.name }}</span>
          </div>
        </div>
        <div class="shrink-0">
          <button
            v-if="auth.can('PAYMENTS_DELETE')"
            title="Supprimer"
            :disabled="deletingId === payment.id"
            class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
            @click="onDelete(payment)"
          >
            <AppSpinner v-if="deletingId === payment.id" :size="14" />
            <Trash2 v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
