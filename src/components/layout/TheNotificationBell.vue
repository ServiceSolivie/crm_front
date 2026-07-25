<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Bell, Calendar, CheckCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { formatRelative } from '@/utils/formatters'
import { notificationTitle } from '@/utils/notifications'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const toast = useToast()

const canViewNotifications = computed(() => auth.can('NOTIFICATIONS_VIEW'))
const open = ref(false)

function toggle() {
  if (!canViewNotifications.value) return
  open.value = !open.value
  if (open.value) notifications.fetchList()
}

function close() {
  open.value = false
}

async function openNotification(item) {
  if (!item.read_at) {
    try {
      await notifications.markRead(item.id)
    } catch (e) {
      toast.showError(e?.message ?? 'Failed to mark notification as read')
    }
  }

  const appointmentId = item.payload?.appointments?.[0]?.id
  if (appointmentId) router.push(`/appointments/${appointmentId}`)

  close()
}

async function onMarkAllRead() {
  try {
    await notifications.markAllRead()
  } catch (e) {
    toast.showError(e?.message ?? 'Failed to mark all as read')
  }
}

function handleClickOutside(e) {
  if (!e.target.closest('[data-bell]')) close()
}

/**
 * Resilience fallback for the live Pusher push: if a socket event was
 * missed (dropped connection, laptop sleep, ad-blocker), refetch the
 * unread count whenever the tab regains focus/visibility. Event-driven,
 * not a timer — no background polling while the tab isn't in view.
 */
function handleVisibility() {
  if (document.visibilityState === 'visible') notifications.fetchUnreadCount()
}

onMounted(() => {
  if (canViewNotifications.value) notifications.fetchUnreadCount()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleVisibility)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('focus', handleVisibility)
})
</script>

<template>
  <div
    v-if="canViewNotifications"
    class="relative"
    data-bell
  >
    <button
      class="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      @click="toggle"
    >
      <Bell class="w-5 h-5" />
      <span
        v-if="notifications.unreadCount > 0"
        class="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold
               rounded-full flex items-center justify-center"
      >
        {{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <Transition name="modal">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-dropdown border border-gray-100 z-50"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900">{{ t('notifications.title') }}</h3>
          <button
            v-if="notifications.unreadCount > 0"
            class="flex items-center gap-1 text-xs text-primary hover:underline"
            @click="onMarkAllRead"
          >
            <CheckCheck class="w-3.5 h-3.5" />
            {{ t('notifications.markAllRead') }}
          </button>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <template v-if="notifications.loading.list">
            <div v-for="n in 3" :key="n" class="flex gap-3 p-4 border-b border-gray-50">
              <div class="w-8 h-8 rounded-full bg-gray-100 shrink-0 animate-pulse" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                <div class="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </template>

          <template v-else>
            <p v-if="notifications.list.length === 0" class="p-6 text-center text-sm text-gray-500">
              {{ t('notifications.empty') }}
            </p>

            <button
              v-for="item in notifications.list"
              :key="item.id"
              :class="[
                'w-full flex gap-3 p-4 text-left border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50',
                !item.read_at && 'bg-primary-light/40',
              ]"
              @click="openNotification(item)"
            >
              <div class="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                <Calendar class="w-4 h-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 font-medium">{{ notificationTitle(item) }}</p>
                <p
                  v-for="apt in item.payload?.appointments?.slice(0, 3)"
                  :key="apt.id"
                  class="text-xs text-gray-500 mt-0.5 truncate"
                >
                  {{ apt.lead_name ?? t('notifications.unknownLead') }} —
                  {{ apt.scheduled_at ? formatRelative(apt.scheduled_at) : '' }}
                </p>
                <p class="text-[11px] text-gray-400 mt-1">{{ formatRelative(item.created_at) }}</p>
              </div>
              <span v-if="!item.read_at" class="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>
