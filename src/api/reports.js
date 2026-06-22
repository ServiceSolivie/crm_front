import client from './client'

export const reportsApi = {
  leads: (params) => client.get('/reports/leads', { params }).then((r) => r.data),
  appointments: (params) =>
    client.get('/reports/appointments', { params }).then((r) => r.data),
  teams: (params) => client.get('/reports/teams', { params }).then((r) => r.data),
  agents: (params) => client.get('/reports/agents', { params }).then((r) => r.data),
  conversion: (params) => client.get('/reports/conversion', { params }).then((r) => r.data),
  revenue: (params) => client.get('/reports/revenue', { params }).then((r) => r.data),
  revenueSummary: (params) => client.get('/reports/revenue/summary', { params }).then((r) => r.data),
}
