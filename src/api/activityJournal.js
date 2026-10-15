import client from './client'

/**
 * Activity journal: the operations (a payment, a Google Ads submission, an
 * account's logins of the day…) and, for one operation, its logs.
 */
export const activityJournalApi = {
  // Paginated operations, most recent activity first (filters: see the store)
  list: (params) => client.get('/activity-operations', { params }).then((r) => r.data),
  // Counters of the category chips for the same filters, and the list of events
  summary: (params) => client.get('/activity-operations/summary', { params }).then((r) => r.data),
  // One operation with all its logs, oldest first
  show: (id) => client.get(`/activity-operations/${id}`).then((r) => r.data),
}
