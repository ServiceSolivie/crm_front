import client from './client'

const base = '/vault/admin/partners'

export const vaultPartnersApi = {
  list: (params) => client.get(base, { params }).then((r) => r.data),
  get: (id) => client.get(`${base}/${id}`).then((r) => r.data),
  create: (payload) => client.post(base, payload).then((r) => r.data),
  update: (id, payload) => client.put(`${base}/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`${base}/${id}`),
}
