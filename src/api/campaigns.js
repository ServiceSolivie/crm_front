import client from './client'

export const campaignsApi = {
  list: (params) => client.get('/campaigns', { params }).then((r) => r.data),
  create: (payload) => client.post('/campaigns', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/campaigns/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/campaigns/${id}`),
}
