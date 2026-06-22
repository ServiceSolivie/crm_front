<script setup>
import { ref, watch } from 'vue'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const amount = ref('')
const error = ref('')

watch(() => props.open, (val) => {
  if (val) {
    amount.value = ''
    error.value = ''
  }
})

function onConfirm() {
  if (!amount.value || Number(amount.value) <= 0) {
    error.value = 'Le montant doit être supérieur à 0.'
    return
  }
  error.value = ''
  emit('confirm', Number(amount.value))
}
</script>

<template>
  <AppModal :open="open" title="Valider le lead" size="sm" @close="emit('close')">
    <p class="text-sm text-gray-600 mb-4">
      Pour valider ce lead, veuillez saisir le montant de chiffre d'affaires attendu.
    </p>
    <AppInput
      v-model="amount"
      label="Montant attendu (€)"
      type="number"
      placeholder="0.00"
      :error="error"
      required
      @keyup.enter="onConfirm"
    />

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">Annuler</AppButton>
      <AppButton :loading="loading" @click="onConfirm">Valider</AppButton>
    </template>
  </AppModal>
</template>
