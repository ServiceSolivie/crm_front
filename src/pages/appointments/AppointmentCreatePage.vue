<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useUsersStore } from '@/stores/users.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { APPOINTMENT_STATUS } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'

const route = useRoute()
const router = useRouter()
const leadsStore = useLeadsStore()
const usersStore = useUsersStore()
const auth = useAuthStore()
const toast = useToast()

const leadId = route.params.leadId

const isAgent = computed(() => auth.hasRole('agent'))

const form = reactive({
  agent_id: '',
  scheduled_at: '',
  status: 'PLANIFIE',
  notes: '',
})
const errors = ref({})
const appointmentStatusOptions = useEnumOptions(APPOINTMENT_STATUS, 'statuses.appointment')
const agentOptions = ref([{ value: '', label: 'Unassigned' }])

const leadFullName = computed(() => {
  const l = leadsStore.current
  if (!l || String(l.id) !== String(leadId)) return ''
  return [l.first_name, l.last_name].filter(Boolean).join(' ')
})

onMounted(async () => {
  try {
    const promises = [leadsStore.fetchOne(leadId)]
    if (!isAgent.value) {
      promises.push(usersStore.fetchList({ role: 'agent', per_page: 100 }))
    }
    await Promise.all(promises)

    if (isAgent.value) {
      form.agent_id = auth.user?.id ?? ''
    } else {
      agentOptions.value = [
        { value: '', label: 'Unassigned' },
        ...usersStore.list.map((u) => ({ value: u.id, label: u.name })),
      ]
    }
  } catch {
    toast.showError('Failed to load lead')
    router.replace({ name: 'leads' })
  }
})

function validate() {
  errors.value = {}
  if (!form.scheduled_at) errors.value.scheduled_at = 'Date & time is required'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = { ...form }
    if (!payload.agent_id) delete payload.agent_id
    if (!payload.notes) delete payload.notes
    await leadsStore.createLeadAppointment(leadId, payload)
    toast.showSuccess('Appointment created')
    router.push({ name: 'leads.detail', params: { id: leadId } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? 'Failed to create appointment')
    }
  }
}

function goBack() {
  router.push({ name: 'leads.detail', params: { id: leadId } })
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="goBack">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        Back to Lead
      </AppButton>
      <div>
        <h1 class="text-xl font-semibold text-gray-900">New Appointment</h1>
        <p v-if="leadFullName" class="text-sm text-gray-500 mt-0.5">for {{ leadFullName }}</p>
      </div>
    </div>

    <AppCard v-if="leadsStore.loading.detail">
      <div class="space-y-4">
        <AppSkeleton v-for="n in 4" :key="n" height="44px" />
      </div>
    </AppCard>

    <AppCard v-else>
      <div v-if="leadsStore.current" class="mb-5 p-3 rounded-xl bg-gray-50">
        <p class="text-sm font-semibold text-gray-900">{{ leadFullName }}</p>
        <p v-if="leadsStore.current.phone" class="text-xs text-gray-500">{{ leadsStore.current.phone }}</p>
        <p v-if="leadsStore.current.email" class="text-xs text-gray-500">{{ leadsStore.current.email }}</p>
      </div>

      <form class="space-y-5" @submit.prevent="submit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            v-model="form.scheduled_at"
            type="datetime-local"
            label="Date & Time"
            :error="errors.scheduled_at"
            required
          />
          <AppSelect
            v-model="form.status"
            label="Initial Status"
            :options="appointmentStatusOptions"
          />
          <!-- Agents and admins/managers see different things for assignment -->
          <div v-if="isAgent" class="sm:col-span-2 p-3 rounded-xl bg-gray-50 text-sm text-gray-600">
            Assigned to: <span class="font-medium text-gray-900">{{ auth.user?.name ?? 'You' }}</span>
          </div>
          <AppSelect
            v-else
            v-model="form.agent_id"
            label="Assign To Agent"
            :options="agentOptions"
            class="sm:col-span-2"
          />
        </div>

        <div class="border-t border-gray-100" />

        <AppTextarea
          v-model="form.notes"
          label="Notes (optional)"
          placeholder="Any notes about this appointment…"
          :rows="3"
        />

        <div class="flex items-center justify-end gap-3">
          <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
          <AppButton type="submit" :loading="leadsStore.loading.form">Create Appointment</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>
