<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppointmentsStore } from '@/stores/appointments.store'
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
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '@/utils/formatters'
import { firstErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const store = useAppointmentsStore()
const usersStore = useUsersStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const id = route.params.id
// Agents and gestion only ever book appointments for themselves - only an
// admin/team leader picks who the appointment is for.
const isSelfScoped = computed(() => auth.hasRole('agent') || auth.hasRole('gestion'))

const form = reactive({
  scheduled_at: '',
  duration_minutes: 30,
  status: '',
  agent_id: '',
  notes: '',
})
const errors = ref({})
// Appointment length (duration_minutes), drawn as such on the calendar
const durationOptions = computed(() =>
  [15, 30, 45, 60, 90, 120].map((m) => ({ value: m, label: t('appointmentForm.minutes', { n: m }) })),
)

const loaded = ref(false)
const appointmentStatusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')
const agentOptions = computed(() => [
  { value: '', label: t('common.unassigned') },
  ...usersStore.list.map((u) => ({ value: u.id, label: u.name })),
])
const original = reactive({ scheduled_at: '', status: '' })

const leadName = computed(() => {
  const lead = store.current?.lead
  return [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || lead?.reference || ''
})

onMounted(async () => {
  try {
    const promises = [store.fetchOne(id)]
    if (!isSelfScoped.value) promises.push(usersStore.fetchList({ role: 'agent', per_page: 100 }))
    await Promise.all(promises)
    const apt = store.current
    if (apt) {
      form.scheduled_at = toDatetimeLocalValue(apt.scheduled_at)
      form.status = apt.status ?? ''
      form.duration_minutes = apt.duration_minutes ?? 30
      form.agent_id = apt.agent?.id ?? ''
      form.notes = apt.notes ?? ''
      original.scheduled_at = form.scheduled_at
      original.status = form.status
    }
    loaded.value = true
  } catch {
    toast.showError(t('appointmentForm.loadError'))
    router.replace({ name: 'appointments' })
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
    const payload = { agent_id: form.agent_id, notes: form.notes, duration_minutes: Number(form.duration_minutes) }
    if (!payload.agent_id) delete payload.agent_id
    await store.update(id, payload)

    if (form.scheduled_at !== original.scheduled_at) {
      await store.reschedule(id, fromDatetimeLocalValue(form.scheduled_at))
    }
    if (form.status !== original.status) {
      await store.updateStatus(id, form.status)
    }

    toast.showSuccess(t('appointments.updateSuccess'))
    router.push({ name: 'appointments.detail', params: { id } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('appointmentForm.updateError')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[800px] mx-auto">
    <AppPageHeader
      :title="t('appointments.editAppointment')"
      :subtitle="leadName ? t('appointmentForm.forLead', { name: leadName }) : ''"
      :breadcrumb="[
        { label: t('appointments.title'), to: '/appointments' },
        { label: leadName || '…', to: `/appointments/${id}` },
        { label: t('common.edit') },
      ]"
    >
      <template #actions>
        <AppButton variant="secondary" @click="router.back()">{{ t('common.cancel') }}</AppButton>
        <AppButton type="submit" form="appointment-form" :disabled="!loaded" :loading="store.loading.form || store.loading.action">
          {{ t('common.saveChanges') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <section class="bg-white border border-gray-200 rounded-xl px-5 pt-4.5 pb-5">
      <div v-if="!loaded" class="space-y-4"><AppSkeleton v-for="n in 4" :key="n" height="40px" /></div>
      <form v-else id="appointment-form" class="flex flex-col gap-3.5" novalidate @submit.prevent="submit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
          <AppInput
            v-model="form.scheduled_at"
            type="datetime-local"
            :label="t('appointments.dateTime')"
            :error="errors.scheduled_at"
            required
          />
          <AppSelect v-model="form.duration_minutes" :label="t('appointmentForm.duration')" :options="durationOptions" :error="errors.duration_minutes" />
          <AppSelect v-model="form.status" :label="t('appointments.status')" :options="appointmentStatusOptions" />
          <div v-if="isSelfScoped" class="sm:col-span-2 flex items-center gap-2 text-[13px] text-gray-600">
            {{ t('appointmentForm.assignedTo') }}
            <AppAvatar :name="store.current?.agent?.name ?? auth.user?.name" size="xs" />
            <span class="font-medium text-gray-900">{{ store.current?.agent?.name ?? auth.user?.name }}</span>
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
  </div>
</template>
