import client from './client'

// Custom lead statuses only; the system ones live in utils/enums.js
export const leadStatusesApi = {
  list: () => client.get('/lead-statuses').then((r) => r.data),
  create: (payload) => client.post('/lead-statuses', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/lead-statuses/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/lead-statuses/${id}`),
}
