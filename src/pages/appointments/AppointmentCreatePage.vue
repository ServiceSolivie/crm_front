<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Phone, Mail } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useUsersStore } from '@/stores/users.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { APPOINTMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { fromDatetimeLocalValue } from '@/utils/formatters'
import { firstErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const leadsStore = useLeadsStore()
const usersStore = useUsersStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const leadId = route.params.leadId

// Agents and gestion only ever book appointments for themselves - only an
// admin/team leader picks who the appointment is for.
const isSelfScoped = computed(() => auth.hasRole('agent') || auth.hasRole('gestion'))

const form = reactive({
  agent_id: '',
  scheduled_at: '',
  duration_minutes: 30,
  status: 'PLANIFIE',
  notes: '',
})
const errors = ref({})
// Appointment length (duration_minutes), drawn as such on the calendar
const durationOptions = computed(() =>
  [15, 30, 45, 60, 90, 120].map((m) => ({ value: m, label: t('appointmentForm.minutes', { n: m }) })),
)

const appointmentStatusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')
const agentOptions = computed(() => [
  { value: '', label: t('common.unassigned') },
  ...usersStore.list.map((u) => ({ value: u.id, label: u.name })),
])

const lead = computed(() => (leadsStore.current && String(leadsStore.current.id) === String(leadId) ? leadsStore.current : null))
const leadFullName = computed(() =>
  lead.value ? [lead.value.first_name, lead.value.last_name].filter(Boolean).join(' ') || lead.value.reference : '',
)

onMounted(async () => {
  try {
    const promises = [leadsStore.fetchOne(leadId)]
    if (!isSelfScoped.value) promises.push(usersStore.fetchList({ role: 'agent', per_page: 100 }))
    await Promise.all(promises)
    form.agent_id = isSelfScoped.value ? (auth.user?.id ?? '') : (leadsStore.current?.assigned_agent?.id ?? '')
  } catch {
    toast.showError(t('leadForm.errors.load'))
    router.replace({ name: 'leads' })
  }
})

function validate() {
  errors.value = {}
  if (!form.scheduled_at) errors.value.scheduled_at = t('appointmentForm.dateRequired')
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = { ...form, scheduled_at: fromDatetimeLocalValue(form.scheduled_at) }
    if (!payload.agent_id) delete payload.agent_id
    if (!payload.notes) delete payload.notes
    await leadsStore.createLeadAppointment(leadId, payload)
    toast.showSuccess(t('appointments.createSuccess'))
    router.push({ name: 'leads.detail', params: { id: leadId } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('appointmentForm.createError')))
  }
}

function goBack() {
  router.push({ name: 'leads.detail', params: { id: leadId } })
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1100px] mx-auto">
    <AppPageHeader
      :title="t('appointments.newAppointment')"
      :subtitle="leadFullName ? t('appointmentForm.forLead', { name: leadFullName }) : ''"
      :breadcrumb="[
        { label: t('leads.title'), to: '/leads' },
        { label: leadFullName || '…', to: `/leads/${leadId}` },
        { label: t('appointments.newAppointment') },
      ]"
    >
      <template #actions>
        <AppButton variant="secondary" @click="goBack">{{ t('common.cancel') }}</AppButton>
        <AppButton type="submit" form="appointment-form" :loading="leadsStore.loading.form">{{ t('appointmentForm.create') }}</AppButton>
      </template>
    </AppPageHeader>

    <div class="flex flex-col lg:flex-row gap-5 items-start">
      <section class="flex-1 min-w-0 w-full bg-white border border-gray-200 rounded-xl px-5 pt-4.5 pb-5">
        <div v-if="!lead" class="space-y-4"><AppSkeleton v-for="n in 4" :key="n" height="40px" /></div>
        <form v-else id="appointment-form" class="flex flex-col gap-3.5" novalidate @submit.prevent="submit">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('appointments.details') }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
            <AppInput
              v-model="form.scheduled_at"
              type="datetime-local"
              :label="t('appointments.dateTime')"
              :error="errors.scheduled_at"
              required
            />
            <AppSelect v-model="form.duration_minutes" :label="t('appointmentForm.duration')" :options="durationOptions" :error="errors.duration_minutes" />
            <AppSelect v-model="form.status" :label="t('appointmentForm.initialStatus')" :options="appointmentStatusOptions" />
            <div v-if="isSelfScoped" class="sm:col-span-2 flex items-center gap-2 text-[13px] text-gray-600">
              {{ t('appointmentForm.assignedTo') }}
              <AppAvatar :name="auth.user?.name" size="xs" />
              <span class="font-medium text-gray-900">{{ auth.user?.name }}</span>
            </div>
            <AppSelect
              v-else
              v-model="form.agent_id"
              :label="t('appointments.agent')"
              :options="agentOptions"
              :error="errors.agent_id"
              class="sm:col-span-2"
            />
          </div>
          <AppTextarea v-model="form.notes" :label="t('appointments.notes')" :placeholder="t('appointmentForm.notesPlaceholder')" :rows="3" />
        </form>
      </section>

      <aside v-if="lead" class="w-full lg:w-[320px] shrink-0">
        <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-3">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('appointments.lead') }}</h2>
          <div class="flex items-center gap-2.5 min-w-0">
            <AppAvatar :name="leadFullName" size="md" tone="soft" />
            <span class="min-w-0">
              <span class="block text-[14px] font-medium truncate">{{ leadFullName }}</span>
              <span v-if="lead.insurance_type" class="block text-xs text-gray-500">{{ t('insuranceTypes.' + lead.insurance_type, lead.insurance_type) }}</span>
            </span>
          </div>
          <a v-if="lead.phone" :href="`tel:${lead.phone}`" class="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-gray-900 hover:text-primary">
            <Phone class="w-3.5 h-3.5" />{{ lead.phone }}
          </a>
          <a v-if="lead.email" :href="`mailto:${lead.email}`" class="inline-flex items-center gap-1.5 text-[13px] text-gray-900 hover:text-primary min-w-0">
            <Mail class="w-3.5 h-3.5 shrink-0" /><span class="truncate">{{ lead.email }}</span>
          </a>
        </section>
      </aside>
    </div>
  </div>
</template>
