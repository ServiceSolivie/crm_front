import client from './client'

// Backend wraps responses as { success, data: {...} } — unwrap the inner data
const unwrap = (r) => r.data?.data ?? r.data

export const gestionApi = {
  dashboard: () => client.get('/gestion/dashboard').then(unwrap),
  flagIssue: (leadId, payload) => client.post(`/leads/${leadId}/gestion/flag-issue`, payload).then((r) => r.data),
}
