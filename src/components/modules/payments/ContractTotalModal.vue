<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { paymentsApi } from '@/api/payments'
import { useUiStore } from '@/stores/ui.store'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import { firstErrorMessage } from '@/utils/errors'
import { formatCurrency } from '@/utils/formatters'

/**
 * Change the contract total of a lead, with a reason (kept in the lead's
 * notes). Typically raised when the contract grew, so the balance can be
 * asked with a new payment link. The backend refuses a total below what
 * the client already paid, is paying, or has a waiting link for.
 */
const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
  leadId: { type: [Number, String], required: true },
  // Current contract total; null when none was set yet
  total: { type: [Number, String], default: null },
  received: { type: [Number, String], default: 0 },
})

const emit = defineEmits(['close', 'saved'])

const ui = useUiStore()
const form = ref({ total: '', reason: '' })
const errors = ref({})
const busy = ref(false)

watch(() => props.open, (open) => {
  if (!open) return
  errors.value = {}
  form.value = { total: props.total != null ? String(Number(props.total).toFixed(2)) : '', reason: '' }
})

const toNumber = (value) => Number(String(value).replace(',', '.'))

function validate() {
  const e = {}
  if (!(toNumber(form.value.total) > 0)) e.total = t('contractTotal.errors.total')
  if (form.value.reason.trim().length < 3) e.reason = t('contractTotal.errors.reason')
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  if (!validate()) return
  busy.value = true
  try {
    const res = await paymentsApi.updateTotal(props.leadId, {
      total: toNumber(form.value.total),
      reason: form.value.reason.trim(),
    })
    ui.showSuccess(res.message ?? t('contractTotal.saved'))
    emit('saved', res.data)
    emit('close')
  } catch (e) {
    if (e?.errors) {
      errors.value = { total: e.errors.total?.[0] ?? '', reason: e.errors.reason?.[0] ?? '' }
    }
    ui.showError(firstErrorMessage(e, t('contractTotal.errors.save')))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppModal :open="open" :title="t('contractTotal.modalTitle')" size="sm" @close="emit('close')">
    <form class="flex flex-col gap-3" @submit.prevent="save">
      <p class="text-[13px] text-gray-600">
        {{ total != null
          ? t('contractTotal.current', { total: formatCurrency(total), received: formatCurrency(received) })
          : t('contractTotal.none', { received: formatCurrency(received) }) }}
      </p>
      <p class="text-xs text-gray-500">{{ t('contractTotal.hint') }}</p>
      <AppInput
        v-model="form.total"
        :label="t('contractTotal.total')"
        type="text"
        placeholder="0,00"
        :error="errors.total"
        required
      />
      <AppTextarea
        v-model="form.reason"
        :label="t('contractTotal.reason')"
        :placeholder="t('contractTotal.reasonPlaceholder')"
        :hint="t('contractTotal.reasonHint')"
        :error="errors.reason"
        :rows="2"
        :maxlength="255"
        required
      />
      <button type="submit" class="hidden" tabindex="-1" aria-hidden="true" />
    </form>
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="busy" @click="save">{{ t('contractTotal.save') }}</AppButton>
    </template>
  </AppModal>
</template>
