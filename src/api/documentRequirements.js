import client from './client'

export const documentRequirementsApi = {
  getMatrix: () => client.get('/document-requirements').then((r) => r.data),

  getDocumentTypes: () => client.get('/document-types').then((r) => r.data),

  createDocumentType: (payload) =>
    client.post('/document-types', payload).then((r) => r.data),

  updateDocumentType: (id, payload) =>
    client.put(`/document-types/${id}`, payload).then((r) => r.data),

  deleteDocumentType: (id) => client.delete(`/document-types/${id}`),

  syncRequirements: (payload) =>
    client.post('/document-requirements/sync', payload).then((r) => r.data),
}
