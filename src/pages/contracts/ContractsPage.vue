<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, FileText, Download, Eye, Trash2 } from 'lucide-vue-next'
import { useContractsStore } from '@/stores/contracts.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import DocumentPreviewModal from '@/components/modules/documents/DocumentPreviewModal.vue'
import { formatDateTime } from '@/utils/formatters'

const router = useRouter()
const { t } = useI18n()
const store = useContractsStore()
const auth = useAuthStore()
const ui = useUiStore()
const toast = useToast()

const previewContract = ref(null)
const previewBlobUrl = ref(null)
const previewLoading = ref(false)

const COLUMNS = computed(() => [
  { key: 'reference', label: t('contracts.reference') },
  { key: 'client_name', label: t('contracts.client') },
  { key: 'template_key', label: t('contracts.template'), align: 'center' },
  { key: 'version', label: t('contracts.version'), align: 'center' },
  { key: 'generated_by', label: t('contracts.generatedBy') },
  { key: 'created_at', label: t('leads.createdAt') },
  { key: 'actions', label: '', align: 'right', width: '120px' },
])

const templateLabel = computed(() => {
  const map = Object.fromEntries(store.templates.map((tpl) => [tpl.key, tpl.label]))
  return (key) => map[key] ?? key
})

const from = computed(() =>
  store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1,
)
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

onMounted(() => {
  store.fetchList()
  store.fetchTemplates().catch(() => {})
})

async function onPreview(row) {
  previewContract.value = {
    original_filename: row.original_filename,
    mime_type: 'application/pdf',
    type_label: row.reference,
  }
  previewLoading.value = true
  previewBlobUrl.value = null
  try {
    previewBlobUrl.value = URL.createObjectURL(await store.downloadBlob(row.id))
  } catch (e) {
    toast.showError(e?.message ?? t('contracts.loadFailed'))
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  if (previewBlobUrl.value) URL.revokeObjectURL(previewBlobUrl.value)
  previewContract.value = null
  previewBlobUrl.value = null
}

function downloadFromPreview() {
  if (!previewBlobUrl.value || !previewContract.value) return
  const link = document.createElement('a')
  link.href = previewBlobUrl.value
  link.setAttribute('download', previewContract.value.original_filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function onDownload(row) {
  try {
    await store.download(row.id, row.original_filename)
  } catch (e) {
    toast.showError(e?.message ?? t('contracts.loadFailed'))
  }
}

async function onDelete(row) {
  const ok = await ui.confirm(t('contracts.deleteTitle'), t('contracts.deleteConfirm', { reference: row.reference }))
  if (!ok) return
  try {
    await store.remove(row.id)
    toast.showSuccess(t('contracts.deleted'))
  } catch (e) {
    toast.showError(e?.message ?? t('contracts.loadFailed'))
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('contracts.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('contracts.total') }}</p>
        </div>
        <AppButton
          v-if="auth.can('CONTRACTS_GENERATE')"
          size="sm"
          class="!bg-white !text-primary hover:!bg-indigo-50"
          @click="router.push({ name: 'contracts.create' })"
        >
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('contracts.newContract') }}
        </AppButton>
      </div>
    </div>

    <!-- Search -->
    <AppCard padding="sm">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('contracts.searchPlaceholder')"
        @update:model-value="store.setFilter('search', $event)"
      />
    </AppCard>

    <!-- Table -->
    <AppCard padding="none">
      <AppTable
        :columns="COLUMNS"
        :rows="store.list"
        :loading="store.loading.list"
        row-key="id"
        :empty-title="t('contracts.noContracts')"
        :empty-description="t('contracts.noContractsDesc')"
      >
        <template #cell-reference="{ row }">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
              <FileText class="w-4 h-4 text-primary" />
            </div>
            <span class="text-sm font-medium text-gray-900 whitespace-nowrap">{{ row.reference }}</span>
          </div>
        </template>

        <template #cell-client_name="{ row }">
          <div class="min-w-0">
            <p class="text-sm text-gray-900 truncate">{{ row.client_name }}</p>
            <router-link
              v-if="row.lead"
              :to="{ name: 'leads.detail', params: { id: row.lead.id } }"
              class="text-xs text-primary hover:underline"
              @click.stop
            >
              {{ row.lead.reference }}
            </router-link>
          </div>
        </template>

        <template #cell-template_key="{ value }">
          <span class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
            {{ templateLabel(value) }}
          </span>
        </template>

        <template #cell-version="{ value }">
          <span class="text-sm font-medium text-gray-700">v{{ value }}</span>
        </template>

        <template #cell-generated_by="{ row }">
          <div v-if="row.generated_by" class="flex items-center gap-1.5">
            <AppAvatar :name="row.generated_by.name" size="xs" />
            <span class="text-sm text-gray-700 truncate max-w-[120px]">{{ row.generated_by.name }}</span>
          </div>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDateTime(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              :title="t('contracts.preview')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="onPreview(row)"
            >
              <Eye class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.download')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="onDownload(row)"
            >
              <Download class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="auth.can('CONTRACTS_DELETE')"
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
              @click="onDelete(row)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </AppTable>

      <div v-if="store.meta.last_page > 1" class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          @page-change="store.setFilter('page', $event)"
          @per-page-change="store.setFilter('per_page', $event)"
        />
      </div>
    </AppCard>

    <!-- Preview -->
    <DocumentPreviewModal
      :open="!!previewContract"
      :document="previewContract"
      :blob-url="previewBlobUrl"
      :loading="previewLoading"
      @close="closePreview"
      @download="downloadFromPreview"
    />
  </div>
</template>
