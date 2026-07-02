<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useUsersStore } from '@/stores/users.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { INSURANCE_TYPE, CLIENT_TYPE } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'

const route = useRoute()
const router = useRouter()
const leadsStore = useLeadsStore()
const sourcesStore = useLeadSourcesStore()
const usersStore = useUsersStore()
const toast = useToast()

const insuranceTypeOptions = useEnumOptions(INSURANCE_TYPE, 'insuranceTypes')
const clientTypeOptions = useEnumOptions(CLIENT_TYPE, 'clientTypes')

const id = route.params.id
const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  insurance_type: '',
  client_type: '',
  source_id: '',
  assigned_to: '',
})
const errors = ref({})

const agentOptions = ref([{ value: '', label: 'Unassigned' }])
const sourceOptions = ref([{ value: '', label: 'No Source' }])

const showClientType = (type) => ['AUTO', 'MOTO'].includes(type)

const fullName = computed(() => {
  const lead = leadsStore.current
  if (!lead) return ''
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ')
})

onMounted(async () => {
  try {
    await Promise.all([
      leadsStore.fetchOne(id),
      sourcesStore.fetchList(),
      usersStore.fetchList({ role: 'agent', per_page: 100 }),
    ])
    const lead = leadsStore.current
    if (lead) {
      form.first_name = lead.first_name ?? ''
      form.last_name = lead.last_name ?? ''
      form.email = lead.email ?? ''
      form.phone = lead.phone ?? ''
      form.insurance_type = lead.insurance_type ?? ''
      form.client_type = lead.client_type ?? ''
      form.source_id = lead.lead_source?.id ?? ''
      form.assigned_to = lead.assigned_agent?.id ?? ''
    }
    sourceOptions.value = [
      { value: '', label: 'No Source' },
      ...sourcesStore.list.map((s) => ({ value: s.id, label: s.name })),
    ]
    agentOptions.value = [
      { value: '', label: 'Unassigned' },
      ...usersStore.list.map((u) => ({ value: u.id, label: u.name })),
    ]
  } catch {
    toast.showError('Failed to load lead')
    router.replace({ name: 'leads' })
  }
})

function validate() {
  errors.value = {}
  if (!form.first_name.trim()) errors.value.first_name = 'First name is required'
  if (!form.last_name.trim()) errors.value.last_name = 'Last name is required'
  if (!form.phone.trim()) errors.value.phone = 'Phone is required'
  if (!form.insurance_type) errors.value.insurance_type = 'Insurance type is required'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      email: form.email || undefined,
      insurance_type: form.insurance_type,
    }
    if (form.client_type) payload.client_type = form.client_type
    if (form.source_id) payload.source_id = form.source_id
    if (form.assigned_to) payload.assigned_to = form.assigned_to
    await leadsStore.update(id, payload)
    toast.showSuccess('Lead updated')
    router.push({ name: 'leads.detail', params: { id } })
  } catch (e) {
    if (e?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? 'Failed to update lead')
    }
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <AppButton variant="ghost" size="sm" @click="router.back()">
        <template #icon><ArrowLeft class="w-4 h-4" /></template>
        Back
      </AppButton>
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Edit Lead</h1>
        <p v-if="fullName" class="text-sm text-gray-500 mt-0.5">{{ fullName }}</p>
      </div>
    </div>

    <AppCard v-if="leadsStore.loading.detail">
      <div class="space-y-4">
        <AppSkeleton v-for="n in 5" :key="n" height="44px" />
      </div>
    </AppCard>

    <AppCard v-else>
      <form class="space-y-5" @submit.prevent="submit">
        <div>
          <h2 class="text-sm font-semibold text-gray-700 mb-3">Personal Information</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput
              v-model="form.first_name"
              label="First Name"
              :error="errors.first_name"
              required
            />
            <AppInput
              v-model="form.last_name"
              label="Last Name"
              :error="errors.last_name"
              required
            />
            <AppInput
              v-model="form.phone"
              label="Phone"
              type="tel"
              :error="errors.phone"
              required
            />
            <AppInput
              v-model="form.email"
              label="Email"
              type="email"
              :error="errors.email"
            />
          </div>
        </div>

        <div class="border-t border-gray-100" />

        <div>
          <h2 class="text-sm font-semibold text-gray-700 mb-3">Lead Details</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppSelect
              v-model="form.insurance_type"
              label="Insurance Type"
              :options="insuranceTypeOptions"
              :error="errors.insurance_type"
              required
            />
            <AppSelect
              v-if="showClientType(form.insurance_type)"
              v-model="form.client_type"
              label="Type de client"
              :options="clientTypeOptions"
              :error="errors.client_type"
            />
            <AppSelect
              v-model="form.source_id"
              label="Lead Source"
              :options="sourceOptions"
            />
            <AppSelect
              v-model="form.assigned_to"
              label="Assigned To"
              :options="agentOptions"
              class="sm:col-span-2"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <AppButton variant="ghost" type="button" @click="router.back()">Cancel</AppButton>
          <AppButton type="submit" :loading="leadsStore.loading.form">Save Changes</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>
