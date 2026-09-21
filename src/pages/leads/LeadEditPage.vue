<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useToast } from '@/composables/useToast'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import LeadForm from '@/components/modules/leads/LeadForm.vue'
import { firstErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const leadsStore = useLeadsStore()
const toast = useToast()
const { t } = useI18n()

const id = route.params.id
const serverErrors = ref({})

// Only the lead being edited, never another one still in the store
const lead = computed(() =>
  leadsStore.current && String(leadsStore.current.id) === String(id) ? leadsStore.current : null,
)
const fullName = computed(() =>
  lead.value ? [lead.value.first_name, lead.value.last_name].filter(Boolean).join(' ') || lead.value.reference : '',
)

onMounted(async () => {
  try {
    await leadsStore.fetchOne(id)
  } catch {
    toast.showError(t('leadForm.errors.load'))
    router.replace({ name: 'leads' })
  }
})

async function onSubmit(payload) {
  serverErrors.value = {}
  try {
    await leadsStore.update(id, payload)
    toast.showSuccess(t('leads.updateSuccess'))
    router.push({ name: 'leads.detail', params: { id } })
  } catch (e) {
    if (e?.errors) {
      serverErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('leadForm.errors.update')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <nav :aria-label="t('leadDetail.breadcrumb')" class="flex items-center gap-1.5 text-[13px] text-gray-500">
      <RouterLink :to="{ name: 'leads' }" class="text-gray-600 hover:text-gray-900">{{ t('leads.title') }}</RouterLink>
      <ChevronRight class="w-3.5 h-3.5" />
      <RouterLink v-if="lead" :to="{ name: 'leads.detail', params: { id } }" class="text-gray-600 hover:text-gray-900 truncate">{{ fullName }}</RouterLink>
      <ChevronRight v-if="lead" class="w-3.5 h-3.5" />
      <span class="text-gray-900">{{ t('common.edit') }}</span>
    </nav>

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('leads.editLead') }}</h1>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ fullName || t('common.loading') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-9 px-3.5 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50"
          @click="router.back()"
        >{{ t('common.cancel') }}</button>
        <button
          type="submit"
          form="lead-form"
          :disabled="!lead || leadsStore.loading.form"
          class="h-9 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
        >{{ t('common.saveChanges') }}</button>
      </div>
    </div>

    <div v-if="!lead" class="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-3xl">
      <AppSkeleton v-for="n in 5" :key="n" height="40px" />
    </div>
    <LeadForm v-else mode="edit" :lead="lead" :server-errors="serverErrors" @submit="onSubmit" />
  </div>
</template>
