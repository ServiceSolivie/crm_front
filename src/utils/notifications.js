import { i18n } from '@/i18n'

/**
 * The stored payload's `title` is baked in English at creation time and
 * can never be retranslated — render our own localized title from the
 * notification type + count instead, so switching language updates it.
 * Shared between the bell dropdown and the "notification arrived" toast
 * so both always show the exact same text.
 */
export function notificationTitle(item) {
  const t = i18n.global.t
  if (item.type === 'TodayAppointmentsNotification') {
    const count = item.payload?.count ?? item.payload?.appointments?.length ?? 0
    return t('notifications.todayDigestTitle', count, { count })
  }
  if (item.type === 'AppointmentReminderNotification') {
    return t('notifications.reminderTitle')
  }
  return item.payload?.title
}
