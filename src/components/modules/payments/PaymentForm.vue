<script setup>
import { reactive, ref, computed, watch } from 'vue'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import { PAYMENT_METHOD } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatCurrency } from '@/utils/formatters'

const paymentMethodOptions = useEnumOptions(PAYMENT_METHOD, 'paymentMethods')

const props = defineProps({
  open: { type: Boolean, default: false },
  remainingAmount: { type: [String, Number], default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({
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
  if (!form.amount || Number(form.amount) <= 0) e.amount = 'Le montant doit être supérieur à 0.'
  if (Number(form.amount) > Number(props.remainingAmount)) e.amount = `Le montant dépasse le solde restant (${formatCurrency(props.remainingAmount)}).`
  if (!form.payment_date) e.payment_date = 'La date est obligatoire.'
  if (!form.payment_method) e.payment_method = 'La méthode de paiement est obligatoire.'
  if (form.payment_method === 'AUTRE' && !form.custom_payment_method.trim()) {
    e.custom_payment_method = 'Veuillez préciser la méthode de paiement.'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function onSubmit() {
  if (!validate()) return
  const payload = {
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
  <AppModal :open="open" title="Enregistrer un paiement" size="md" @close="emit('close')">
    <div class="mb-5 p-3 rounded-lg bg-indigo-50 text-sm text-indigo-700 font-medium">
      Solde restant : {{ formatCurrency(remainingAmount) }}
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          v-model="form.amount"
          label="Montant"
          type="number"
          placeholder="0.00"
          :error="errors.amount"
          required
        />
        <AppInput
          v-model="form.payment_date"
          label="Date de paiement"
          type="date"
          :error="errors.payment_date"
          required
        />
      </div>

      <AppSelect
        v-model="form.payment_method"
        label="Méthode de paiement"
        :options="paymentMethodOptions"
        placeholder="Sélectionner…"
        :error="errors.payment_method"
        required
      />

      <AppInput
        v-if="showCustomMethod"
        v-model="form.custom_payment_method"
        label="Préciser la méthode"
        placeholder="Ex: Chèque, Espèces, PayPal…"
        :error="errors.custom_payment_method"
        required
      />

      <AppInput
        v-model="form.reference_number"
        label="Numéro de référence"
        placeholder="Optionnel"
        :error="errors.reference_number"
      />

      <AppInput
        v-model="form.notes"
        label="Notes"
        placeholder="Optionnel"
        :error="errors.notes"
      />
    </form>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">Annuler</AppButton>
      <AppButton :loading="loading" @click="onSubmit">Enregistrer</AppButton>
    </template>
  </AppModal>
</template>
