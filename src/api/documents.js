import client from './client'

export const documentsApi = {
  getDossier: (leadId) =>
    client.get(`/leads/${leadId}/documents`).then((r) => r.data),

  upload: (leadId, formData) =>
    client
      .post(`/leads/${leadId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  download: (leadId, documentId) =>
    client.get(`/leads/${leadId}/documents/${documentId}/download`, {
      responseType: 'blob',
    }),

  remove: (leadId, documentId) =>
    client.delete(`/leads/${leadId}/documents/${documentId}`),

  setClientType: (leadId, clientType) =>
    client.patch(`/leads/${leadId}/documents/client-type`, { client_type: clientType }).then((r) => r.data),
}
