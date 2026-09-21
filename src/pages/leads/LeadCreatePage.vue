<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useToast } from '@/composables/useToast'
import LeadForm from '@/components/modules/leads/LeadForm.vue'
import { firstErrorMessage } from '@/utils/errors'

const router = useRouter()
const leadsStore = useLeadsStore()
const toast = useToast()
const { t } = useI18n()

const formRef = ref(null)
const serverErrors = ref({})
const createAnother = ref(false)

async function onSubmit(payload) {
  serverErrors.value = {}
  try {
    const lead = await leadsStore.create(payload)
    toast.showSuccess(t('leads.createSuccess'))
    if (createAnother.value) {
      formRef.value?.reset()
      window.scrollTo({ top: 0 })
    } else {
      router.push({ name: 'leads.detail', params: { id: lead.id } })
    }
  } catch (e) {
    if (e?.errors) {
      serverErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    }
    toast.showError(firstErrorMessage(e, t('leadForm.errors.create')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <nav :aria-label="t('leadDetail.breadcrumb')" class="flex items-center gap-1.5 text-[13px] text-gray-500">
      <RouterLink :to="{ name: 'leads' }" class="text-gray-600 hover:text-gray-900">{{ t('leads.title') }}</RouterLink>
      <ChevronRight class="w-3.5 h-3.5" />
      <span class="text-gray-900">{{ t('leads.newLead') }}</span>
    </nav>

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('leads.newLead') }}</h1>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ t('leadForm.requiredHint') }}</p>
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
          :disabled="leadsStore.loading.form"
          class="h-9 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
        >{{ t('leadForm.create') }}</button>
      </div>
    </div>

    <LeadForm ref="formRef" mode="create" :server-errors="serverErrors" @submit="onSubmit">
      <template #aside>
        <section class="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex flex-col gap-2.5">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('leadForm.afterCreate') }}</h2>
          <label class="flex items-center gap-2.5 text-[13px] text-gray-900">
            <input v-model="createAnother" type="radio" :value="false" class="w-4 h-4 accent-primary">
            {{ t('leadForm.openLead') }}
          </label>
          <label class="flex items-center gap-2.5 text-[13px] text-gray-900">
            <input v-model="createAnother" type="radio" :value="true" class="w-4 h-4 accent-primary">
            {{ t('leadForm.createAnother') }}
          </label>
        </section>
      </template>
    </LeadForm>
  </div>
</template>
