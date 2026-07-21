<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, UserCheck, RefreshCw } from 'lucide-vue-next'
import LeadStatusBadge from './LeadStatusBadge.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { formatDateTime } from '@/utils/formatters'

const { t } = useI18n()

const props = defineProps({
  statusHistory: { type: Array, default: () => [] },
  assignmentHistory: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const events = computed(() => {
  const status = props.statusHistory.map((e) => ({ ...e, _type: 'status' }))
  const assign = props.assignmentHistory.map((e) => ({ ...e, _type: 'assignment' }))
  return [...status, ...assign].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})
</script>

<template>
  <div class="relative">
    <template v-if="loading">
      <div v-for="n in 4" :key="n" class="flex gap-3 pb-6">
        <AppSkeleton width="32px" height="32px" class="rounded-full shrink-0" />
        <div class="flex-1 space-y-1.5 pt-1">
          <AppSkeleton height="12px" width="30%" />
          <AppSkeleton height="14px" width="60%" />
        </div>
      </div>
    </template>

    <div v-else class="space-y-0">
      <div
        v-for="(event, i) in events"
        :key="`${event._type}-${event.id}`"
        class="flex gap-3 pb-5 relative"
      >
        <!-- Connector line -->
        <div
          v-if="i < events.length - 1"
          class="absolute left-4 top-8 bottom-0 w-px bg-gray-200"
        />

        <!-- Icon -->
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10',
            event._type === 'status' ? 'bg-primary-light' : 'bg-success-bg',
          ]"
        >
          <RefreshCw v-if="event._type === 'status'" class="w-3.5 h-3.5 text-primary" />
          <UserCheck v-else class="w-3.5 h-3.5 text-success" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pt-0.5">
          <p class="text-xs text-gray-400">{{ formatDateTime(event.created_at) }}</p>

          <!-- Status change -->
          <template v-if="event._type === 'status'">
            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
              <template v-if="event.from_status">
                <LeadStatusBadge :status="event.from_status" />
                <ArrowRight class="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </template>
              <LeadStatusBadge :status="event.to_status" />
            </div>
            <p v-if="event.comment" class="text-xs text-gray-500 mt-1 italic">
              "{{ event.comment }}"
            </p>
          </template>

          <!-- Assignment change -->
          <template v-else>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm text-gray-700">{{ t('leads.history.assigned') }}</span>
              <AppAvatar :name="event.to_user?.name ?? '?'" size="xs" />
              <span class="text-sm font-medium text-gray-900">{{ event.to_user?.name ?? '—' }}</span>
            </div>
            <p v-if="event.from_user" class="text-xs text-gray-400 mt-0.5">
              {{ t('leads.history.previously') }} {{ event.from_user?.name }}
            </p>
          </template>

          <!-- Changed by -->
          <p class="text-xs text-gray-400 mt-1">
            {{ t('leads.history.by') }} {{ (event._type === 'status' ? event.changed_by?.name : event.assigned_by?.name) ?? t('leads.history.importSource') }}
          </p>
        </div>
      </div>

      <p v-if="events.length === 0" class="text-sm text-gray-400 text-center py-6">
        {{ t('leads.history.noHistory') }}
      </p>
    </div>
  </div>
</template>
