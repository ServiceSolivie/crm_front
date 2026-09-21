<script>
let _closeActive = null
</script>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Lock } from 'lucide-vue-next'
import LeadStatusBadge from './LeadStatusBadge.vue'
import { LEAD_STATUS, LEAD_STAGES, REVIEW_STATUSES } from '@/utils/enums'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const auth = useAuthStore()

// Back-office statuses (Validé, Call2, PDG, À corriger) are for gestion and
// managers only; agents send the lead to GESTION instead.
const canReview = computed(() => auth.can('LEADS_SET_REVIEW_STATUS'))

// Statuses grouped under their pipeline stage, in pipeline order
const stageGroups = computed(() =>
  Object.entries(LEAD_STAGES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([stage, meta]) => ({
      stage,
      dot: meta.dot,
      statuses: Object.keys(LEAD_STATUS).filter(
        (k) =>
          LEAD_STATUS[k].stage === stage &&
          (canReview.value || !REVIEW_STATUSES.includes(k) || k === props.status),
      ),
    }))
    .filter((g) => g.statuses.length),
)

const props = defineProps({
  status: { type: String, required: true },
  // Gestion / Validé need the signed DVC; pass the lead's dvc_status to lock them
  dvcStatus: { type: String, default: null },
  loading: { type: Boolean, default: false },
})

const NEEDS_SIGNED_DVC = ['GESTION', 'VALIDE']
function isLocked(key) {
  return props.dvcStatus !== null && props.dvcStatus !== 'SIGNE' && NEEDS_SIGNED_DVC.includes(key) && key !== props.status
}

const emit = defineEmits(['change'])

const open = ref(false)
const triggerRef = ref(null)
const dropdownStyle = ref({})

const DROPDOWN_HEIGHT = 320

function close() {
  open.value = false
  if (_closeActive === close) _closeActive = null
}

function openMenu() {
  if (!triggerRef.value) return
  if (_closeActive && _closeActive !== close) _closeActive()
  _closeActive = close

  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom

  if (spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT) {
    dropdownStyle.value = {
      position: 'fixed',
      left: rect.left + 'px',
      bottom: window.innerHeight - rect.top + 4 + 'px',
      zIndex: 9999,
      transformOrigin: 'bottom left',
    }
  } else {
    dropdownStyle.value = {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.bottom + 4 + 'px',
      zIndex: 9999,
      transformOrigin: 'top left',
    }
  }
  open.value = true
}

function toggle() {
  if (open.value) close()
  else openMenu()
}

function select(value) {
  if (isLocked(value)) return
  if (value !== props.status) emit('change', value)
  close()
}

function onDocumentClick(e) {
  if (!open.value) return
  if (triggerRef.value?.contains(e.target)) return
  close()
}

const dropdownRef = ref(null)

function onScroll(e) {
  if (!open.value) return
  if (dropdownRef.value?.contains(e.target)) return
  close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick, true)
  window.addEventListener('scroll', onScroll, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick, true)
  window.removeEventListener('scroll', onScroll, true)
  if (_closeActive === close) _closeActive = null
})
</script>

<template>
  <div class="relative inline-block">
    <button
      ref="triggerRef"
      class="inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
      :disabled="loading"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click.stop="toggle"
    >
      <LeadStatusBadge :status="status" dot caret />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="open"
          ref="dropdownRef"
          :style="dropdownStyle"
          role="listbox"
          class="w-56 max-h-80 overflow-y-auto bg-white rounded-xl shadow-modal border border-gray-200 p-1.5"
          @mousedown.stop
        >
          <div v-for="group in stageGroups" :key="group.stage" class="pb-1">
            <p class="flex items-center gap-1.5 px-2 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
              <span :class="['w-1.5 h-1.5 rounded-full', group.dot]" />
              {{ t('stages.' + group.stage) }}
            </p>
            <button
              v-for="key in group.statuses"
              :key="key"
              role="option"
              :aria-selected="key === status"
              :aria-disabled="isLocked(key) || undefined"
              :title="isLocked(key) ? t('leadDetail.dvc.lockedHint') : undefined"
              :class="[
                'flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-colors',
                isLocked(key) ? 'opacity-45 cursor-not-allowed' : 'hover:bg-gray-50',
              ]"
              @mousedown.prevent="select(key)"
            >
              <LeadStatusBadge :status="key" />
              <Lock v-if="isLocked(key)" class="w-3 h-3 text-gray-400 shrink-0" />
              <Check v-if="key === status" class="w-3.5 h-3.5 text-primary shrink-0" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
