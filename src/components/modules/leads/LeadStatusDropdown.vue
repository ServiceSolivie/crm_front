<script setup>
import { ref } from 'vue'
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

function openMenu() {
  if (!triggerRef.value) return
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
  if (open.value) {
    open.value = false
  } else {
    openMenu()
  }
}

function select(value) {
  if (value !== props.status) emit('change', value)
  open.value = false
}
</script>

<template>
  <div class="relative inline-block">
    <button
      ref="triggerRef"
      class="inline-flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
      :disabled="loading"
      @click.stop="toggle"
      @blur.capture="() => setTimeout(() => (open = false), 150)"
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
          :style="dropdownStyle"
          class="w-52 bg-white rounded-xl shadow-modal border border-gray-100 py-1"
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
