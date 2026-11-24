import client from './client'

// « IP bloquées » (super admin)
export const blockedIpsApi = {
  list: () => client.get('/blocked-ips').then((r) => r.data?.data ?? r.data),
  add: (payload) => client.post('/blocked-ips', payload).then((r) => r.data?.data ?? r.data),
  remove: (id) => client.delete(`/blocked-ips/${id}`).then((r) => r.data),
}
