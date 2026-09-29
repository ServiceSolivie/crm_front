import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { notificationsApi } from '@/api/notifications'
import { useUiStore } from '@/stores/ui.store'
import { notificationTitle } from '@/utils/notifications'
import { useNotificationSound } from '@/composables/useNotificationSound'

export const useNotificationsStore = defineStore('notifications', () => {
  const list = ref([])
  const unreadCount = ref(0)

  const loading = reactive({
    list: false,
    unreadCount: false,
  })

  const errors = ref(null)

  /**
   * Only shows the loading skeleton on the very first fetch — once the
   * list is populated, later calls (e.g. reopening the bell) refetch
   * quietly in the background instead of flashing the skeleton again.
   */
  async function fetchList() {
    const showLoading = list.value.length === 0
    if (showLoading) loading.list = true
    try {
      const { data } = await notificationsApi.list()
      list.value = data
    } catch (e) {
      errors.value = e
    } finally {
      if (showLoading) loading.list = false
    }
  }

  async function fetchUnreadCount() {
    loading.unreadCount = true
    try {
      const { data } = await notificationsApi.unreadCount()
      unreadCount.value = data.count
    } catch (e) {
      errors.value = e
    } finally {
      loading.unreadCount = false
    }
  }

  async function markRead(id) {
    try {
      await notificationsApi.markRead(id)
      const item = list.value.find((n) => String(n.id) === String(id))
      if (item && !item.read_at) {
        item.read_at = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (e) {
      errors.value = e
      throw e
    }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead()
      list.value.forEach((n) => {
        if (!n.read_at) n.read_at = new Date().toISOString()
      })
      unreadCount.value = 0
    } catch (e) {
      errors.value = e
      throw e
    }
  }

  /**
   * Called directly by the live Pusher/Echo listener when a new
   * notification arrives — no refetch needed, just prepend + bump count.
   *
   * Laravel's default notification broadcast payload is flat
   * ({...toArray(), id, type: FQCN, read_at}), unlike the REST API's
   * NotificationResource shape ({id, type: basename, payload, read_at,
   * created_at}) — normalize here so the dropdown can render both the
   * same way regardless of source.
   */
  function pushLive(raw) {
    const { id, type, read_at, ...payload } = raw
    const item = {
      id,
      type: type?.split('\\').pop() ?? type,
      payload,
      read_at: read_at ?? null,
      created_at: new Date().toISOString(),
    }
    list.value.unshift(item)
    unreadCount.value += 1
    useUiStore().showInfo(notificationTitle(item))
    useNotificationSound().play()
    // Payment received / failed: pages showing payments refresh themselves
    if (payload.payment) {
      window.dispatchEvent(new CustomEvent('crm:payment-updated', { detail: payload.payment }))
    }
  }

  return {
    list,
    unreadCount,
    loading,
    errors,
    fetchList,
    fetchUnreadCount,
    markRead,
    markAllRead,
    pushLive,
  }
})
