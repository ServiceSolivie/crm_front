<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import { INSURANCE_TYPE, CLIENT_TYPE } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  currentInsuranceType: { type: String, default: null },
})

const emit = defineEmits(['close', 'confirm'])
const { t } = useI18n()

const insuranceTypeOptions = useEnumOptions(INSURANCE_TYPE, 'insuranceTypes')
const clientTypeOptions = useEnumOptions(CLIENT_TYPE, 'clientTypes')

const insuranceType = ref('')
const clientType = ref('')
const comment = ref('')
const error = ref('')

watch(
  () => props.open,
  (val) => {
    if (val) {
      insuranceType.value = ''
      clientType.value = ''
      comment.value = ''
      error.value = ''
    }
  },
)

function submit() {
  if (!insuranceType.value) {
    error.value = t('crossSell.productRequired')
    return
  }
  if (insuranceType.value === props.currentInsuranceType) {
    error.value = "Ce lead a déjà ce produit — choisissez un produit différent"
    return
  }
  error.value = ''
  emit('confirm', {
    insurance_type: insuranceType.value,
    client_type: clientType.value || undefined,
    comment: comment.value || undefined,
  })
}
</script>

<template>
  <AppModal :open="open" :title="t('crossSell.title')" size="sm" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">
        Crée un nouveau lead pour ce client avec les mêmes coordonnées, assigné directement à vous.
      </p>

      <AppSelect
        v-model="insuranceType"
        :label="t('crossSell.product')"
        :options="insuranceTypeOptions"
        required
      />

      <AppSelect
        v-if="insuranceType === 'DECENNALE'"
        v-model="clientType"
        :label="t('leadDetail.info.clientType')"
        :options="clientTypeOptions"
      />

      <AppTextarea
        v-model="comment"
        :label="t('crossSell.comment')"
        :placeholder="t('crossSell.commentPlaceholder')"
        :rows="3"
      />

      <p v-if="error" class="text-xs text-danger-text">{{ error }}</p>
    </div>

    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="submit">{{ t('leadForm.create') }}</AppButton>
    </template>
  </AppModal>
</template>
