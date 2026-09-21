<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])
const { t } = useI18n()

const amount = ref('')
const error = ref('')

watch(() => props.open, (val) => {
  if (val) {
    amount.value = ''
    error.value = ''
  }
})

function onConfirm() {
  // Accept French decimals ("720,50") as well as "720.50"
  const value = Number(String(amount.value).replace(/\s/g, '').replace(',', '.'))
  if (!amount.value || !Number.isFinite(value) || value <= 0) {
    error.value = t('revenuePrompt.amountRequired')
    return
  }
  error.value = ''
  emit('confirm', value)
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('revenuePrompt.title')"
    :description="t('revenuePrompt.description')"
    :icon="Check"
    tone="success"
    size="sm"
    @close="emit('close')"
  >
    <form novalidate @submit.prevent="onConfirm">
      <AppInput
        v-model="amount"
        :label="t('revenuePrompt.label')"
        type="text"
        placeholder="0"
        :hint="t('revenuePrompt.hint')"
        :error="error"
        required
        class="[&_input]:font-mono [&_input]:text-lg [&_input]:h-11"
      >
        <template #suffix><span class="font-mono text-base text-gray-500">€</span></template>
      </AppInput>
    </form>

    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="onConfirm">{{ t('revenuePrompt.confirm') }}</AppButton>
    </template>
  </AppModal>
</template>
