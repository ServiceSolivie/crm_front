<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'reset'])

const { t } = useI18n()

const password = ref('')
const passwordConfirmation = ref('')
const errors = ref({})

watch(
  () => props.open,
  (val) => {
    if (val) {
      password.value = ''
      passwordConfirmation.value = ''
      errors.value = {}
    }
  },
)

function validate() {
  errors.value = {}
  if (!password.value) errors.value.password = t('users.passwordRequired')
  else if (password.value.length < 8) errors.value.password = t('users.passwordMin')
  if (password.value !== passwordConfirmation.value) {
    errors.value.password_confirmation = t('users.passwordMismatch')
  }
  return Object.keys(errors.value).length === 0
}

function confirm() {
  if (!validate()) return
  emit('reset', {
    password: password.value,
    password_confirmation: passwordConfirmation.value,
  })
}
</script>

<template>
  <AppModal :open="open" :title="t('users.resetPassword')" size="sm" @close="emit('close')">
    <p class="text-sm text-gray-500 mb-4">
      {{ t('users.resetPasswordDesc', { name: user?.name ?? '' }) }}
    </p>

    <div class="space-y-4">
      <AppInput
        v-model="password"
        :label="t('users.newPassword')"
        type="password"
        :error="errors.password"
        required
      />
      <AppInput
        v-model="passwordConfirmation"
        :label="t('users.confirmPassword')"
        type="password"
        :error="errors.password_confirmation"
        required
      />
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="loading" @click="confirm">{{ t('users.resetPassword') }}</AppButton>
    </template>
  </AppModal>
</template>
