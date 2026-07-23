<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Phone, PhoneCall, PhoneOff, Voicemail, ThumbsUp, ThumbsDown, MoreHorizontal } from 'lucide-vue-next'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { formatRelative } from '@/utils/formatters'

const props = defineProps({
  calls: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['log-call'])

const { t } = useI18n()

const outcome = ref('')
const note = ref('')

// Each outcome maps to a semantic variant + icon so the log form and the
// history entries stay colour-consistent.
const OUTCOMES = [
  { value: 'no_answer', variant: 'warning', icon: PhoneOff },
  { value: 'voicemail', variant: 'info', icon: Voicemail },
  { value: 'interested', variant: 'success', icon: ThumbsUp },
  { value: 'not_interested', variant: 'danger', icon: ThumbsDown },
  { value: 'other', variant: 'neutral', icon: MoreHorizontal },
]

const OUTCOME_MAP = Object.fromEntries(OUTCOMES.map((o) => [o.value, o]))

const chipClasses = {
  warning: 'border-warning text-warning bg-warning-bg',
  info: 'border-info text-info bg-info-bg',
  success: 'border-success text-success bg-success-bg',
  danger: 'border-danger text-danger bg-danger-bg',
  neutral: 'border-neutral text-neutral bg-neutral-bg',
}

const iconBg = {
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info',
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-neutral-bg text-neutral',
}

const badgeClasses = {
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info',
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-neutral-bg text-neutral',
}

const callCount = computed(() => props.calls.length)

function toggleOutcome(value) {
  outcome.value = outcome.value === value ? '' : value
}

function submit() {
  emit('log-call', { outcome: outcome.value || null, note: note.value.trim() || null })
  outcome.value = ''
  note.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Log a call -->
    <div class="rounded-xl border border-gray-200 bg-white">
      <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div class="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
          <PhoneCall class="w-4 h-4 text-primary" />
        </div>
        <span class="text-sm font-medium text-gray-900">{{ t('leads.logCall') }}</span>
      </div>

      <div class="p-4 space-y-3">
        <!-- Outcome chips -->
        <div>
          <p class="text-xs font-medium text-gray-500 mb-1.5">
            {{ t('leads.callOutcome') }}
            <span class="text-gray-400 font-normal">· {{ t('common.optional') }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="o in OUTCOMES"
              :key="o.value"
              type="button"
              :class="[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors',
                outcome === o.value
                  ? chipClasses[o.variant]
                  : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300 hover:bg-gray-50',
              ]"
              @click="toggleOutcome(o.value)"
            >
              <component :is="o.icon" class="w-3.5 h-3.5" />
              {{ t(`leads.callOutcomes.${o.value}`) }}
            </button>
          </div>
        </div>

        <!-- Optional note -->
        <textarea
          v-model="note"
          rows="2"
          :placeholder="t('leads.callNotePlaceholder')"
          class="w-full text-sm text-gray-900 placeholder:text-gray-400 resize-none rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:border-primary transition-colors"
        />

        <div class="flex justify-end">
          <AppButton size="sm" :loading="submitting" @click="submit">
            <template #icon><PhoneCall class="w-3.5 h-3.5" /></template>
            {{ t('leads.logCall') }}
          </AppButton>
        </div>
      </div>
    </div>

    <!-- History -->
    <div>
      <div v-if="!loading && callCount > 0" class="flex items-center gap-2 mb-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {{ t('leads.callHistory') }}
        </span>
        <span class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
          {{ callCount }}
        </span>
      </div>

      <template v-if="loading">
        <div v-for="n in 3" :key="n" class="flex gap-3 pb-5">
          <AppSkeleton width="32px" height="32px" class="rounded-full shrink-0" />
          <div class="flex-1 space-y-1.5 pt-1">
            <AppSkeleton height="12px" width="35%" />
            <AppSkeleton height="14px" width="65%" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else-if="callCount === 0" class="text-center py-10">
        <div class="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <Phone class="w-5 h-5 text-gray-400" />
        </div>
        <p class="text-sm text-gray-500">{{ t('leads.noCalls') }}</p>
      </div>

      <!-- Timeline -->
      <div v-else class="relative">
        <div
          v-for="(call, i) in calls"
          :key="call.id"
          class="flex gap-3 pb-5 relative"
        >
          <!-- Connector line -->
          <div
            v-if="i < calls.length - 1"
            class="absolute left-4 top-9 bottom-0 w-px bg-gray-200"
          />

          <!-- Icon -->
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10',
              call.outcome ? iconBg[OUTCOME_MAP[call.outcome]?.variant ?? 'neutral'] : 'bg-primary-light text-primary',
            ]"
          >
            <component
              :is="call.outcome ? (OUTCOME_MAP[call.outcome]?.icon ?? Phone) : PhoneCall"
              class="w-3.5 h-3.5"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 pt-0.5">
            <div class="flex items-center gap-2 flex-wrap">
              <AppAvatar :name="call.user?.name ?? 'User'" size="xs" class="shrink-0" />
              <span class="text-sm font-medium text-gray-900">{{ call.user?.name ?? 'Unknown' }}</span>
              <span class="text-xs text-gray-400">{{ formatRelative(call.created_at) }}</span>
            </div>

            <div v-if="call.outcome || call.note" class="mt-1.5 space-y-1.5">
              <span
                v-if="call.outcome"
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  badgeClasses[OUTCOME_MAP[call.outcome]?.variant ?? 'neutral'],
                ]"
              >
                <component :is="OUTCOME_MAP[call.outcome]?.icon ?? Phone" class="w-3 h-3" />
                {{ t(`leads.callOutcomes.${call.outcome}`, call.outcome) }}
              </span>
              <p v-if="call.note" class="text-sm text-gray-700 whitespace-pre-wrap">{{ call.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
