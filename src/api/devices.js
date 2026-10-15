import client from './client'

// Approved machines, super admin side (the login side is in api/auth.js)
export const devicesApi = {
  list: () => client.get('/devices').then((r) => r.data),
  settings: () => client.get('/devices/settings').then((r) => r.data),
  setMode: (mode) => client.put('/devices/settings', { mode }).then((r) => r.data),
  rename: (id, label) => client.put(`/devices/${id}`, { label }).then((r) => r.data),
  approve: (id) => client.post(`/devices/${id}/approve`).then((r) => r.data),
  revoke: (id) => client.post(`/devices/${id}/revoke`).then((r) => r.data),
  remove: (id) => client.delete(`/devices/${id}`),
}
