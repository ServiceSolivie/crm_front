<script>
let _closeActive = null
</script>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'
import LeadStatusBadge from './LeadStatusBadge.vue'
import { LEAD_STATUS } from '@/utils/enums'

const statusKeys = Object.keys(LEAD_STATUS)

const props = defineProps({
  status: { type: String, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['change'])

const open = ref(false)
const triggerRef = ref(null)
const dropdownStyle = ref({})

const DROPDOWN_HEIGHT = 220

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
      class="inline-flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
      :disabled="loading"
      @click.stop="toggle"
    >
      <LeadStatusBadge :status="status" dot />
      <ChevronDown class="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
          class="w-52 max-h-72 overflow-y-auto bg-white rounded-xl shadow-modal border border-gray-100 py-1"
          @mousedown.stop
        >
          <button
            v-for="key in statusKeys"
            :key="key"
            class="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            @mousedown.prevent="select(key)"
          >
            <LeadStatusBadge :status="key" />
            <Check v-if="key === status" class="w-3.5 h-3.5 text-primary shrink-0" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
