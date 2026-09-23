import client from './client'

export const leadSourcesApi = {
  list: (params) => client.get('/lead-sources', { params }).then((r) => r.data),
  create: (payload) => client.post('/lead-sources', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/lead-sources/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/lead-sources/${id}`),
}
