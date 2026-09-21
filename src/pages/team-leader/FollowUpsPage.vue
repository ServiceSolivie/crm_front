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
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'

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
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :title="t('teamLeader.followUpAlerts')" :subtitle="t('teamLeader.pendingFollowUps')" />

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
      <div v-if="store.loading.followUps" class="space-y-3">
        <AppSkeleton v-for="n in 5" :key="n" height="44px" />
      </div>
      <AppEmptyState v-else-if="store.followUps.items.length === 0" :icon="AlertCircle" :title="t('teamLeader.noAlerts')" />
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
