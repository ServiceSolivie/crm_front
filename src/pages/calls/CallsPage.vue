<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  UserPlus,
  Link2,
  ChevronDown,
  Sparkles,
} from 'lucide-vue-next'
import { callsApi } from '@/api/calls'
import { leadsApi } from '@/api/leads'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/formatters'
import AppCard from '@/components/base/AppCard.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppToggle from '@/components/base/AppToggle.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import CallMediaPanel from '@/components/modules/calls/CallMediaPanel.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const calls = ref([])
const meta = ref(null)
const loading = ref(false)
const page = ref(1)
const expanded = ref(new Set())
const filters = ref({
  direction: '',
  status: '',
  from: '',
  to: '',
  unmatched: route.query.unmatched === '1',
})

const canSeeOthers = computed(() => auth.can('CALLS_VIEW_ALL') || auth.can('CALLS_VIEW_TEAM'))

const directionOptions = computed(() => [
  { value: '', label: t('calls.allDirections') },
  { value: 'out', label: t('calls.direction.out') },
  { value: 'in', label: t('calls.direction.in') },
])

const statusOptions = computed(() => [
  { value: '', label: t('calls.allStatuses') },
  ...['completed', 'missed', 'no_answer', 'voicemail'].map((s) => ({ value: s, label: t(`calls.status.${s}`) })),
])

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, per_page: 20 }
    for (const [key, value] of Object.entries(filters.value)) {
      if (value === true) params[`filter[${key}]`] = 1
      else if (value) params[`filter[${key}]`] = value
    }
    const res = await callsApi.list(params)
    calls.value = res.data ?? []
    meta.value = res.meta ?? null
  } catch (e) {
    toast.showError(e?.message ?? t('calls.loadError'))
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(filters, () => {
  page.value = 1
  load()
}, { deep: true })

function goToPage(p) {
  page.value = p
  load()
}

function toggle(id) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function icon(call) {
  if (call.status === 'voicemail') return Voicemail
  if (call.status === 'missed' || call.status === 'no_answer') return PhoneMissed
  return call.direction === 'in' ? PhoneIncoming : PhoneOutgoing
}

function statusVariant(status) {
  return { completed: 'success', missed: 'danger', no_answer: 'danger', voicemail: 'warning' }[status] ?? 'neutral'
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`
}

/* ── Unmatched calls: create a lead / attach to a lead ─────────────── */
function createLead(call) {
  router.push({ path: '/leads/create', query: { phone: call.contact_number } })
}

const assignTarget = ref(null)
const leadSearch = ref('')
const leadResults = ref([])
const selectedLeadId = ref(null)
const searching = ref(false)
const assigning = ref(false)
let searchTimer = null

function openAssign(call) {
  assignTarget.value = call
  leadSearch.value = ''
  leadResults.value = []
  selectedLeadId.value = null
}

watch(leadSearch, (q) => {
  clearTimeout(searchTimer)
  if (q.trim().length < 2) {
    leadResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await leadsApi.list({ search: q.trim(), per_page: 10 })
      leadResults.value = res.data ?? []
    } catch {
      leadResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

async function confirmAssign() {
  if (!selectedLeadId.value) return
  assigning.value = true
  try {
    await callsApi.assignLead(assignTarget.value.id, selectedLeadId.value)
    toast.showSuccess(t('calls.unmatched.assigned'))
    assignTarget.value = null
    await load()
  } catch (e) {
    toast.showError(e?.message ?? t('calls.loadError'))
  } finally {
    assigning.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="relative z-10">
        <h1 class="text-2xl font-bold text-white">{{ t('calls.title') }}</h1>
        <p class="text-sm text-indigo-200 mt-0.5">
          {{ canSeeOthers ? t('calls.pageSubtitleTeam') : t('calls.pageSubtitleOwn') }}
          <template v-if="meta"> · {{ meta.total }}</template>
        </p>
      </div>
    </div>

    <!-- Filters -->
    <AppCard padding="sm">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <AppSelect v-model="filters.direction" :options="directionOptions" :placeholder="t('calls.allDirections')" />
        <AppSelect v-model="filters.status" :options="statusOptions" :placeholder="t('calls.allStatuses')" />
        <AppInput v-model="filters.from" type="date" :label="t('calls.fromDate')" />
        <AppInput v-model="filters.to" type="date" :label="t('calls.toDate')" />
        <AppToggle v-model="filters.unmatched" :label="t('calls.unmatched.only')" />
      </div>
    </AppCard>

    <!-- List -->
    <AppCard padding="none">
      <div v-if="loading && calls.length === 0" class="p-4 space-y-3">
        <AppSkeleton v-for="n in 5" :key="n" height="56px" />
      </div>

      <div v-else-if="calls.length === 0" class="text-center py-16">
        <PhoneOutgoing class="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ filters.unmatched ? t('calls.unmatched.empty') : t('calls.emptyAll') }}</p>
      </div>

      <ul v-else class="divide-y divide-gray-50">
        <li v-for="call in calls" :key="call.id">
          <div class="flex items-center gap-3 px-4 py-3">
            <button type="button" class="flex flex-1 items-center gap-3 min-w-0 text-left cursor-pointer" @click="toggle(call.id)">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary-light text-primary">
                <component :is="icon(call)" class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <RouterLink
                    v-if="call.lead"
                    :to="`/leads/${call.lead.id}`"
                    class="text-sm font-medium text-gray-900 hover:text-primary"
                    @click.stop
                  >
                    {{ call.lead.name }}
                  </RouterLink>
                  <span v-else class="text-sm font-medium text-gray-900">{{ call.contact_number ?? '—' }}</span>
                  <AppBadge :variant="statusVariant(call.status)" :label="t(`calls.status.${call.status}`)" />
                  <AppBadge v-if="!call.lead && !call.is_internal" variant="warning" :label="t('calls.unmatched.badge')" />
                  <Sparkles v-if="call.has_summary && call.can_listen" class="w-3.5 h-3.5 text-primary" />
                </div>
                <p class="text-xs text-gray-500 truncate">
                  {{ t(`calls.direction.${call.direction ?? 'out'}`) }}
                  · {{ formatDateTime(call.started_at) }}
                  · {{ call.agent?.name ?? t('calls.unknownAgent') }}
                  · {{ formatDuration(call.talk_seconds) }}
                </p>
              </div>
            </button>

            <div v-if="!call.lead && !call.is_internal" class="flex gap-1 shrink-0">
              <AppButton size="sm" variant="secondary" @click="createLead(call)">
                <template #icon><UserPlus class="w-4 h-4" /></template>
                {{ t('calls.unmatched.createLead') }}
              </AppButton>
              <AppButton size="sm" variant="secondary" @click="openAssign(call)">
                <template #icon><Link2 class="w-4 h-4" /></template>
                {{ t('calls.unmatched.attach') }}
              </AppButton>
            </div>
            <ChevronDown :class="['w-4 h-4 text-gray-400 shrink-0 transition-transform', expanded.has(call.id) ? 'rotate-180' : '']" />
          </div>

          <div v-if="expanded.has(call.id)" class="px-4 pb-4 pl-16 space-y-3 text-sm">
            <p class="text-xs text-gray-500">
              {{ t('calls.from') }} {{ call.from_number ?? '—' }} → {{ t('calls.to') }} {{ call.to_number ?? '—' }}
              · {{ t('calls.totalDuration') }} {{ formatDuration(call.duration_seconds) }}
            </p>
            <div v-if="call.can_listen && call.ai_summary" class="rounded-lg bg-primary-light/40 p-3">
              <p class="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                <Sparkles class="w-3.5 h-3.5" /> {{ t('calls.aiSummary') }}
              </p>
              <p class="text-gray-800 whitespace-pre-line">{{ call.ai_summary }}</p>
            </div>
            <CallMediaPanel :call="call" />
            <p v-if="call.note" class="text-gray-700"><span class="text-xs text-gray-400">{{ t('calls.note') }} :</span> {{ call.note }}</p>
          </div>
        </li>
      </ul>

      <div v-if="meta && meta.last_page > 1" class="px-4 pb-4">
        <AppPagination
          :current-page="meta.current_page"
          :last-page="meta.last_page"
          :total="meta.total"
          :from="meta.from ?? 0"
          :to="meta.to ?? 0"
          :per-page="meta.per_page ?? 20"
          :per-page-options="[20]"
          @page-change="goToPage"
        />
      </div>
    </AppCard>

    <!-- Attach to a lead -->
    <AppModal :open="assignTarget !== null" :title="t('calls.unmatched.attachTitle', { number: assignTarget?.contact_number ?? '' })" @close="assignTarget = null">
      <div class="space-y-3">
        <AppSearchInput v-model="leadSearch" :placeholder="t('calls.unmatched.searchLead')" />
        <p v-if="searching" class="text-xs text-gray-400">{{ t('common.loading') }}</p>
        <ul v-else-if="leadResults.length" class="max-h-64 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100">
          <li v-for="lead in leadResults" :key="lead.id">
            <label class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input v-model="selectedLeadId" type="radio" :value="lead.id" name="assign-lead" />
              <span class="text-sm text-gray-900">{{ lead.first_name }} {{ lead.last_name }}</span>
              <span class="text-xs text-gray-400">{{ lead.reference }} · {{ lead.phone }}</span>
            </label>
          </li>
        </ul>
        <p v-else-if="leadSearch.trim().length >= 2" class="text-xs text-gray-400">{{ t('calls.unmatched.noLeadFound') }}</p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="assignTarget = null">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="assigning" :disabled="!selectedLeadId" @click="confirmAssign">{{ t('calls.unmatched.attach') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
