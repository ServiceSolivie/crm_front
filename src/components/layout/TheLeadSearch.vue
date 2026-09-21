<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, CornerDownLeft } from 'lucide-vue-next'
import { leadsApi } from '@/api/leads'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSpinner from '@/components/base/AppSpinner.vue'
import LeadStatusBadge from '@/components/modules/leads/LeadStatusBadge.vue'

/**
 * Sidebar search box + quick-search dialog over the leads the user may see
 * (GET /leads/search). Opens with Ctrl/⌘+K from anywhere.
 */
const { t } = useI18n()
const router = useRouter()
const emit = defineEmits(['navigate'])

const open = ref(false)
const query = ref('')
const results = ref([])
const loading = ref(false)
const active = ref(0)
const inputRef = ref(null)
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

let timer = null
let requestId = 0

function show() {
  open.value = true
  nextTick(() => inputRef.value?.focus())
}

function hide() {
  open.value = false
  query.value = ''
  results.value = []
  active.value = 0
}

watch(query, (q) => {
  clearTimeout(timer)
  const term = q.trim()
  if (term.length < 2) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    const id = ++requestId
    try {
      const res = await leadsApi.search(term, 8)
      if (id !== requestId) return
      results.value = res.data ?? []
      active.value = 0
    } catch {
      if (id === requestId) results.value = []
    } finally {
      if (id === requestId) loading.value = false
    }
  }, 200)
})

function go(lead) {
  if (!lead) return
  router.push({ name: 'leads.detail', params: { id: lead.id } })
  hide()
  emit('navigate')
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    go(results.value[active.value])
  } else if (e.key === 'Escape') {
    hide()
  }
}

function onGlobalKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value ? hide() : show()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKey)
  clearTimeout(timer)
})

const fullName = (l) => [l.first_name, l.last_name].filter(Boolean).join(' ') || l.reference
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-2 w-full h-8.5 px-2.5 rounded-lg bg-white/8 text-sidebar-icon text-[13px] hover:bg-white/12 hover:text-white transition-colors"
    @click="show"
  >
    <Search class="w-3.5 h-3.5 shrink-0" />
    <span class="flex-1 text-left truncate">{{ t('quickSearch.placeholder') }}</span>
    <kbd class="font-mono text-[10.5px] px-1.5 rounded bg-white/10">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
  </button>

  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-gray-900/40" @mousedown.self="hide">
      <div role="dialog" aria-modal="true" :aria-label="t('quickSearch.title')" class="w-full max-w-lg bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden">
        <div class="flex items-center gap-2.5 px-4 h-12 border-b border-gray-100">
          <Search class="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref="inputRef"
            v-model="query"
            type="search"
            class="flex-1 h-full text-[14px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            :placeholder="t('quickSearch.inputPlaceholder')"
            role="combobox"
            aria-controls="quick-search-results"
            :aria-expanded="results.length > 0"
            :aria-activedescendant="results.length ? `qs-${results[active]?.id}` : undefined"
            @keydown="onKeydown"
          />
          <AppSpinner v-if="loading" :size="16" class="text-gray-400" />
          <kbd class="font-mono text-[10.5px] px-1.5 rounded bg-gray-100 text-gray-500">Esc</kbd>
        </div>

        <ul v-if="results.length" id="quick-search-results" role="listbox" class="max-h-[50vh] overflow-y-auto p-1.5">
          <li
            v-for="(lead, i) in results"
            :id="`qs-${lead.id}`"
            :key="lead.id"
            role="option"
            :aria-selected="i === active"
            :class="['flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer', i === active ? 'bg-primary-light' : 'hover:bg-gray-50']"
            @mouseenter="active = i"
            @mousedown.prevent="go(lead)"
          >
            <AppAvatar :name="fullName(lead)" size="sm" tone="soft" />
            <div class="flex-1 min-w-0">
              <p class="text-[13.5px] font-medium text-gray-900 truncate">{{ fullName(lead) }}</p>
              <p class="font-mono text-[11.5px] text-gray-500 truncate">
                {{ lead.reference }}<template v-if="lead.phone"> · {{ lead.phone }}</template>
              </p>
            </div>
            <LeadStatusBadge :status="lead.status" />
            <CornerDownLeft v-if="i === active" class="w-3.5 h-3.5 text-primary shrink-0" />
          </li>
        </ul>
        <p v-else-if="query.trim().length >= 2 && !loading" class="px-4 py-8 text-center text-[13px] text-gray-500">
          {{ t('quickSearch.noResults') }}
        </p>
        <p v-else class="px-4 py-6 text-center text-[13px] text-gray-500">{{ t('quickSearch.hint') }}</p>
      </div>
    </div>
  </Teleport>
</template>
