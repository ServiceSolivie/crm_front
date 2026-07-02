<script setup>
import { ref } from 'vue'
import { Send } from 'lucide-vue-next'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import { formatRelative } from '@/utils/formatters'

defineProps({
  notes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['add-note'])

const text = ref('')

function submit() {
  if (!text.value.trim()) return
  emit('add-note', text.value.trim())
  text.value = ''
}

function handleKey(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Add note form -->
    <div class="border border-gray-200 rounded-xl p-3 focus-within:border-primary transition-colors">
      <textarea
        v-model="text"
        rows="3"
        placeholder="Add a note… (Ctrl+Enter to submit)"
        class="w-full text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none"
        @keydown="handleKey"
      />
      <div class="flex justify-end mt-2">
        <AppButton
          size="sm"
          :loading="submitting"
          :disabled="!text.trim()"
          @click="submit"
        >
          <template #icon><Send class="w-3.5 h-3.5" /></template>
          Add Note
        </AppButton>
      </div>
    </div>

    <!-- Notes list -->
    <div class="space-y-3">
      <template v-if="loading">
        <div v-for="n in 3" :key="n" class="flex gap-3">
          <AppSkeleton width="32px" height="32px" class="rounded-full shrink-0" />
          <div class="flex-1 space-y-1.5">
            <AppSkeleton height="12px" width="40%" />
            <AppSkeleton height="14px" />
            <AppSkeleton height="14px" width="70%" />
          </div>
        </div>
      </template>

      <div
        v-else
        v-for="note in notes"
        :key="note.id"
        class="flex gap-3"
      >
        <AppAvatar :name="note.author?.name ?? 'User'" size="sm" class="shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-gray-900">{{ note.user?.name ?? 'Unknown' }}</span>
            <span class="text-xs text-gray-400">{{ formatRelative(note.created_at) }}</span>
          </div>
          <p class="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{{ note.note }}</p>
        </div>
      </div>

    </div>
  </div>
</template>
