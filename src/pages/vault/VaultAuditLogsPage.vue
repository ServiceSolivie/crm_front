<script setup>
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ScrollText, User, KeyRound } from 'lucide-vue-next'
import { useVaultAuditLogsStore } from '@/stores/vaultAuditLogs.store'
import AppCard from '@/components/base/AppCard.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppPagination from '@/components/base/AppPagination.vue'

const { t } = useI18n()
const store = useVaultAuditLogsStore()

const columns = computed(() => [
  { key: 'created_at', label: t('vault.auditLogs.date'), width: '18%' },
  { key: 'user', label: t('vault.auditLogs.user'), width: '20%' },
  { key: 'action', label: t('vault.auditLogs.action'), width: '12%', align: 'center' },
  { key: 'credential', label: t('vault.credentials.label'), width: '20%' },
  { key: 'domain', label: t('vault.auditLogs.domain'), width: '15%' },
  { key: 'ip_address', label: t('vault.auditLogs.ip'), width: '15%' },
])

const actionOptions = [
  { label: t('vault.auditLogs.allActions'), value: '' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
  { label: 'Fill', value: 'fill' },
]

const actionVariant = (action) => {
  if (action === 'login') return 'info'
  if (action === 'fill') return 'success'
  if (action === 'logout') return 'warning'
  return 'neutral'
}

onMounted(() => store.fetchList(true))

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10">
        <h1 class="text-2xl font-bold text-white">{{ t('vault.auditLogs.title') }}</h1>
        <p class="text-sm text-indigo-200 mt-0.5">{{ store.meta.total }} {{ t('vault.auditLogs.total') }}</p>
      </div>
    </div>

    <!-- Filters -->
    <AppCard padding="sm">
      <div class="flex flex-wrap gap-3">
        <div class="w-40">
          <AppSelect
            :model-value="store.filters.action"
            :options="actionOptions"
            @update:model-value="store.setFilter('action', $event)"
          />
        </div>
        <div class="w-40">
          <AppInput
            :model-value="store.filters.from"
            type="date"
            :placeholder="t('vault.auditLogs.from')"
            @update:model-value="store.setFilter('from', $event)"
          />
        </div>
        <div class="w-40">
          <AppInput
            :model-value="store.filters.to"
            type="date"
            :placeholder="t('vault.auditLogs.to')"
            @update:model-value="store.setFilter('to', $event)"
          />
        </div>
      </div>
    </AppCard>

    <!-- Table -->
    <AppCard padding="none">
      <AppTable
        :columns="columns"
        :rows="store.list"
        :loading="store.loading.list"
        :empty-title="t('vault.auditLogs.empty')"
      >
        <template #cell-created_at="{ row }">
          <span class="text-xs text-gray-600">{{ formatDate(row.created_at) }}</span>
        </template>
        <template #cell-user="{ row }">
          <div class="flex items-center gap-2">
            <User class="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{{ row.user?.name ?? '—' }}</span>
          </div>
        </template>
        <template #cell-action="{ row }">
          <AppBadge :variant="actionVariant(row.action)" >
            {{ row.action }}
          </AppBadge>
        </template>
        <template #cell-credential="{ row }">
          <div class="flex items-center gap-2">
            <KeyRound class="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{{ row.credential?.label ?? '—' }}</span>
          </div>
        </template>
        <template #cell-domain="{ row }">
          <span class="text-xs text-gray-500">{{ row.domain ?? '—' }}</span>
        </template>
        <template #cell-ip_address="{ row }">
          <span class="text-xs font-mono text-gray-500">{{ row.ip_address ?? '—' }}</span>
        </template>
      </AppTable>
    </AppCard>

    <!-- Pagination -->
    <AppPagination
      v-if="store.meta.last_page > 1"
      :current-page="store.meta.current_page"
      :last-page="store.meta.last_page"
      :total="store.meta.total"
      @page-change="store.setFilter('page', $event)"
    />
  </div>
</template>
