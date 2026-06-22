import client from './client'

export const paymentsApi = {
  list: (leadId, params) =>
    client.get(`/leads/${leadId}/payments`, { params }).then((r) => r.data),
  create: (leadId, payload) =>
    client.post(`/leads/${leadId}/payments`, payload).then((r) => r.data),
  remove: (leadId, paymentId) =>
    client.delete(`/leads/${leadId}/payments/${paymentId}`),
}
