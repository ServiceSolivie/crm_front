<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ExternalLink } from 'lucide-vue-next'
import AppSpinner from '@/components/base/AppSpinner.vue'
import { ACTOR_ICON, LEVEL_DOT, detailRows } from '@/utils/activityJournal'
import { formatShortDate, formatTime } from '@/utils/formatters'

/**
 * The logs of one opened operation, oldest first: when, how it went, what
 * happened, who did it. Click a log for its details (amount, bank code and
 * message, identifiers, answer time, address…).
 */
const props = defineProps({
  operation: { type: Object, required: true },
  // { loading, error, logs } from the store
  state: { type: Object, required: true },
})
const emit = defineEmits(['retry'])
const { t, te } = useI18n()

const selected = ref(null)

const dayOf = (iso) => (iso ? new Date(iso).toDateString() : '')
// The date is printed on the first log and each time the day changes
const showsDate = (index) => index === 0 || dayOf(props.state.logs[index].created_at) !== dayOf(props.state.logs[index - 1].created_at)

// The API sends the French name of the event; other languages translate its code
const eventLabel = (log) => (te(`activity.events.${log.event}`) ? t(`activity.events.${log.event}`) : log.event_label)
const actorName = (log) => log.actor?.name || (log.actor?.type === 'user' ? t('activity.actors.unknown') : t(`activity.actors.${log.actor?.type ?? 'system'}`))
const detailLabel = (key) => (te(`activity.details.${key}`) ? t(`activity.details.${key}`) : key)
</script>

<template>
  <div class="bg-gray-50 border-t border-gray-100 py-2">
    <p v-if="operation.lead" class="px-4 pl-[76px] pb-1.5 text-[12px] text-gray-500">
      {{ t('activity.lead') }}
      <router-link
        :to="{ name: 'leads.detail', params: { id: operation.lead.id } }"
        class="inline-flex items-center gap-1 text-primary hover:underline"
      >{{ operation.lead.name || operation.lead.reference }} · {{ operation.lead.reference }}<ExternalLink class="w-3 h-3" /></router-link>
    </p>

    <div v-if="state.loading && !state.logs.length" class="flex items-center gap-2 px-4 pl-[76px] py-2 text-[13px] text-gray-500">
      <AppSpinner :size="14" />{{ t('common.loading') }}
    </div>
    <p v-else-if="state.error" class="px-4 pl-[76px] py-2 text-[13px] text-danger-text">
      {{ t('activity.logsError') }}
      <button type="button" class="underline" @click="emit('retry')">{{ t('common.retry') }}</button>
    </p>

    <ol v-else>
      <li v-for="(log, index) in state.logs" :key="log.id">
        <!-- The day, on its own line, each time it changes -->
        <p v-if="showsDate(index)" class="px-4 pb-0.5 font-mono text-[11px] leading-4 text-gray-400" :class="index > 0 ? 'pt-2' : 'pt-0.5'">
          <span class="inline-block w-[60px] text-right">{{ formatShortDate(log.created_at) }}</span>
        </p>
        <button
          type="button"
          class="w-full grid grid-cols-[60px_10px_minmax(0,1fr)_auto] items-start gap-2.5 px-4 py-1.5 text-left hover:bg-white focus-visible:outline-none focus-visible:bg-white"
          :aria-expanded="selected === log.id"
          @click="selected = selected === log.id ? null : log.id"
        >
          <!-- Every cell starts on the same 20px line: time, dot, text and actor line up -->
          <span class="font-mono text-[11.5px] leading-5 text-gray-500 text-right">{{ formatTime(log.created_at) }}</span>
          <span class="w-2 h-2 rounded-full mt-1.5" :class="LEVEL_DOT[log.level] ?? 'bg-gray-400'" />
          <span class="min-w-0 text-[13px] leading-5">
            <span class="font-medium text-gray-900">{{ eventLabel(log) }}</span>
            <span v-if="log.message" class="text-gray-600"> · {{ log.message }}</span>
          </span>
          <span class="h-5 flex items-center gap-1.5 text-[11.5px] text-gray-500 whitespace-nowrap">
            <component :is="ACTOR_ICON[log.actor?.type] ?? ACTOR_ICON.system" class="w-3 h-3" />
            <span class="max-w-[140px] truncate">{{ actorName(log) }}</span>
            <ChevronDown class="w-3 h-3 text-gray-400 transition-transform" :class="selected === log.id ? 'rotate-180' : ''" />
          </span>
        </button>

        <dl
          v-if="selected === log.id"
          class="ml-[96px] mr-4 mb-2 rounded-lg border border-gray-200 bg-white px-3 py-2 grid grid-cols-[minmax(110px,max-content)_minmax(0,1fr)] gap-x-4 gap-y-1 text-[12.5px]"
        >
          <template v-for="row in detailRows(log.properties)" :key="row.key">
            <dt class="text-gray-500">{{ detailLabel(row.key) }}</dt>
            <dd class="font-mono text-gray-900 break-all">{{ row.value }}</dd>
          </template>
          <template v-if="log.ip_address">
            <dt class="text-gray-500">{{ t('activity.details.ip_address') }}</dt>
            <dd class="font-mono text-gray-900">{{ log.ip_address }}</dd>
          </template>
          <template v-if="log.user_agent">
            <dt class="text-gray-500">{{ t('activity.details.user_agent') }}</dt>
            <dd class="text-gray-700 break-words">{{ log.user_agent }}</dd>
          </template>
          <template v-if="!detailRows(log.properties).length && !log.ip_address">
            <dt class="col-span-2 text-gray-500">{{ t('activity.noDetails') }}</dt>
          </template>
        </dl>
      </li>
    </ol>
  </div>
</template>
