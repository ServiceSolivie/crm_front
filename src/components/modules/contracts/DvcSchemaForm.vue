<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppTextarea from '@/components/base/AppTextarea.vue'
import { INPUT_SECTION_TYPES } from '@/utils/dvcSchema'

/**
 * The form of a DVC, generated from its type's JSON schema: the "fields"
 * and "garanties" sections, in order. Texts, lists and the broker block only
 * print in the PDF.
 */
const props = defineProps({
  schema: { type: Object, required: true },
  // Field key → message (see dvcFieldErrors)
  errors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
})

const values = defineModel({ type: Object, required: true })
const { t } = useI18n()

const sections = computed(() =>
  (props.schema?.sections ?? []).filter((section) => INPUT_SECTION_TYPES.includes(section.type)),
)

const GRID_COLUMNS = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }

function inputType(field) {
  if (field.type === 'number' || field.type === 'money') return 'number'
  if (field.type === 'date') return 'date'
  return 'text'
}

function selectOptions(field) {
  return [{ value: '', label: '—' }, ...(field.options ?? []).map((option) => ({ value: option, label: option }))]
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <section v-for="section in sections" :key="section.key">
      <h3 :class="['font-display font-semibold text-gray-900 mb-3', section.level === 2 ? 'text-[13.5px]' : 'text-[14.5px]']">
        {{ section.title }}
      </h3>

      <!-- Guarantees: included + franchise -->
      <div v-if="section.type === 'garanties'" class="divide-y divide-gray-100 border border-gray-200 rounded-lg px-3">
        <div
          v-for="item in section.items"
          :key="item.key"
          class="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5"
        >
          <label class="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
            <input
              v-model="values[`${item.key}_included`]"
              type="checkbox"
              :disabled="disabled"
              class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span class="text-sm text-gray-800">{{ item.label }}</span>
          </label>
          <input
            v-model="values[`${item.key}_franchise`]"
            type="text"
            :placeholder="t('contracts.franchisePlaceholder')"
            :disabled="disabled || !values[`${item.key}_included`]"
            class="w-full sm:w-52 h-9 px-3 rounded-lg border border-gray-200 text-sm
                   focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>

      <!-- Fields grid -->
      <div v-else :class="['grid grid-cols-1 gap-x-4 gap-y-3', GRID_COLUMNS[section.columns ?? 2]]">
        <div
          v-for="field in section.fields"
          :key="field.key"
          :class="{ 'sm:col-span-full': field.width === 'full' || field.type === 'textarea' }"
        >
          <AppSelect
            v-if="field.type === 'select'"
            v-model="values[field.key]"
            :label="field.label"
            :options="selectOptions(field)"
            :required="field.required"
            :disabled="disabled"
            :error="errors[field.key] ?? ''"
            :hint="field.help ?? ''"
          />
          <AppTextarea
            v-else-if="field.type === 'textarea'"
            v-model="values[field.key]"
            :label="field.label"
            :rows="3"
            :required="field.required"
            :disabled="disabled"
            :error="errors[field.key] ?? ''"
            :hint="field.help ?? ''"
          />
          <div v-else-if="field.type === 'boolean'" class="flex flex-col gap-1.5 pt-6">
            <label class="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                v-model="values[field.key]"
                type="checkbox"
                :disabled="disabled"
                class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span class="text-sm text-gray-800">{{ field.label }}</span>
            </label>
            <p v-if="errors[field.key]" class="text-xs text-danger-text">{{ errors[field.key] }}</p>
          </div>
          <AppInput
            v-else
            v-model="values[field.key]"
            :label="field.label"
            :type="inputType(field)"
            :required="field.required"
            :disabled="disabled"
            :error="errors[field.key] ?? ''"
            :hint="field.help ?? (field.type === 'money' ? t('dvc.form.moneyHint') : '')"
          />
        </div>
      </div>
    </section>
  </div>
</template>
