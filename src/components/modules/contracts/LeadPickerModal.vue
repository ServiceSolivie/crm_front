<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { leadsApi } from '@/api/leads'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select'])

const { t } = useI18n()

const search = ref('')
const results = ref([])
const loading = ref(false)
const selected = ref(null)
let debounceTimer = null

watch(
  () => props.open,
  (val) => {
    if (val) {
      search.value = ''
      results.value = []
      selected.value = null
      fetchLeads()
    }
  },
)

watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchLeads, 300)
})

async function fetchLeads() {
  loading.value = true
  try {
    const params = { per_page: 10, sort_by: 'created_at', sort_dir: 'desc' }
    if (search.value.trim()) params.search = search.value.trim()
    const { data } = await leadsApi.list(params)
    results.value = data
  } finally {
    loading.value = false
  }
}

function confirm() {
  if (selected.value) emit('select', selected.value)
}

function fullName(lead) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.reference
}
</script>

<template>
  <AppModal :open="open" :title="t('contracts.pickLead')" size="sm" @close="emit('close')">
    <!-- Search -->
    <div class="relative mb-4">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        v-model="search"
        type="text"
        :placeholder="t('contracts.searchLeadPlaceholder')"
        class="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-gray-50 text-sm
               focus:outline-none focus:border-primary focus:bg-white"
      />
    </div>

    <!-- Results -->
    <div class="space-y-1 max-h-64 overflow-y-auto -mx-1 px-1">
      <div
        v-if="loading"
        v-for="n in 4"
        :key="`sk-${n}`"
        class="h-12 rounded-lg bg-gray-100 animate-pulse"
      />
      <button
        v-else
        v-for="lead in results"
        :key="lead.id"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
          selected?.id === lead.id
            ? 'bg-primary-light border border-primary/30'
            : 'hover:bg-gray-50 border border-transparent',
        ]"
        @click="selected = lead"
      >
        <AppAvatar :name="fullName(lead)" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 truncate">{{ fullName(lead) }}</p>
          <p class="text-xs text-gray-500 truncate">
            {{ [lead.phone, lead.email].filter(Boolean).join(' · ') || lead.reference }}
          </p>
        </div>
        <span class="text-[10px] font-medium text-gray-400 uppercase shrink-0">
          {{ lead.insurance_type }}
        </span>
      </button>

      <p v-if="!loading && results.length === 0" class="text-center py-6 text-sm text-gray-400">
        {{ t('contracts.noLeadsFound') }}
      </p>
    </div>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
      <AppButton :disabled="!selected" @click="confirm">
        {{ t('contracts.useThisLead') }}
      </AppButton>
    </template>
  </AppModal>
</template>
