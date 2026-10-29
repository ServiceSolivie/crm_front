<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CalendarPlus } from 'lucide-vue-next'
import { callsApi } from '@/api/calls'
import { leadsApi } from '@/api/leads'
import { useLeadsStore } from '@/stores/leads.store'
import { useToast } from '@/composables/useToast'
import { LEAD_STATUS } from '@/utils/enums'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppInput from '@/components/base/AppInput.vue'

/**
 * After a call started from the CRM: note + new lead status in one step.
 */
const props = defineProps({
  // { crmCallId, lead: { id, reference, name }, talkSeconds } or null
  postCall: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const leadsStore = useLeadsStore()

const note = ref('')
const status = ref('')
const currentStatus = ref('')
const expectedRevenue = ref('')
const errors = ref({})
const saving = ref(false)

const statusOptions = computed(() => [
  { value: '', label: t('calls.postCall.keepStatus') },
  ...Object.keys(LEAD_STATUS)
    .filter((s) => s !== currentStatus.value)
    .map((s) => ({ value: s, label: t(`statuses.lead.${s}`) })),
])

const needsRevenue = computed(() => status.value === 'VALIDE')

const duration = computed(() => {
  const s = props.postCall?.talkSeconds ?? 0
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
})

watch(() => props.postCall, async (value) => {
  if (!value) return
  note.value = ''
  status.value = ''
  expectedRevenue.value = ''
  errors.value = {}
  currentStatus.value = ''
  try {
    const res = await leadsApi.get(value.lead.id)
    currentStatus.value = (res.data ?? res).status ?? ''
  } catch {
    // The status list simply won't hide the current status.
  }
})

async function save({ thenPlanAppointment = false } = {}) {
  errors.value = {}
  if (needsRevenue.value && !(Number(expectedRevenue.value) > 0)) {
    errors.value.expected_revenue = t('calls.postCall.revenueRequired')
    return
  }

  saving.value = true
  const { crmCallId, lead } = props.postCall
  try {
    if (note.value.trim()) {
      await callsApi.updateNote(crmCallId, note.value.trim())
    }
    if (status.value) {
      const payload = { status: status.value, comment: note.value.trim() || null }
      if (needsRevenue.value) payload.expected_revenue = Number(expectedRevenue.value)
      await leadsStore.updateStatus(lead.id, payload)
    }
    if (note.value.trim() || status.value) toast.showSuccess(t('calls.postCall.saved'))
    emit('close')
    if (thenPlanAppointment) {
      router.push({ name: 'leads.appointments.create', params: { leadId: lead.id } })
    }
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
    } else {
      toast.showError(e?.message ?? t('calls.postCall.saveError'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :open="postCall !== null"
    :title="t('calls.postCall.title', { name: postCall?.lead?.name ?? '' })"
    @close="emit('close')"
  >
    <div v-if="postCall" class="space-y-4">
      <p class="text-sm text-gray-500">
        {{ postCall.lead.reference }} · {{ t('calls.postCall.duration', { duration }) }}
      </p>

      <AppTextarea
        v-model="note"
        :label="t('calls.postCall.note')"
        :placeholder="t('calls.postCall.notePlaceholder')"
        :error="errors.note"
        :rows="4"
      />

      <AppSelect
        v-model="status"
        :label="t('calls.postCall.newStatus')"
        :options="statusOptions"
        :error="errors.status"
      />

      <AppInput
        v-if="needsRevenue"
        v-model="expectedRevenue"
        type="number"
        :label="t('calls.postCall.expectedRevenue')"
        :error="errors.expected_revenue"
        required
      />
    </div>

    <template #footer>
      <AppButton variant="ghost" :disabled="saving" @click="emit('close')">{{ t('calls.postCall.later') }}</AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="save({ thenPlanAppointment: true })">
        <template #icon><CalendarPlus class="w-4 h-4" /></template>
        {{ t('calls.postCall.planAppointment') }}
      </AppButton>
      <AppButton :loading="saving" @click="save()">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>
