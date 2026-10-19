<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, EyeOff, ChevronRight } from 'lucide-vue-next'
import { dvcTypesApi } from '@/api/dvcTypes'
import { useToast } from '@/composables/useToast'
import { INSURANCE_TYPE } from '@/utils/enums'
import { formatDateTime } from '@/utils/formatters'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/**
 * DVC types (super admin): one per insurance type. Each insurance type shows
 * its DVC, or a link to create it.
 */
const { t } = useI18n()
const toast = useToast()

const types = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    types.value = (await dvcTypesApi.list()).data
  } catch {
    toast.showError(t('dvc.types.loadFailed'))
  } finally {
    loading.value = false
  }
})

const rows = computed(() =>
  Object.keys(INSURANCE_TYPE).map((insuranceType) => ({
    insuranceType,
    type: types.value.find((type) => type.insurance_type === insuranceType) ?? null,
  })),
)
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1100px] mx-auto">
    <AppPageHeader :eyebrow="t('nav.crmSettings')" :title="t('dvc.types.title')" :subtitle="t('dvc.types.subtitle')" />

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div v-if="loading" class="p-5 space-y-3">
        <AppSkeleton v-for="n in 5" :key="n" height="40px" />
      </div>

      <template v-else>
        <div
          v-for="row in rows"
          :key="row.insuranceType"
          class="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-b-0"
        >
          <p class="w-44 shrink-0 text-[13px] font-medium text-gray-900">{{ t('insuranceTypes.' + row.insuranceType) }}</p>

          <RouterLink
            v-if="row.type"
            :to="{ name: 'dvc-types.edit', params: { id: row.type.id } }"
            class="flex-1 min-w-0 flex items-center gap-3 rounded-lg -my-1.5 px-2 py-1.5 hover:bg-gray-50"
          >
            <span :class="['flex-1 min-w-0 truncate text-[13.5px]', row.type.is_active ? 'text-gray-900' : 'text-gray-400']">
              <EyeOff v-if="!row.type.is_active" class="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              {{ row.type.label }}
            </span>
            <span class="text-xs font-mono text-gray-600 shrink-0">v{{ row.type.current_version?.version }}</span>
            <span class="hidden md:inline text-xs text-gray-500 shrink-0 w-56 truncate text-right">
              {{ formatDateTime(row.type.current_version?.created_at) }}
              <template v-if="row.type.current_version?.created_by"> · {{ row.type.current_version.created_by.name }}</template>
            </span>
            <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
          </RouterLink>

          <template v-else>
            <span class="flex-1 text-[13px] text-gray-400">{{ t('dvc.types.none') }}</span>
            <RouterLink
              :to="{ name: 'dvc-types.create', query: { insurance_type: row.insuranceType } }"
              class="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-md text-[12.5px] font-medium text-primary hover:bg-primary-light"
            >
              <Plus class="w-3.5 h-3.5" />
              {{ t('dvc.types.create') }}
            </RouterLink>
          </template>
        </div>
      </template>
    </section>
  </div>
</template>
