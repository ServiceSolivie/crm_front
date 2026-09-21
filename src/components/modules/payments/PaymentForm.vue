<script setup>
import { useI18n } from 'vue-i18n'
import { reactive, ref, computed, watch } from 'vue'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import { PAYMENT_METHOD } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatCurrency } from '@/utils/formatters'

const { t } = useI18n()

const paymentMethodOptions = useEnumOptions(PAYMENT_METHOD, 'paymentMethods')

const props = defineProps({
  open: { type: Boolean, default: false },
  remainingAmount: { type: [String, Number], default: 0 },
  // First payment: the contract total is not known yet and is asked here
  needsTotal: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'submit'])

// By hand a payment is either received or still pending (transfer announced…)
const statusOptions = computed(() => [
  { value: 'REUSSI', label: t('statuses.paymentRecord.REUSSI') },
  { value: 'EN_ATTENTE', label: t('statuses.paymentRecord.EN_ATTENTE') },
])

const form = reactive({
  expected_revenue: '',
  status: 'REUSSI',
  amount: '',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: '',
  custom_payment_method: '',
  reference_number: '',
  notes: '',
})

const errors = ref({})

const showCustomMethod = computed(() => form.payment_method === 'AUTRE')

watch(() => props.open, (val) => {
  if (val) {
    Object.assign(form, {
      expected_revenue: '',
      status: 'REUSSI',
      amount: '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: '',
      custom_payment_method: '',
      reference_number: '',
      notes: '',
    })
    errors.value = {}
  }
})

function validate() {
  const e = {}
  const ceiling = props.needsTotal ? Number(form.expected_revenue) : Number(props.remainingAmount)
  if (props.needsTotal && (!form.expected_revenue || Number(form.expected_revenue) <= 0)) {
    e.expected_revenue = t('paymentForm.errors.total')
  }
  if (!form.amount || Number(form.amount) <= 0) e.amount = t('paymentForm.errors.amount')
  else if (ceiling > 0 && Number(form.amount) > ceiling) e.amount = t('paymentForm.errors.overRemaining', { amount: formatCurrency(ceiling) })
  if (!form.payment_date) e.payment_date = t('paymentForm.errors.date')
  if (!form.payment_method) e.payment_method = t('paymentForm.errors.method')
  if (form.payment_method === 'AUTRE' && !form.custom_payment_method.trim()) {
    e.custom_payment_method = t('paymentForm.errors.customMethod')
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function onSubmit() {
  if (!validate()) return
  const payload = {
    ...(props.needsTotal ? { expected_revenue: Number(form.expected_revenue) } : {}),
    status: form.status,
    amount: Number(form.amount),
    payment_date: form.payment_date,
    payment_method: form.payment_method,
    reference_number: form.reference_number || null,
    notes: form.notes || null,
  }
  if (form.payment_method === 'AUTRE') {
    payload.custom_payment_method = form.custom_payment_method
  }
  emit('submit', payload)
}

function setServerErrors(serverErrors) {
  if (!serverErrors) return
  errors.value = {}
  for (const [key, messages] of Object.entries(serverErrors)) {
    errors.value[key] = Array.isArray(messages) ? messages[0] : messages
  }
}

defineExpose({ setServerErrors })
</script>

<template>
  <AppModal :open="open" :title="t('paymentForm.title')" size="md" @close="emit('close')">
    <div v-if="!needsTotal" class="mb-5 p-3 rounded-lg bg-indigo-50 text-sm text-indigo-700 font-medium">
      {{ t('paymentForm.remaining', { amount: formatCurrency(remainingAmount) }) }}
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <AppInput
        v-if="needsTotal"
        v-model="form.expected_revenue"
        :label="t('paymentForm.total')"
        :hint="t('paymentForm.totalHint')"
        type="number"
        placeholder="0.00"
        :error="errors.expected_revenue"
        required
      />
      <AppSelect
        v-model="form.status"
        :label="t('paymentForm.status')"
        :options="statusOptions"
        :error="errors.status"
      />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          v-model="form.amount"
          :label="t('paymentForm.amount')"
          type="number"
          placeholder="0.00"
          :error="errors.amount"
          required
        />
        <AppInput
          v-model="form.payment_date"
          :label="t('paymentForm.date')"
          type="date"
          :error="errors.payment_date"
          required
        />
      </div>

      <AppSelect
        v-model="form.payment_method"
        :label="t('paymentForm.method')"
        :options="paymentMethodOptions"
        :placeholder="t('paymentForm.select')"
        :error="errors.payment_method"
        required
      />

      <AppInput
        v-if="showCustomMethod"
        v-model="form.custom_payment_method"
        :label="t('paymentForm.customMethod')"
        :placeholder="t('paymentForm.customPlaceholder')"
        :error="errors.custom_payment_method"
        required
      />

      <AppInput
        v-model="form.reference_number"
        :label="t('paymentForm.reference')"
        :placeholder="t('common.optional')"
        :error="errors.reference_number"
      />

      <AppInput
        v-model="form.notes"
        :label="t('appointments.notes')"
        :placeholder="t('common.optional')"
        :error="errors.notes"
      />
    </form>

    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="onSubmit">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>
