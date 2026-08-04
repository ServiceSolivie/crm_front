import client from './client'

export const usersApi = {
  list: (params) => client.get('/users', { params }).then((r) => r.data),
  get: (id) => client.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => client.post('/users', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/users/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/users/${id}`),
  assignRole: (id, role) =>
    client.patch(`/users/${id}/role`, { role }).then((r) => r.data),
  toggleStatus: (id, isActive) =>
    client.patch(`/users/${id}/status`, { is_active: isActive }).then((r) => r.data),
  resetPassword: (id, payload) =>
    client.patch(`/users/${id}/password`, payload).then((r) => r.data),
}
