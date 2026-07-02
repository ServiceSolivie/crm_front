<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Upload } from 'lucide-vue-next'
import { useLeadImportsStore } from '@/stores/leadImports.store'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { LEAD_IMPORT_STATUS } from '@/utils/enums'
import { formatDateTime } from '@/utils/formatters'

const router = useRouter()
const store = useLeadImportsStore()
const { t } = useI18n()

const STATUS_VARIANT = {
  PENDING: 'neutral',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
}

const COLUMNS = computed(() => [
  { key: 'filename', label: t('imports.file') },
  { key: 'status', label: t('imports.status') },
  { key: 'total_rows', label: t('imports.rows'), align: 'center' },
  { key: 'imported_by', label: t('imports.importedBy'), align: 'center' },
  { key: 'created_at', label: t('imports.uploaded'), align: 'center' },
])

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => store.fetchList())
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('imports.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('imports.total') }}</p>
        </div>
        <AppButton size="sm" class="!bg-white !text-primary hover:!bg-indigo-50" @click="router.push({ name: 'lead-imports.create' })">
          <template #icon><Upload class="w-4 h-4" /></template>
          {{ t('imports.importCSV') }}
        </AppButton>
      </div>
    </div>

    <AppCard padding="none">
      <AppTable
        :columns="COLUMNS"
        :rows="store.list"
        :loading="store.loading.list"
        row-key="id"
        :empty-title="t('imports.noImports')"
        :empty-description="t('imports.noImportsDesc')"
        @row-click="(row) => store.fetchOne(row.id)"
      >
        <template #cell-filename="{ row }">
          <div class="flex items-center gap-2">
            <Upload class="w-4 h-4 text-gray-400 shrink-0" />
            <span class="text-sm font-medium text-gray-900 truncate">
              {{ row.file_name }}
            </span>
          </div>
        </template>

        <template #cell-status="{ value }">
          <AppBadge
            :variant="STATUS_VARIANT[value?.toUpperCase()] ?? 'neutral'"
            :label="t('statuses.import.' + (value?.toUpperCase() ?? ''), value)"
            dot
          />
        </template>

        <template #cell-total_rows="{ value }">
          <span class="text-sm text-gray-700 font-mono">{{ value ?? '—' }}</span>
        </template>

        <template #cell-imported_by="{ row }">
          <div v-if="row.imported_by" class="flex items-center justify-center gap-1.5">
            <AppAvatar :name="row.imported_by.name" size="xs" />
            <span class="text-sm text-gray-700">{{ row.imported_by.name }}</span>
          </div>
          <span v-else class="text-gray-400 text-sm">—</span>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-sm text-gray-500">{{ formatDateTime(value) }}</span>
        </template>
      </AppTable>

      <div class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          @page-change="store.setFilter('page', $event)"
        />
      </div>
    </AppCard>
  </div>
</template>
