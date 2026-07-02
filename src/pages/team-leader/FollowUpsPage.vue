<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Clock, ArrowRight } from 'lucide-vue-next'
import { useTeamLeaderStore } from '@/stores/teamLeader.store'
import AppCard from '@/components/base/AppCard.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'

const { t } = useI18n()
const router = useRouter()
const store = useTeamLeaderStore()

const urgencyVariant = { overdue: 'danger', warning: 'warning', due_today: 'info', on_track: 'success' }
const urgencyLabel = (u) =>
  ({ overdue: t('teamLeader.overdue'), warning: t('teamLeader.warning'), due_today: t('teamLeader.dueToday'), on_track: t('teamLeader.onTrack') })[u] ?? u

onMounted(() => {
  store.fetchFollowUps()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Hero -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="relative z-10">
        <h1 class="text-2xl font-bold text-white">{{ t('teamLeader.followUpAlerts') }}</h1>
        <p class="text-sm text-orange-100 mt-0.5">{{ t('teamLeader.pendingFollowUps') }}</p>
      </div>
    </div>

    <!-- Summary badges -->
    <div class="flex flex-wrap gap-3">
      <AppCard padding="sm" class="flex items-center gap-2 px-4 py-2">
        <div class="w-2.5 h-2.5 rounded-full bg-danger" />
        <span class="text-sm font-semibold text-gray-700">{{ store.followUps.summary.overdue }}</span>
        <span class="text-xs text-gray-500">{{ t('teamLeader.overdue') }}</span>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-2 px-4 py-2">
        <div class="w-2.5 h-2.5 rounded-full bg-warning" />
        <span class="text-sm font-semibold text-gray-700">{{ store.followUps.summary.warning }}</span>
        <span class="text-xs text-gray-500">{{ t('teamLeader.warning') }}</span>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-2 px-4 py-2">
        <div class="w-2.5 h-2.5 rounded-full bg-info" />
        <span class="text-sm font-semibold text-gray-700">{{ store.followUps.summary.due_today }}</span>
        <span class="text-xs text-gray-500">{{ t('teamLeader.dueToday') }}</span>
      </AppCard>
    </div>

    <!-- Follow-up list -->
    <AppCard>
      <AppSkeleton v-if="store.loading.followUps" :rows="5" />
      <div v-else-if="store.followUps.items.length === 0" class="py-12 text-center">
        <AlertCircle class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-400">{{ t('teamLeader.noAlerts') }}</p>
      </div>
      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="item in store.followUps.items"
          :key="item.id"
          class="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
          @click="router.push({ name: 'leads.detail', params: { id: item.id } })"
        >
          <!-- Urgency indicator -->
          <div class="shrink-0">
            <AppBadge :variant="urgencyVariant[item.urgency]" :label="urgencyLabel(item.urgency)" dot />
          </div>

          <!-- Lead info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900 truncate">{{ item.name || item.reference }}</p>
              <LeadStatusBadge :status="item.status" />
            </div>
            <p v-if="item.reason" class="text-xs text-gray-500 mt-0.5">{{ item.reason }}</p>
          </div>

          <!-- Agent -->
          <div v-if="item.assigned_agent" class="hidden sm:flex items-center gap-1.5 shrink-0">
            <AppAvatar :name="item.assigned_agent.name" size="xs" />
            <span class="text-xs text-gray-500 truncate max-w-[80px]">{{ item.assigned_agent.name }}</span>
          </div>

          <!-- Idle time -->
          <div class="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Clock class="w-3.5 h-3.5" />
            <span>{{ t('teamLeader.hoursIdle', { hours: item.hours_idle }) }}</span>
          </div>

          <ArrowRight class="w-4 h-4 text-gray-300 shrink-0" />
        </div>
      </div>
    </AppCard>
  </div>
</template>
