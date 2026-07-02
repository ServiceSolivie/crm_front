<script setup>
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users, TrendingUp, CalendarCheck, Banknote } from 'lucide-vue-next'
import { useTeamLeaderStore } from '@/stores/teamLeader.store'
import { useAuthStore } from '@/stores/auth.store'
import { formatCurrency } from '@/utils/formatters'
import AppCard from '@/components/base/AppCard.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppProgressBar from '@/components/base/AppProgressBar.vue'

const { t } = useI18n()
const store = useTeamLeaderStore()
const auth = useAuthStore()

const teamName = computed(() => auth.user?.team?.name ?? '')

const maxLeads = computed(() => Math.max(...store.agents.map((a) => a.total_leads), 1))

onMounted(() => {
  store.fetchAgents()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Hero -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="relative z-10">
        <h1 class="text-2xl font-bold text-white">{{ t('teamLeader.agentPerformance') }}</h1>
        <p class="text-sm text-indigo-200 mt-0.5">{{ teamName }} — {{ store.agents.length }} {{ t('reports.agents') }}</p>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <AppCard padding="sm" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
          <Users class="w-5 h-5 text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ store.agents.reduce((s, a) => s + a.total_leads, 0) }}</p>
          <p class="text-xs text-gray-500">{{ t('teamLeader.activeLeads') }}</p>
        </div>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center shrink-0">
          <TrendingUp class="w-5 h-5 text-success" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ store.agents.reduce((s, a) => s + a.validated_leads, 0) }}</p>
          <p class="text-xs text-gray-500">{{ t('teamLeader.validatedLeads') }}</p>
        </div>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-info-bg flex items-center justify-center shrink-0">
          <CalendarCheck class="w-5 h-5 text-info" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ store.agents.reduce((s, a) => s + a.completed_appointments, 0) }}</p>
          <p class="text-xs text-gray-500">{{ t('teamLeader.completedAppts') }}</p>
        </div>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-warning-bg flex items-center justify-center shrink-0">
          <Banknote class="w-5 h-5 text-warning" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(store.agents.reduce((s, a) => s + a.total_revenue, 0)) }}</p>
          <p class="text-xs text-gray-500">{{ t('teamLeader.revenue') }}</p>
        </div>
      </AppCard>
    </div>

    <!-- Agent cards -->
    <AppCard>
      <AppSkeleton v-if="store.loading.agents" :rows="4" />
      <div v-else-if="store.agents.length === 0" class="py-12 text-center text-gray-400">
        {{ t('teamLeader.noAgents') }}
      </div>
      <div v-else class="divide-y divide-gray-100">
        <!-- Header -->
        <div class="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <div class="col-span-3">{{ t('users.name') }}</div>
          <div class="col-span-1 text-center">{{ t('teamLeader.activeLeads') }}</div>
          <div class="col-span-1 text-center">{{ t('teamLeader.validatedLeads') }}</div>
          <div class="col-span-2">{{ t('teamLeader.conversionRate') }}</div>
          <div class="col-span-1 text-center">{{ t('teamLeader.scheduledAppts') }}</div>
          <div class="col-span-1 text-center">{{ t('teamLeader.completedAppts') }}</div>
          <div class="col-span-3 text-right">{{ t('teamLeader.revenue') }}</div>
        </div>
        <!-- Rows -->
        <div
          v-for="agent in store.agents"
          :key="agent.id"
          class="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors"
        >
          <!-- Name -->
          <div class="col-span-3 flex items-center gap-2.5">
            <AppAvatar :name="agent.name" size="sm" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ agent.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ agent.email }}</p>
            </div>
          </div>
          <!-- Active leads -->
          <div class="col-span-1 text-center">
            <span class="text-sm font-semibold text-gray-700">{{ agent.active_leads }}</span>
          </div>
          <!-- Validated -->
          <div class="col-span-1 text-center">
            <AppBadge :label="String(agent.validated_leads)" variant="success" />
          </div>
          <!-- Conversion -->
          <div class="col-span-2 flex items-center gap-2">
            <AppProgressBar :value="agent.conversion_rate" :max="100" class="flex-1" />
            <span class="text-xs font-semibold text-gray-600 w-10 text-right">{{ agent.conversion_rate }}%</span>
          </div>
          <!-- Scheduled -->
          <div class="col-span-1 text-center">
            <span class="text-sm text-gray-600">{{ agent.scheduled_appointments }}</span>
          </div>
          <!-- Completed -->
          <div class="col-span-1 text-center">
            <span class="text-sm text-gray-600">{{ agent.completed_appointments }}</span>
          </div>
          <!-- Revenue -->
          <div class="col-span-3 text-right">
            <span class="text-sm font-semibold text-gray-900">{{ formatCurrency(agent.total_revenue) }}</span>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
