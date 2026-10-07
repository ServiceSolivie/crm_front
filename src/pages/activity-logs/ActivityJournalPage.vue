<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, RefreshCw, ScrollText, X } from 'lucide-vue-next'
import { useActivityJournalStore } from '@/stores/activityJournal.store'
import AppCard from '@/components/base/AppCard.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import OperationRow from '@/components/modules/activity-logs/OperationRow.vue'
import OperationLogs from '@/components/modules/activity-logs/OperationLogs.vue'
import { CATEGORIES } from '@/utils/activityJournal'

/**
 * Activity journal: what the CRM did, in two levels. The list shows the
 * operations (a payment, a Google Ads submission, an account's logins of
 * the day, a managed user…) with how each one stands; opening one shows
 * its logs in order. Chips and filters narrow the list; operations that
 * need attention stand out with a coloured edge.
 */
const { t, te } = useI18n()
const store = useActivityJournalStore()
const route = useRoute()
const router = useRouter()

/* Category chips: "all" + one per category, with its counters */
const chips = computed(() => [
  { value: '', label: t('activity.all'), count: store.summary.total ?? 0, problems: store.summary.problems ?? 0 },
  ...Object.entries(CATEGORIES).map(([value, look]) => ({
    value,
    label: t(`activity.categories.${value}`),
    count: store.summary.categories?.[value]?.count ?? 0,
    problems: store.summary.categories?.[value]?.problems ?? 0,
    look,
  })),
])

const stateOptions = computed(() =>
  ['success', 'pending', 'warning', 'failure', 'neutral'].map((value) => ({ value, label: t(`activity.states.${value}`) })),
)

// Event types of the chosen category (all of them when no category is chosen)
const eventOptions = computed(() =>
  (store.summary.events ?? [])
    .filter((e) => !store.filters.category || e.category === store.filters.category)
    .map((e) => ({ value: e.value, label: te(`activity.events.${e.value}`) ? t(`activity.events.${e.value}`) : e.label })),
)

const actorOptions = computed(() =>
  ['user', 'system', 'client', 'google_ads'].map((value) => ({ value, label: t(`activity.actors.${value}`) })),
)

/* Period presets map onto from (last activity, inclusive), like the Payments page */
const periodPreset = ref('')
const periodOptions = computed(() => [
  { value: 'today', label: t('paymentsPage.periods.today') },
  { value: '7d', label: t('paymentsPage.periods.last7') },
  { value: '30d', label: t('paymentsPage.periods.last30') },
  { value: 'month', label: t('paymentsPage.periods.thisMonth') },
])
function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function setPeriod(key) {
  periodPreset.value = key
  const now = new Date()
  const start = {
    today: now,
    '7d': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
    '30d': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
  }[key]
  store.filters.to = ''
  store.setFilter('from', start ? isoDay(start) : '')
}

const hasFilters = computed(() => {
  const f = store.filters
  return !!(f.search || f.category || f.state.length || f.event.length || f.actor_type || f.problems || f.lead_id || f.from || f.to)
})
function clearFilters() {
  periodPreset.value = ''
  store.resetFilters()
  if (Object.keys(route.query).length) router.replace({ query: {} })
}
function clearLead() {
  store.setFilter('lead_id', '')
  router.replace({ query: { ...route.query, lead_id: undefined } })
}

const from = computed(() => (store.meta.total === 0 ? 0 : (store.meta.current_page - 1) * store.meta.per_page + 1))
const to = computed(() => Math.min(store.meta.current_page * store.meta.per_page, store.meta.total))

// Arriving from a link (e.g. the Payments page): /journal?search=PAY-33509-5 or ?lead_id=33509
onMounted(() => {
  const q = route.query
  store.resetFilters({
    search: typeof q.search === 'string' ? q.search : '',
    lead_id: typeof q.lead_id === 'string' ? q.lead_id : '',
    category: typeof q.category === 'string' && (q.category in CATEGORIES) ? q.category : '',
    problems: q.problems === '1',
  })
})
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1200px] mx-auto">
    <AppPageHeader :title="t('activity.title')" :count="store.meta.total" :subtitle="t('activity.subtitle')">
      <template #actions>
        <AppButton variant="secondary" :loading="store.loading.list" @click="store.fetchList()">
          <template #icon><RefreshCw class="w-4 h-4" /></template>
          {{ t('activity.refresh') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Categories: tell the kinds of operations apart, see where the problems are -->
    <div class="flex flex-wrap gap-2" role="tablist" :aria-label="t('activity.categoriesLabel')">
      <button
        v-for="chip in chips"
        :key="chip.value"
        type="button"
        role="tab"
        :aria-selected="store.filters.category === chip.value"
        class="h-9 inline-flex items-center gap-2 pl-2.5 pr-3 rounded-full border text-[13px] transition-colors"
        :class="store.filters.category === chip.value
          ? 'border-primary bg-primary-light text-primary font-medium'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
        @click="store.setFilter('category', chip.value)"
      >
        <component :is="chip.look.icon" v-if="chip.look" class="w-4 h-4" :class="chip.look.text" />
        <ScrollText v-else class="w-4 h-4 text-gray-500" />
        {{ chip.label }}
        <span class="font-mono text-[12px] text-gray-500">{{ chip.count }}</span>
        <span
          v-if="chip.problems"
          class="inline-flex items-center gap-0.5 h-[18px] px-1.5 rounded-full bg-danger-bg text-danger-text font-mono text-[11px]"
          :title="t('activity.problemsCount', chip.problems, { count: chip.problems })"
        ><AlertTriangle class="w-2.5 h-2.5" />{{ chip.problems }}</span>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <AppSearchInput
        :model-value="store.filters.search"
        :placeholder="t('activity.searchPlaceholder')"
        class="w-full sm:w-[320px]"
        @update:model-value="store.setFilter('search', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('activity.state')"
        :model-value="store.filters.state"
        :options="stateOptions"
        :searchable="false"
        @update:model-value="store.setFilter('state', $event)"
      />
      <AppFilterChip
        multiple
        :label="t('activity.event')"
        :model-value="store.filters.event"
        :options="eventOptions"
        @update:model-value="store.setFilter('event', $event)"
      />
      <AppFilterChip
        :label="t('activity.actor')"
        :model-value="store.filters.actor_type"
        :options="actorOptions"
        :searchable="false"
        @update:model-value="store.setFilter('actor_type', $event)"
      />
      <AppFilterChip
        :label="t('paymentsPage.period')"
        :model-value="store.filters.from ? periodPreset : ''"
        :options="periodOptions"
        :searchable="false"
        @update:model-value="setPeriod"
      />
      <button
        type="button"
        class="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-[13px] transition-colors"
        :class="store.filters.problems
          ? 'border-danger/40 bg-danger-bg text-danger-text font-medium'
          : 'border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'"
        :aria-pressed="store.filters.problems"
        @click="store.setFilter('problems', !store.filters.problems)"
      ><AlertTriangle class="w-3.5 h-3.5" />{{ t('activity.problemsOnly') }}</button>
      <span
        v-if="store.filters.lead_id"
        class="h-9 inline-flex items-center gap-1.5 pl-3 pr-1.5 rounded-lg bg-primary-light text-primary text-[13px]"
      >
        {{ t('activity.leadFilter', { id: store.filters.lead_id }) }}
        <button type="button" class="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/60" :aria-label="t('common.clear')" @click="clearLead"><X class="w-3.5 h-3.5" /></button>
      </span>
      <button
        v-if="hasFilters"
        type="button"
        class="h-9 px-2 text-[13px] text-gray-600 hover:text-gray-900"
        @click="clearFilters"
      >{{ t('common.clear') }}</button>
    </div>

    <AppCard padding="none" class="overflow-hidden">
      <!-- First load -->
      <ul v-if="store.loading.list && !store.list.length" class="divide-y divide-gray-100">
        <li v-for="n in 8" :key="n" class="flex items-center gap-3 px-4 py-3">
          <AppSkeleton width="32px" height="32px" rounded="rounded-lg" />
          <div class="flex-1 flex flex-col gap-1.5"><AppSkeleton width="38%" height="14px" /><AppSkeleton width="56%" height="12px" /></div>
          <AppSkeleton width="90px" height="22px" rounded="rounded-full" />
        </li>
      </ul>

      <AppEmptyState
        v-else-if="!store.list.length"
        :icon="ScrollText"
        :title="hasFilters ? t('activity.emptyFiltered') : t('activity.empty')"
        :description="hasFilters ? t('activity.emptyFilteredDesc') : t('activity.emptyDesc')"
      />

      <ul v-else class="divide-y divide-gray-100" :class="store.loading.list ? 'opacity-60' : ''">
        <li v-for="operation in store.list" :key="operation.id">
          <OperationRow :operation="operation" :open="!!store.opened[operation.id]" @toggle="store.toggle(operation.id)" />
          <OperationLogs
            v-if="store.opened[operation.id]"
            :operation="operation"
            :state="store.opened[operation.id]"
            @retry="store.loadLogs(operation.id)"
          />
        </li>
      </ul>

      <div v-if="store.meta.last_page > 1" class="border-t border-gray-100 px-4">
        <AppPagination
          :current-page="store.meta.current_page"
          :last-page="store.meta.last_page"
          :total="store.meta.total"
          :from="from"
          :to="to"
          :per-page="store.meta.per_page"
          :per-page-options="[20, 50, 100]"
          @page-change="store.setFilter('page', $event)"
          @per-page-change="store.setFilter('per_page', $event)"
        />
      </div>
    </AppCard>
  </div>
</template>
