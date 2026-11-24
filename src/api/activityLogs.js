import client from './client'

// « Journal d'activité » (super admin)
export const activityLogsApi = {
  list: (params) => client.get('/activity-logs', { params }).then((r) => r.data?.data ?? r.data),
  summary: () => client.get('/activity-logs/summary').then((r) => r.data?.data ?? r.data),
  exportCsv: (params) => client.get('/activity-logs/export', { params, responseType: 'blob' }).then((r) => r.data),
}
