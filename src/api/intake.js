import client from './client'

// Marketing intake (super admin): the address/key to give out and the requests received
export const intakeApi = {
  settings: () => client.get('/intake/settings').then((r) => r.data),
  regenerateKey: () => client.post('/intake/key').then((r) => r.data),
  requests: (params) => client.get('/intake/requests', { params }).then((r) => r.data),
  request: (id) => client.get(`/intake/requests/${id}`).then((r) => r.data),
  remove: (id) => client.delete(`/intake/requests/${id}`).then((r) => r.data),
  removeAll: () => client.delete('/intake/requests').then((r) => r.data),
}
