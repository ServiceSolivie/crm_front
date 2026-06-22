<script setup>
import { computed } from 'vue'
import AppCard from '@/components/base/AppCard.vue'
import AppProgressBar from '@/components/base/AppProgressBar.vue'
import PaymentStatusBadge from './PaymentStatusBadge.vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  expectedRevenue: { type: [String, Number], default: null },
  totalReceived: { type: [String, Number], default: 0 },
  remainingAmount: { type: [String, Number], default: 0 },
  paymentStatus: { type: String, default: null },
})

const paidPercent = computed(() => {
  if (!props.expectedRevenue || Number(props.expectedRevenue) === 0) return 0
  return Math.min(100, (Number(props.totalReceived) / Number(props.expectedRevenue)) * 100)
})

const progressColor = computed(() => {
  if (paidPercent.value >= 100) return 'bg-success'
  if (paidPercent.value > 0) return 'bg-warning'
  return 'bg-neutral'
})
</script>

<template>
  <AppCard v-if="expectedRevenue !== null" class="!bg-gradient-to-br !from-indigo-50/70 !to-white !border-indigo-100">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-gray-700">Chiffre d'affaires</h3>
      <PaymentStatusBadge v-if="paymentStatus" :status="paymentStatus" dot />
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div>
        <p class="text-xs text-gray-400 mb-0.5">Montant attendu</p>
        <p class="text-lg font-bold text-gray-900">{{ formatCurrency(expectedRevenue) }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400 mb-0.5">Reçu</p>
        <p class="text-lg font-bold text-success">{{ formatCurrency(totalReceived) }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400 mb-0.5">Restant</p>
        <p class="text-lg font-bold text-warning">{{ formatCurrency(remainingAmount) }}</p>
      </div>
    </div>

    <AppProgressBar :value="paidPercent" :color="progressColor" height="h-2" show-label />
  </AppCard>
</template>
