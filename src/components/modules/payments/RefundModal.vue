<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import { formatCurrency } from '@/utils/formatters'

/**
 * Confirm a full refund of one paid payment request. No amount field:
 * Sogecommerce only refunds a payment in full. Shows the contract total
 * after the refund (it drops by the refunded amount) and asks a reason.
 */
const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  session: { type: Object, default: null },
  // Lead's contract total, null when it has none
  contractTotal: { type: [Number, String], default: null },
})

const emit = defineEmits(['close', 'confirm'])

const reason = ref('')
const error = ref('')

watch(() => props.open, (val) => {
  if (val) {
    reason.value = ''
    error.value = ''
  }
})

const newTotal = computed(() => {
  if (props.contractTotal === null || props.contractTotal === undefined || !props.session) return null
  return Math.max(0, Number(props.contractTotal) - Number(props.session.amount))
})

function submit() {
  if (reason.value.trim().length < 3) {
    error.value = t('refund.errors.reasonRequired')
    return
  }
  error.value = ''
  emit('confirm', reason.value.trim())
}
</script>

<template>
  <AppModal :open="open" :title="t('refund.modalTitle')" size="sm" @close="emit('close')">
    <div v-if="session" class="flex flex-col gap-3">
      <dl class="grid grid-cols-2 gap-y-1.5 text-[13px]">
        <dt class="text-gray-500">{{ t('refund.reference') }}</dt>
        <dd class="font-mono text-right text-gray-900">{{ session.reference }}</dd>
        <dt class="text-gray-500">{{ t('refund.amount') }}</dt>
        <dd class="font-mono text-right font-medium text-gray-900">{{ formatCurrency(session.amount) }}</dd>
        <template v-if="newTotal !== null">
          <dt class="text-gray-500">{{ t('refund.newTotal') }}</dt>
          <dd class="font-mono text-right text-gray-900">
            {{ formatCurrency(contractTotal) }} → {{ formatCurrency(newTotal) }}
          </dd>
        </template>
      </dl>

      <p class="rounded-lg border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-gray-800">
        {{ t('refund.warning') }}
      </p>

      <AppTextarea
        v-model="reason"
        :label="t('refund.reason')"
        :placeholder="t('refund.reasonPlaceholder')"
        :error="error"
        :rows="3"
        :maxlength="255"
        required
      />
    </div>

    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton variant="danger" :loading="loading" @click="submit">{{ t('refund.confirm') }}</AppButton>
    </template>
  </AppModal>
</template>
