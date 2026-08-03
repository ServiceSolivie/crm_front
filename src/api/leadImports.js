import client from './client'

export const leadImportsApi = {
  list: (params) => client.get('/lead-imports', { params }).then((r) => r.data),
  get: (id) => client.get(`/lead-imports/${id}`).then((r) => r.data),
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post('/lead-imports', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  syncFromGoogleSheets: () => client.post('/lead-imports/sync-google-sheets').then((r) => r.data),
}
