import client from './client'

// Backend wraps responses as { success, data: {...} } — unwrap the inner data
const unwrap = (r) => r.data?.data ?? r.data

export const dashboardApi = {
  kpis: (params) => client.get('/dashboard/kpis', { params }).then(unwrap),
  statistics: (params) => client.get('/dashboard/statistics', { params }).then(unwrap),
  aggregations: (params) => client.get('/dashboard/aggregations', { params }).then(unwrap),
  charts: (params) => client.get('/dashboard/charts', { params }).then(unwrap),
  revenue: (params) => client.get('/dashboard/revenue', { params }).then(unwrap),
}
