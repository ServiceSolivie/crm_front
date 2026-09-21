<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle } from 'lucide-vue-next'
import { leadsApi } from '@/api/leads'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useUsersStore } from '@/stores/users.store'
import { useAuthStore } from '@/stores/auth.store'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadStatusBadge from './LeadStatusBadge.vue'
import { INSURANCE_TYPE, CLIENT_TYPE } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'

/**
 * Create / edit form for a lead. The page owns saving; this component owns
 * the fields, validation and the duplicate-phone check, and emits a clean payload.
 */
const props = defineProps({
  mode: { type: String, default: 'create' }, // create | edit
  lead: { type: Object, default: null }, // edit: the lead to prefill
  serverErrors: { type: Object, default: () => ({}) },
  formId: { type: String, default: 'lead-form' },
})
const emit = defineEmits(['submit'])

const { t } = useI18n()
const sourcesStore = useLeadSourcesStore()
const usersStore = useUsersStore()
const auth = useAuthStore()

const insuranceTypeOptions = useEnumOptions(INSURANCE_TYPE, 'insuranceTypes')
const clientTypeOptions = useEnumOptions(CLIENT_TYPE, 'clientTypes')

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  insurance_type: '',
  client_type: '',
  source_id: '',
  assigned_to: '',
  notes: '',
  address: '',
  company_name: '',
  company_legal_form: '',
  company_sector: '',
  company_employee_count: '',
  company_annual_revenue: '',
  company_status: '',
}
const form = reactive({ ...EMPTY })
const localErrors = ref({})
const errors = computed(() => ({ ...props.serverErrors, ...localErrors.value }))

const showClientType = computed(() => ['AUTO', 'MOTO'].includes(form.insurance_type))
const showCompanyFields = computed(() => form.insurance_type === 'DECENNALE')
const canAssign = computed(() => auth.can('LEADS_ASSIGN'))

const sourceOptions = computed(() => [
  { value: '', label: t('common.noSource') },
  ...sourcesStore.list.map((s) => ({ value: s.id, label: s.name })),
])
const agentOptions = computed(() => [
  { value: '', label: t('common.unassigned') },
  ...usersStore.list.map((u) => ({ value: u.id, label: u.name })),
])

function fillFrom(lead) {
  if (!lead) return
  Object.assign(form, {
    first_name: lead.first_name ?? '',
    last_name: lead.last_name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    insurance_type: lead.insurance_type ?? '',
    client_type: lead.client_type ?? '',
    source_id: lead.lead_source?.id ?? '',
    assigned_to: lead.assigned_agent?.id ?? '',
    address: lead.address ?? '',
    company_name: lead.company_name ?? '',
    company_legal_form: lead.company_legal_form ?? '',
    company_sector: lead.company_sector ?? '',
    company_employee_count: lead.company_employee_count ?? '',
    company_annual_revenue: lead.company_annual_revenue ?? '',
    company_status: lead.company_status ?? '',
  })
}
watch(() => props.lead, fillFrom, { immediate: true })

// Auto / Moto need a client type; default to individual, clear it for other products
watch(
  () => form.insurance_type,
  () => {
    if (showClientType.value && !form.client_type) form.client_type = 'INDIVIDUAL'
    if (!showClientType.value) form.client_type = ''
  },
)

onMounted(() => {
  sourcesStore.fetchList()
  if (canAssign.value) usersStore.fetchList({ role: 'agent', per_page: 100 })
})

/* ── Duplicate check on the phone number / e-mail ───────────
 * GET /leads/duplicates looks across all leads (same rule as the backend's
 * doublon detection); leads the user cannot open come back without an id. */
const duplicates = ref([])
let dupTimer = null
let dupGen = 0
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
watch(
  () => [form.phone, form.email],
  ([phone, email]) => {
    clearTimeout(dupTimer)
    const digits = (phone ?? '').replace(/\D/g, '')
    const mail = (email ?? '').trim()
    const checkPhone = digits.length >= 8
    const checkEmail = EMAIL_RE.test(mail)
    if (!checkPhone && !checkEmail) {
      duplicates.value = []
      return
    }
    dupTimer = setTimeout(async () => {
      const gen = ++dupGen
      try {
        const res = await leadsApi.duplicates({
          phone: checkPhone ? phone.trim() : undefined,
          email: checkEmail ? mail : undefined,
          exclude_id: props.lead?.id,
        })
        if (gen !== dupGen) return
        duplicates.value = res?.data ?? []
      } catch {
        duplicates.value = []
      }
    }, 400)
  },
)

/* ── Validation & submit ───────────────────────────────────── */
function validate() {
  const e = {}
  if (!form.first_name.trim()) e.first_name = t('leadForm.errors.firstName')
  if (!form.last_name.trim()) e.last_name = t('leadForm.errors.lastName')
  if (!form.phone.trim()) e.phone = t('leadForm.errors.phone')
  else if (form.phone.replace(/\D/g, '').length < 9) e.phone = t('leadForm.errors.phoneShort')
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('leadForm.errors.email')
  if (!form.insurance_type) e.insurance_type = t('leadForm.errors.insuranceType')
  localErrors.value = e
  return Object.keys(e).length === 0
}

// Clear a field's own error as soon as it is edited
watch(form, () => {
  if (!Object.keys(localErrors.value).length) return
  const next = { ...localErrors.value }
  for (const key of Object.keys(next)) {
    if (form[key] !== undefined && String(form[key]).trim()) delete next[key]
  }
  localErrors.value = next
})

function buildPayload() {
  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || undefined,
    insurance_type: form.insurance_type,
  }
  if (form.client_type) payload.client_type = form.client_type
  if (form.source_id) payload.source_id = form.source_id
  if (form.assigned_to && canAssign.value) payload.assigned_to = form.assigned_to
  if (props.mode === 'create' && form.notes.trim()) payload.notes = form.notes.trim()
  if (showCompanyFields.value) {
    for (const key of ['address', 'company_name', 'company_legal_form', 'company_sector', 'company_employee_count', 'company_annual_revenue', 'company_status']) {
      const v = String(form[key] ?? '').trim()
      if (v) payload[key] = v
      else if (props.mode === 'edit') payload[key] = null
    }
  }
  return payload
}

function onSubmit() {
  if (!validate()) return
  emit('submit', buildPayload())
}

function reset() {
  Object.assign(form, EMPTY)
  localErrors.value = {}
  duplicates.value = []
}

defineExpose({ reset })

const card = 'bg-white border border-gray-200 rounded-xl px-5 pt-4.5 pb-5 flex flex-col gap-3.5'
const cardTitle = 'font-display text-[15px] font-semibold text-gray-900'
</script>

<template>
  <div class="flex flex-col xl:flex-row gap-5 items-start">
    <form :id="formId" class="flex-1 min-w-0 w-full flex flex-col gap-4" novalidate @submit.prevent="onSubmit">

      <!-- Contact -->
      <section :class="card">
        <h2 :class="cardTitle">{{ t('leadForm.sections.contact') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
          <AppInput v-model="form.first_name" :label="t('leadForm.firstName')" placeholder="Jean" :error="errors.first_name" required autocomplete="given-name" />
          <AppInput v-model="form.last_name" :label="t('leadForm.lastName')" placeholder="Dupont" :error="errors.last_name" required autocomplete="family-name" />
          <AppInput
            v-model="form.phone"
            :label="t('leads.phone')"
            type="tel"
            placeholder="06 12 34 56 78"
            :error="errors.phone"
            :warning="duplicates.length ? t('leadForm.duplicateHint') : ''"
            required
            autocomplete="tel"
          />
          <AppInput v-model="form.email" :label="t('leads.email')" type="email" placeholder="jean@exemple.fr" :error="errors.email" autocomplete="email" />
        </div>
      </section>

      <!-- Request -->
      <section :class="card">
        <h2 :class="cardTitle">{{ t('leadForm.sections.request') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
          <AppSelect
            v-model="form.insurance_type"
            :label="t('leads.insuranceType')"
            :options="insuranceTypeOptions"
            :placeholder="t('leadForm.selectType')"
            :error="errors.insurance_type"
            required
          />
          <div v-if="showClientType" class="flex flex-col gap-1.5">
            <span class="text-[12.5px] font-medium text-gray-600">{{ t('leadDetail.info.clientType') }}</span>
            <div role="radiogroup" :aria-label="t('leadDetail.info.clientType')" class="h-10 flex gap-0.5 p-[3px] rounded-[9px] bg-gray-100">
              <button
                v-for="o in clientTypeOptions"
                :key="o.value"
                type="button"
                role="radio"
                :aria-checked="form.client_type === o.value"
                :class="[
                  'flex-1 rounded-[7px] text-[13px] transition-colors',
                  form.client_type === o.value ? 'bg-white text-gray-900 font-medium shadow-[0_1px_2px_rgba(17,24,39,0.08)]' : 'text-gray-600 hover:text-gray-900',
                ]"
                @click="form.client_type = o.value"
              >{{ o.label }}</button>
            </div>
          </div>
          <AppSelect v-model="form.source_id" :label="t('leads.filterSource')" :options="sourceOptions" :error="errors.source_id" />
          <AppSelect
            v-if="canAssign"
            v-model="form.assigned_to"
            :label="t('leadForm.assignTo')"
            :options="agentOptions"
            :error="errors.assigned_to"
          />
        </div>
      </section>

      <!-- Company (Décennale) -->
      <section v-if="showCompanyFields" :class="card">
        <div class="flex items-baseline justify-between gap-3">
          <h2 :class="cardTitle">{{ t('leadForm.sections.company') }}</h2>
          <span class="text-[12.5px] text-gray-500">{{ t('leadForm.companyHint') }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3.5">
          <AppInput v-model="form.company_name" :label="t('leads.companyName')" :error="errors.company_name" class="sm:col-span-2" />
          <AppInput v-model="form.company_legal_form" :label="t('leads.legalForm')" placeholder="SARL, SAS…" :error="errors.company_legal_form" />
          <AppInput v-model="form.company_sector" :label="t('leads.sector')" :error="errors.company_sector" />
          <AppInput v-model="form.company_employee_count" :label="t('leads.employeeCount')" :error="errors.company_employee_count" />
          <AppInput v-model="form.company_annual_revenue" :label="t('leads.annualRevenue')" :error="errors.company_annual_revenue" />
          <AppInput v-model="form.address" :label="t('leads.address')" :placeholder="t('leadForm.addressPlaceholder')" :error="errors.address" class="sm:col-span-2" />
          <AppInput v-model="form.company_status" :label="t('leads.applicantStatus')" :error="errors.company_status" />
        </div>
      </section>

      <!-- Initial note (create only — notes are added from the lead page afterwards) -->
      <section v-if="mode === 'create'" :class="card">
        <AppTextarea
          v-model="form.notes"
          :label="t('leadForm.sections.note')"
          :placeholder="t('leadForm.notePlaceholder')"
          :rows="3"
        />
      </section>

      <slot name="after-fields" />
    </form>

    <!-- Side panel -->
    <aside class="w-full xl:w-[320px] shrink-0 flex flex-col gap-4">
      <section v-if="duplicates.length" class="bg-amber-50 border border-amber-200 rounded-xl px-4.5 py-4 flex flex-col gap-2.5">
        <p class="flex items-center gap-2 text-[13.5px] font-semibold text-amber-900">
          <AlertTriangle class="w-4 h-4" />{{ t('leadForm.duplicateTitle') }}
        </p>
        <component
          :is="d.can_open ? 'RouterLink' : 'div'"
          v-for="d in duplicates"
          :key="d.reference"
          v-bind="d.can_open ? { to: { name: 'leads.detail', params: { id: d.id } }, target: '_blank' } : {}"
          :class="[
            'flex items-center gap-2.5 bg-white border border-amber-200 rounded-lg px-3 py-2.5',
            d.can_open ? 'hover:border-amber-300' : '',
          ]"
        >
          <AppAvatar :name="d.name || d.reference" size="sm" tone="soft" />
          <div class="flex-1 min-w-0">
            <p class="text-[13.5px] font-medium text-gray-900 truncate">{{ d.name || d.reference }}</p>
            <div class="flex items-center gap-1.5 mt-0.5 min-w-0">
              <LeadStatusBadge :status="d.status" />
              <span class="text-xs text-gray-500 truncate">
                {{ d.insurance_type ? t('insuranceTypesShort.' + d.insurance_type, d.insurance_type) : '' }}<template v-if="d.assigned_agent"> · {{ d.assigned_agent.name }}</template>
              </span>
            </div>
            <p v-if="!d.can_open" class="text-[11.5px] text-gray-500 mt-0.5">{{ t('leadForm.duplicateOtherScope') }}</p>
          </div>
        </component>
        <p class="text-[12.5px] leading-[18px] text-amber-900">
          {{ mode === 'create' ? t('leadForm.duplicateCreate') : t('leadForm.duplicateEdit') }}
        </p>
      </section>

      <slot name="aside" />
    </aside>
  </div>
</template>
