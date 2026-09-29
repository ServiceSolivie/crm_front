import client from './client'

// Payments are read-only: they come from Hyperswitch, not from a form.
export const paymentsApi = {
  list: (leadId, params) =>
    client.get(`/leads/${leadId}/payments`, { params }).then((r) => r.data),

  // Change the contract total ({ total, reason }), e.g. to ask an additional payment
  updateTotal: (leadId, payload) =>
    client.patch(`/leads/${leadId}/contract-total`, payload).then((r) => r.data),

  /* Online payment links (Hyperswitch) */
  sessions: {
    // Payments page: links of every lead the user can see ({ search, status, page, per_page })
    all: (params) =>
      client.get('/payment-sessions', { params }).then((r) => r.data),
    list: (leadId) =>
      client.get(`/leads/${leadId}/payment-sessions`).then((r) => r.data),
    // payload: { amount, email? } — email defaults to the lead's
    create: (leadId, payload) =>
      client.post(`/leads/${leadId}/payment-sessions`, payload, { timeout: 30_000 }).then((r) => r.data),
    cancel: (leadId, sessionId) =>
      client.post(`/leads/${leadId}/payment-sessions/${sessionId}/cancel`).then((r) => r.data),
    // Request "to check": asks Hyperswitch whether the payment was created
    verify: (leadId, sessionId) =>
      client.post(`/leads/${leadId}/payment-sessions/${sessionId}/verify`, null, { timeout: 30_000 }).then((r) => r.data),
  },
}
