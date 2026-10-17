import client from './client'

// DVC types: one per insurance type, configured by the super admin with a JSON schema
export const dvcTypesApi = {
  list: () => client.get('/dvc-types').then((r) => r.data),
  get: (id) => client.get(`/dvc-types/${id}`).then((r) => r.data),
  create: (payload) => client.post('/dvc-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/dvc-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/dvc-types/${id}`),
  // Publish the schema as the type's next version
  publish: (id, payload) => client.post(`/dvc-types/${id}/versions`, payload).then((r) => r.data),
  version: (id, version) => client.get(`/dvc-types/${id}/versions/${version}`).then((r) => r.data),
  validate: (schema) => client.post('/dvc-types/validate', { schema }).then((r) => r.data),
  preview: (schema) => client.post('/dvc-types/preview', { schema }, { responseType: 'blob', timeout: 60_000 }),
}
