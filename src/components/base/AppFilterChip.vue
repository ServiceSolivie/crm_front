<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, X, Check, Search } from 'lucide-vue-next'

/**
 * List filter as a chip: dashed when empty, tinted with its value when set.
 * Opens a small menu of options (searchable when the list is long).
 * Options: [{ value, label }]. Emits the chosen value, or '' when cleared.
 */
const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: [String, Number, Array], default: '' },
  options: { type: Array, default: () => [] },
  searchable: { type: Boolean, default: null }, // default: when > 8 options
  // Several values: modelValue is an array, the menu stays open while picking
  multiple: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const open = ref(false)
const query = ref('')
const rootRef = ref(null)
const searchRef = ref(null)

const selectedValues = computed(() => {
  const v = props.modelValue
  if (Array.isArray(v)) return v.map(String)
  return v !== '' && v !== null && v !== undefined ? [String(v)] : []
})
const hasValue = computed(() => selectedValues.value.length > 0)
const isSelected = (value) => selectedValues.value.includes(String(value))
const selectedLabel = computed(() => {
  const first = props.options.find((o) => isSelected(o.value))?.label ?? ''
  const more = selectedValues.value.length - 1
  return more > 0 ? `${first} +${more}` : first
})
const showSearch = computed(() => props.searchable ?? props.options.length > 8)
const visibleOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? props.options.filter((o) => String(o.label).toLowerCase().includes(q)) : props.options
})

async function toggle() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    await nextTick()
    searchRef.value?.focus()
  }
}

function pick(value) {
  if (props.multiple) {
    const current = props.options.filter((o) => isSelected(o.value)).map((o) => o.value)
    const next = isSelected(value) ? current.filter((v) => String(v) !== String(value)) : [...current, value]
    emit('update:modelValue', next)
    return
  }
  emit('update:modelValue', value)
  open.value = false
}

function clear() {
  emit('update:modelValue', props.multiple ? [] : '')
}

function onDocClick(e) {
  if (open.value && !rootRef.value?.contains(e.target)) open.value = false
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <div
      :class="[
        'h-9 inline-flex items-center rounded-lg text-[13px] whitespace-nowrap',
        hasValue ? 'border border-indigo-200 bg-primary-light text-indigo-800' : 'border border-dashed border-gray-300 text-gray-600',
      ]"
    >
      <button
        type="button"
        class="h-full inline-flex items-center gap-1.5 pl-3 pr-2 rounded-lg hover:bg-black/[0.03]"
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click="toggle"
      >
        <template v-if="hasValue">{{ label }} : <span class="font-medium">{{ selectedLabel }}</span></template>
        <template v-else>{{ label }}</template>
        <ChevronDown v-if="!hasValue" class="w-3.5 h-3.5" />
      </button>
      <button
        v-if="hasValue"
        type="button"
        class="h-full pr-2 pl-0.5 rounded-r-lg hover:text-indigo-950"
        :aria-label="t('common.clear') + ' ' + label"
        @click="clear"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <div
      v-if="open"
      role="listbox"
      :aria-multiselectable="multiple || undefined"
      class="absolute left-0 top-full mt-1.5 z-40 w-60 bg-white border border-gray-200 rounded-xl shadow-dropdown p-1.5"
    >
      <label v-if="showSearch" class="flex items-center gap-2 h-8 px-2 mb-1 rounded-md bg-gray-50 text-gray-500">
        <Search class="w-3.5 h-3.5" />
        <input
          ref="searchRef"
          v-model="query"
          type="search"
          :placeholder="t('common.searchPlaceholder')"
          :aria-label="t('common.search')"
          class="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-gray-900"
        >
      </label>
      <div class="max-h-64 overflow-y-auto">
        <button
          v-for="o in visibleOptions"
          :key="o.value"
          type="button"
          role="option"
          :aria-selected="isSelected(o.value)"
          class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-[13px] text-gray-900 hover:bg-gray-50"
          @click="pick(o.value)"
        >
          <span class="truncate">{{ o.label }}</span>
          <Check v-if="isSelected(o.value)" class="w-3.5 h-3.5 text-primary shrink-0" />
        </button>
        <p v-if="!visibleOptions.length" class="px-2 py-2 text-[13px] text-gray-500">{{ t('pagination.noResults') }}</p>
      </div>
    </div>
  </div>
</template>
