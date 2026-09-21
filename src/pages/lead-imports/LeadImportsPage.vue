<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Upload, RefreshCw } from 'lucide-vue-next'
import { useLeadImportsStore } from '@/stores/leadImports.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { firstErrorMessage } from '@/utils/errors'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { formatDateTime } from '@/utils/formatters'
import AppPageHeader from '@/components/base/AppPageHeader.vue'

const router = useRouter()
const store = useLeadImportsStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

async function onSyncGoogleSheets() {
  try {
    const results = await store.syncFromGoogleSheets()
    const summary = Object.entries(results)
      .map(([sheet, s]) => `${sheet}: +${s.imported} (${s.skipped} skipped)`)
      .join(' · ')
    toast.showSuccess(summary)
  } catch (e) {
    toast.showError(firstErrorMessage(e, 'Failed to sync from Google Sheets'))
  }
}

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
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('imports.title')">
      <template #meta>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ store.meta.total }} {{ t('imports.total') }}</p>
      </template>
      <template #actions>
        <div class="flex items-center gap-2">
          <AppButton
            v-if="auth.hasRole('super_admin')"
            variant="secondary"
            :loading="store.loading.syncingSheets"
            @click="onSyncGoogleSheets"
          >
            <template #icon><RefreshCw class="w-4 h-4" /></template>
            {{ t('imports.syncGoogleSheets') }}
          </AppButton>
          <AppButton @click="router.push({ name: 'lead-imports.create' })">
            <template #icon><Upload class="w-4 h-4" /></template>
            {{ t('imports.importCSV') }}
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

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
