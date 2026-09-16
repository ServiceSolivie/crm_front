<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Inbox, AlertTriangle, Clock, CheckCircle2, Timer, PhoneCall, ShieldAlert, ShieldCheck, Hourglass } from 'lucide-vue-next'
import { useGestionDashboardStore } from '@/stores/gestionDashboard.store'
import AppCard from '@/components/base/AppCard.vue'
import AppTable from '@/components/base/AppTable.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import KpiCard from '@/components/modules/dashboard/KpiCard.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'

const { t } = useI18n()
const router = useRouter()
const store = useGestionDashboardStore()

const stats = computed(() => store.stats)

const STUCK_COLUMNS = [
  { key: 'name', label: t('leads.name') },
  { key: 'phone', label: t('leads.phone') },
  { key: 'status', label: t('leads.status'), align: 'center' },
  { key: 'assigned_to', label: t('leads.assignedTo') },
]

onMounted(() => {
  store.fetchDashboard()
})
</script>

<template>
  <div class="space-y-5">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="relative z-10">
        <h1 class="text-2xl font-bold text-white">{{ t('gestion.dashboardTitle') }}</h1>
        <p class="text-sm text-indigo-200 mt-0.5">{{ t('gestion.dashboardSubtitle') }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        :title="t('gestion.backlog')"
        :value="stats?.backlog_count"
        :loading="store.loading"
        :icon="Inbox"
        accent="blue"
      />
      <KpiCard
        :title="t('gestion.stuck')"
        :value="stats?.stuck_count"
        :loading="store.loading"
        :icon="AlertTriangle"
        accent="amber"
      />
      <KpiCard
        :title="t('gestion.waitingOnAgent')"
        :value="stats?.waiting_on_agent_count"
        :loading="store.loading"
        :icon="Clock"
        accent="amber"
      />
      <KpiCard
        :title="t('gestion.validatedThisWeek')"
        :value="stats?.validated_this_week"
        :sub-value="stats?.avg_hours_in_gestion != null ? t('gestion.avgHours', { hours: stats.avg_hours_in_gestion }) : null"
        :loading="store.loading"
        :icon="CheckCircle2"
        accent="emerald"
      />
    </div>

    <div>
      <h2 class="text-sm font-semibold text-gray-700 mb-2">{{ t('gestion.checkpointsTitle') }}</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          :title="t('gestion.call2KoCount')"
          :value="stats?.call2_ko_count"
          :loading="store.loading"
          :icon="PhoneCall"
          accent="amber"
        />
        <KpiCard
          :title="t('gestion.awaitingPdgCount')"
          :value="stats?.awaiting_pdg_count"
          :loading="store.loading"
          :icon="Hourglass"
          accent="blue"
        />
        <KpiCard
          :title="t('gestion.pdgKoCount')"
          :value="stats?.pdg_ko_count"
          :loading="store.loading"
          :icon="ShieldAlert"
          accent="amber"
        />
        <KpiCard
          :title="t('gestion.pdgOkCount')"
          :value="stats?.pdg_ok_count"
          :loading="store.loading"
          :icon="ShieldCheck"
          accent="emerald"
        />
      </div>
    </div>

    <AppCard padding="none">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Timer class="w-4 h-4 text-warning" />
        <h2 class="text-sm font-semibold text-gray-900">{{ t('gestion.stuckLeadsTitle') }}</h2>
      </div>
      <AppTable
        class="cursor-pointer"
        :columns="STUCK_COLUMNS"
        :rows="stats?.stuck_leads ?? []"
        :loading="store.loading"
        row-key="id"
        :empty-title="t('gestion.noStuckLeads')"
        @row-click="(row) => router.push({ name: 'leads.detail', params: { id: row.id } })"
      >
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2.5 min-w-0">
            <AppAvatar :name="`${row.first_name ?? ''} ${row.last_name ?? ''}`" size="sm" class="shrink-0" />
            <p class="font-medium text-gray-900 text-sm truncate">
              {{ [row.first_name, row.last_name].filter(Boolean).join(' ') || '—' }}
            </p>
          </div>
        </template>
        <template #cell-status="{ row }">
          <LeadStatusBadge :status="row.status" />
        </template>
        <template #cell-assigned_to="{ row }">
          <span class="text-sm text-gray-700">{{ row.assigned_agent?.name ?? '—' }}</span>
        </template>
      </AppTable>
    </AppCard>
  </div>
</template>
