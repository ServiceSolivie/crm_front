import client from './client'

// Insurance types and the extra lead pages they are placed on (managed by the super admin)
export const insuranceTypesApi = {
  list: () => client.get('/insurance-types').then((r) => r.data),
  create: (payload) => client.post('/insurance-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/insurance-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/insurance-types/${id}`),
}

export const leadPagesApi = {
  list: () => client.get('/lead-pages').then((r) => r.data),
  create: (payload) => client.post('/lead-pages', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/lead-pages/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/lead-pages/${id}`),
}
