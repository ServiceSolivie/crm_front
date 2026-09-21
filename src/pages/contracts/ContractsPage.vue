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
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
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
  const ok = await ui.confirm(t('contracts.deleteTitle'), t('contracts.deleteConfirm', { reference: row.reference }), { confirmLabel: t('common.delete') })
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
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('contracts.title')" :count="store.meta.total">
      <template #actions>
        <AppButton v-if="auth.can('CONTRACTS_GENERATE')" @click="router.push({ name: 'contracts.create' })">
          <template #icon><Plus class="w-4 h-4" /></template>
          {{ t('contracts.newContract') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex flex-wrap items-center gap-2">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('contracts.searchPlaceholder')"
        class="w-full sm:w-[300px]"
        @update:model-value="store.setFilter('search', $event)"
      />
      <AppFilterChip
        v-if="store.templates.length"
        :label="t('contracts.template')"
        :model-value="store.filters.template_key"
        :options="store.templates.map((tpl) => ({ value: tpl.key, label: tpl.label }))"
        :searchable="false"
        @update:model-value="store.setFilter('template_key', $event)"
      />
    </div>

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
            <span class="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
              <FileText class="w-4 h-4" />
            </span>
            <span class="font-mono text-[12.5px] font-medium text-gray-900 whitespace-nowrap">{{ row.reference }}</span>
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
          <span class="text-xs font-medium text-gray-700 bg-gray-100 px-2 leading-5 rounded whitespace-nowrap">
            {{ templateLabel(value) }}
          </span>
        </template>

        <template #cell-version="{ value }">
          <span class="font-mono text-[12.5px] text-gray-700">v{{ value }}</span>
        </template>

        <template #cell-generated_by="{ row }">
          <div v-if="row.generated_by" class="flex items-center gap-1.5">
            <AppAvatar :name="row.generated_by.name" size="xs" />
            <span class="text-sm text-gray-700 truncate max-w-[120px]">{{ row.generated_by.name }}</span>
          </div>
        </template>

        <template #cell-created_at="{ value }">
          <span class="font-mono text-[12.5px] text-gray-600 whitespace-nowrap">{{ formatDateTime(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              :title="t('contracts.preview')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
              @click="onPreview(row)"
            >
              <Eye class="w-3.5 h-3.5" />
            </button>
            <button
              :title="t('common.download')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
              @click="onDownload(row)"
            >
              <Download class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="auth.can('CONTRACTS_DELETE')"
              :title="t('common.delete')"
              class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
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
