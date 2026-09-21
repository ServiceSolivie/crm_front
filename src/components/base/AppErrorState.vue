<script setup>
/** Full-page message used by the 403 / 404 / deactivated pages (inside the auth layout). */
defineProps({
  icon: { type: Object, required: true },
  tone: { type: String, default: 'danger' }, // danger | warning | neutral
  code: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
})
const emit = defineEmits(['action'])

const TONES = {
  danger: 'bg-danger-bg text-danger-text',
  warning: 'bg-warning-bg text-warning-text',
  neutral: 'bg-gray-100 text-gray-600',
}
</script>

<template>
  <div class="flex flex-col items-center text-center gap-2 py-2">
    <span :class="['w-12 h-12 rounded-full flex items-center justify-center mb-2', TONES[tone]]">
      <component :is="icon" class="w-5 h-5" />
    </span>
    <p v-if="code" class="font-mono text-xs text-gray-500">{{ code }}</p>
    <h1 class="font-display text-xl font-semibold text-gray-900">{{ title }}</h1>
    <p v-if="description" class="text-[13.5px] leading-5 text-gray-600 max-w-xs">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="mt-4 h-10 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-hover"
      @click="emit('action')"
    >{{ actionLabel }}</button>
  </div>
</template>
