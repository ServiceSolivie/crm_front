import client from './client'

const unwrap = (r) => r.data?.data ?? r.data

export const ringoverApi = {
  status: () => client.get('/ringover/status').then(unwrap),

  users: () => client.get('/ringover/users').then(unwrap),

  autoLink: () => client.post('/ringover/users/auto-link').then((r) => r.data),

  link: (userId, payload) => client.put(`/ringover/users/${userId}`, payload).then(unwrap),

  unlink: (userId) => client.delete(`/ringover/users/${userId}`).then(unwrap),
}
