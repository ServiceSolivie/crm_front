<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Flame, ShieldCheck, Shield, ShieldX, Building2 } from 'lucide-vue-next'

/**
 * The form answers of a lead (super admin, leads list): one line of chips
 * under the name — when they want to switch, whether they are insured,
 * why — and a card with every answer on hover / focus / click.
 * `qualification` comes from the API (LeadQualification); `fallback` is
 * the line shown when there is none (the source).
 */
const props = defineProps({
  qualification: { type: Object, default: null },
  fallback: { type: String, default: '' },
  sourceName: { type: String, default: '' },
})
const { t } = useI18n()

const TIMING = {
  now: 'bg-danger-bg text-danger-text',
  week: 'bg-warning-bg text-warning-text',
  month: 'bg-info-bg text-info-text',
  comparing: 'bg-gray-100 text-gray-600',
}
const INSURED = {
  yes: { icon: ShieldCheck, class: 'text-success-text' },
  no: { icon: Shield, class: 'text-gray-600' },
  cancelled: { icon: ShieldX, class: 'text-danger-text' },
}

const q = computed(() => props.qualification)
const company = computed(() => q.value?.company ?? null)
const companyLine = computed(() =>
  company.value ? [company.value.name, company.value.sector, company.value.seniority].filter(Boolean).join(' · ') : '',
)

// Every answer, in the card
const rows = computed(() => {
  if (!q.value) return []
  const list = []
  if (q.value.timing) list.push([t('leads.qualification.timing'), q.value.timing.label])
  if (q.value.insured) list.push([t('leads.qualification.insured'), q.value.insured.label])
  if (q.value.reason) list.push([t('leads.qualification.reason'), q.value.reason.label])
  const c = company.value
  if (c?.name) list.push([t('leads.qualification.companyName'), c.name])
  if (c?.sector) list.push([t('leads.qualification.sector'), c.sector])
  if (c?.seniority) list.push([t('leads.qualification.seniority'), c.seniority])
  if (c?.status) list.push([t('leads.qualification.companyStatus'), c.status])
  for (const e of q.value.extra ?? []) list.push([e.label, e.value])
  return list
})

/* Card: teleported so the table's scroll box doesn't cut it */
const anchor = ref(null)
const open = ref(false)
const pos = ref({ top: 0, left: 0 })
let closeTimer = null

async function show() {
  if (!rows.value.length) return
  clearTimeout(closeTimer)
  const r = anchor.value?.getBoundingClientRect()
  if (!r) return
  const width = 280
  pos.value = {
    top: Math.min(r.bottom + 6, window.innerHeight - 20),
    left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
  }
  open.value = true
  await nextTick()
}
function hideSoon() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => (open.value = false), 120)
}
function toggle() {
  if (open.value) open.value = false
  else show()
}
onBeforeUnmount(() => clearTimeout(closeTimer))
</script>

<template>
  <div
    ref="anchor"
    class="min-w-0"
    @mouseenter="show"
    @mouseleave="hideSoon"
    @keydown.esc="open = false"
  >
    <button
      v-if="q && (q.timing || q.insured || q.reason || companyLine)"
      type="button"
      class="flex items-center gap-1.5 min-w-0 max-w-full text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      :aria-expanded="open"
      :aria-label="t('leads.qualification.open')"
      @click.stop="toggle"
      @focus="show"
      @blur="hideSoon"
    >
      <template v-if="q.timing || q.insured || q.reason">
        <span
          v-if="q.timing"
          :class="['shrink-0 inline-flex items-center gap-0.5 px-1.5 rounded text-[11px] leading-[17px] font-medium', TIMING[q.timing.code]]"
        >
          <Flame v-if="q.timing.code !== 'comparing'" class="w-3 h-3" />{{ t('leads.qualification.timings.' + q.timing.code) }}
        </span>
        <span
          v-if="q.insured"
          :class="['shrink-0 inline-flex items-center gap-0.5 text-[11px] leading-[17px] font-medium', INSURED[q.insured.code].class]"
        >
          <component :is="INSURED[q.insured.code].icon" class="w-3 h-3" />{{ t('leads.qualification.insureds.' + q.insured.code) }}
        </span>
        <span v-if="q.reason" class="text-xs text-gray-500 truncate">{{ q.reason.label }}</span>
      </template>
      <span v-else class="inline-flex items-center gap-1 text-xs text-gray-600 truncate">
        <Building2 class="w-3 h-3 shrink-0" />{{ companyLine }}
      </span>
    </button>
    <p v-else class="text-xs text-gray-500 truncate">{{ fallback }}</p>

    <Teleport to="body">
      <div
        v-if="open && rows.length"
        role="dialog"
        :aria-label="t('leads.qualification.title')"
        class="fixed z-50 w-[280px] bg-white border border-gray-200 rounded-xl shadow-dropdown px-3.5 py-3"
        :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
        @mouseenter="show"
        @mouseleave="hideSoon"
        @click.stop
      >
        <p class="text-[13px] font-semibold text-gray-900">{{ t('leads.qualification.title') }}</p>
        <p v-if="sourceName" class="text-xs text-gray-500">{{ sourceName }}</p>
        <dl class="mt-2 divide-y divide-gray-100">
          <div v-for="([label, value], i) in rows" :key="i" class="flex justify-between gap-3 py-1.5 text-[12.5px]">
            <dt class="text-gray-500 shrink-0">{{ label }}</dt>
            <dd class="text-gray-900 text-right break-words min-w-0">{{ value }}</dd>
          </div>
        </dl>
      </div>
    </Teleport>
  </div>
</template>
