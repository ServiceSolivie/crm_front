import client from './client'

const base = '/vault/admin/credentials'

export const vaultCredentialsApi = {
  list: (params) => client.get(base, { params }).then((r) => r.data),
  get: (id) => client.get(`${base}/${id}`).then((r) => r.data),
  create: (payload) => client.post(base, payload).then((r) => r.data),
  update: (id, payload) => client.put(`${base}/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`${base}/${id}`),
}

export const vaultAssignmentApi = {
  list: (userId) => client.get(`/vault/admin/users/${userId}/credentials`).then((r) => r.data),
  sync: (userId, credentialIds) =>
    client.post(`/vault/admin/users/${userId}/credentials`, { credential_ids: credentialIds }).then((r) => r.data),
  revokeTokens: (userId) =>
    client.post(`/vault/admin/users/${userId}/revoke-tokens`).then((r) => r.data),
}
