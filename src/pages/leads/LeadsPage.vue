<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, Filter, X, UserCircle, Pencil, Trash2 } from 'lucide-vue-next'
import { useLeadsStore } from '@/stores/leads.store'
import { useLeadSourcesStore } from '@/stores/leadSources.store'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import RevenuePromptModal from '@/components/modules/payments/RevenuePromptModal.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadStatusDropdown from '@/components/modules/leads/LeadStatusDropdown.vue'
import { LEAD_STATUS, INSURANCE_TYPE } from '@/utils/enums'
import { useEnumOptions } from '@/composables/useEnumOptions'
import { formatDate } from '@/utils/formatters'

const router = useRouter()
const leadsStore = useLeadsStore()
const sourcesStore = useLeadSourcesStore()
const ui = useUiStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const showFilters = ref(false)
const statusChangingId = ref(null)
const showRevenuePrompt = ref(false)
const pendingValidateLead = ref(null)

const COLUMNS = computed(() => [
  { key: 'name', label: t('leads.name'), sortable: true },
  { key: 'phone', label: t('leads.phone') },
  { key: 'insurance_type', label: t('leads.insuranceType') },
  { key: 'status', label: t('leads.status') },
  { key: 'source', label: t('leads.source') },
  { key: 'assigned_to', label: t('leads.assignedTo') },
  { key: 'created_at', label: t('leads.createdAt'), sortable: true },
  { key: 'actions', label: '', align: 'right', width: '100px' },
])

const sourceOptions = computed(() => [
  { value: '', label: t('leads.allSources') },
  ...sourcesStore.list.map((s) => ({ value: s.id, label: s.name })),
])

const leadStatusOptions = useEnumOptions(LEAD_STATUS, 'statuses.lead')
const insuranceTypeOptions = useEnumOptions(INSURANCE_TYPE, 'insuranceTypes')
const statusOptions = computed(() => [{ value: '', label: t('leads.allStatuses') }, ...leadStatusOptions.value])
const insuranceOptions = computed(() => [{ value: '', label: t('leads.allTypes') }, ...insuranceTypeOptions.value])

onMounted(() => {
  leadsStore.fetchList()
  sourcesStore.fetchList()
})

function onSort({ key, dir }) {
  leadsStore.filters.sort_by = key
  leadsStore.filters.sort_dir = dir
  leadsStore.fetchList()
}

function onStatusChange(lead, status) {
  if (status === 'VALIDE' && lead.status !== 'VALIDE') {
    pendingValidateLead.value = lead
    showRevenuePrompt.value = true
    return
  }
  doStatusChange(lead, { status })
}

async function onRevenueConfirm(expectedRevenue) {
  const lead = pendingValidateLead.value
  await doStatusChange(lead, { status: 'VALIDE', expected_revenue: expectedRevenue })
  showRevenuePrompt.value = false
  pendingValidateLead.value = null
}

async function doStatusChange(lead, payload) {
  statusChangingId.value = lead.id
  try {
    await leadsStore.updateStatus(lead.id, payload)
    toast.showSuccess(t('leads.statusUpdated'))
  } catch (e) {
    toast.showError(e?.message ?? 'Échec de la mise à jour du statut')
  } finally {
    statusChangingId.value = null
  }
}

async function handleDelete(row) {
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ')
  const ok = await ui.confirm(t('leads.deleteTitle'), `Delete "${fullName}"? This cannot be undone.`)
  if (!ok) return
  try {
    await leadsStore.remove(row.id)
    toast.showSuccess(t('leads.deleteSuccess'))
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to delete lead')
  }
}

const from = computed(() =>
  leadsStore.meta.total === 0
    ? 0
    : (leadsStore.meta.current_page - 1) * leadsStore.meta.per_page + 1,
)
const to = computed(() =>
  Math.min(leadsStore.meta.current_page * leadsStore.meta.per_page, leadsStore.meta.total),
)
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <!-- decorative circles -->
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('leads.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">{{ leadsStore.meta.total }} {{ t('leads.total') }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <AppButton variant="secondary" size="sm" @click="showFilters = !showFilters">
            <template #icon><Filter class="w-4 h-4" /></template>
            {{ t('common.filter') }}
            <span
              v-if="leadsStore.activeFiltersCount"
              class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold"
            >{{ leadsStore.activeFiltersCount }}</span>
          </AppButton>
          <AppButton
            v-if="auth.can('LEADS_CREATE')"
            size="sm"
            class="!bg-white !text-primary hover:!bg-indigo-50"
            @click="router.push({ name: 'leads.create' })"
          >
            <template #icon><Plus class="w-4 h-4" /></template>
            {{ t('leads.newLead') }}
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Search + Filters card -->
    <AppCard padding="sm" class="space-y-3">
      <AppSearchInput
        :model-value="leadsStore.filters.search"
        placeholder="Search name, phone, email…"
        @update:model-value="leadsStore.setFilter('search', $event)"
      />
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showFilters" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AppSelect
            :model-value="leadsStore.filters.status"
            :options="statusOptions"
            @update:model-value="leadsStore.setFilter('status', $event)"
          />
          <AppSelect
            :model-value="leadsStore.filters.insurance_type"
            :options="insuranceOptions"
            @update:model-value="leadsStore.setFilter('insurance_type', $event)"
          />
          <AppSelect
            :model-value="leadsStore.filters.source_id"
            :options="sourceOptions"
            @update:model-value="leadsStore.setFilter('source_id', $event)"
          />
          <div class="flex items-end">
            <AppButton
              v-if="leadsStore.activeFiltersCount"
              variant="danger"
              size="sm"
              class="w-full"
              @click="leadsStore.resetFilters()"
            >
              <template #icon><X class="w-3.5 h-3.5" /></template>
              Clear
            </AppButton>
          </div>
        </div>
      </Transition>
    </AppCard>

    <!-- Table card -->
    <AppCard padding="none">
      <AppTable
        class="cursor-pointer"
        :columns="COLUMNS"
        :rows="leadsStore.list"
        :loading="leadsStore.loading.list"
        :sort-key="leadsStore.filters.sort_by"
        :sort-dir="leadsStore.filters.sort_dir"
        row-key="id"
        :empty-title="t('leads.noLeads')"
        :empty-description="t('leads.noLeadsDesc')"
        @sort="onSort"
        @row-click="(row) => router.push({ name: 'leads.detail', params: { id: row.id } })"
      >
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2.5 min-w-0 max-w-[220px]">
            <AppAvatar :name="`${row.first_name ?? ''} ${row.last_name ?? ''}`" size="sm" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-gray-900 text-sm truncate leading-tight">
                {{ [row.first_name, row.last_name].filter(Boolean).join(' ') || '—' }}
              </p>
              <p v-if="row.email" class="text-xs text-gray-400 truncate">{{ row.email }}</p>
            </div>
          </div>
        </template>

        <template #cell-insurance_type="{ value }">
          <span class="text-xs font-medium text-gray-600 whitespace-nowrap">
            {{ value?.replace(/_/g, ' ') ?? '—' }}
          </span>
        </template>

        <template #cell-status="{ row }">
          <div @click.stop>
            <LeadStatusDropdown
              :status="row.status"
              :loading="statusChangingId === row.id"
              @change="(s) => onStatusChange(row, s)"
            />
          </div>
        </template>

        <template #cell-source="{ row }">
          <span class="text-sm text-gray-600">{{ row.lead_source?.name ?? '—' }}</span>
        </template>

        <template #cell-assigned_to="{ row }">
          <div v-if="row.assigned_agent" class="flex items-center gap-1.5">
            <AppAvatar :name="row.assigned_agent.name" size="xs" />
            <span class="text-sm text-gray-700 truncate max-w-[100px]">{{ row.assigned_agent.name }}</span>
          </div>
          <div v-else class="flex items-center gap-1 text-gray-400">
            <UserCircle class="w-4 h-4" />
            <span class="text-xs">{{ t('common.unassigned') }}</span>
          </div>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDate(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1" @click.stop>
            <button
              v-if="auth.can('LEADS_UPDATE')"
              :title="t('common.edit')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
              @click="router.push({ name: 'leads.edit', params: { id: row.id } })"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="auth.can('LEADS_DELETE')"
              :title="t('common.delete')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </AppTable>

      <div class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="leadsStore.meta.current_page"
          :last-page="leadsStore.meta.last_page"
          :total="leadsStore.meta.total"
          :from="from"
          :to="to"
          :per-page="leadsStore.meta.per_page"
          @page-change="leadsStore.setFilter('page', $event)"
          @per-page-change="leadsStore.setFilter('per_page', $event)"
        />
      </div>
    </AppCard>

    <!-- Revenue prompt modal -->
    <RevenuePromptModal
      :open="showRevenuePrompt"
      :loading="statusChangingId !== null"
      @close="showRevenuePrompt = false; pendingValidateLead = null"
      @confirm="onRevenueConfirm"
    />
  </div>
</template>
