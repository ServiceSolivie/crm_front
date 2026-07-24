import client from './client'

export const contractsApi = {
  list: (params) => client.get('/contracts', { params }).then((r) => r.data),
  templates: () => client.get('/contracts/templates').then((r) => r.data),
  prefill: (template, leadId) =>
    client
      .get('/contracts/prefill', { params: { template, lead_id: leadId ?? undefined } })
      .then((r) => r.data),
  generate: (payload) => client.post('/contracts', payload).then((r) => r.data),
  download: (id) => client.get(`/contracts/${id}/download`, { responseType: 'blob' }),
  remove: (id) => client.delete(`/contracts/${id}`),
}
