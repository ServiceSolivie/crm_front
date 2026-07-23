import client from './client'

export const leadsApi = {
  list: (params) => client.get('/leads', { params }).then((r) => r.data),
  get: (id) => client.get(`/leads/${id}`).then((r) => r.data),
  create: (payload) => client.post('/leads', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/leads/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/leads/${id}`),
  assign: (id, assignedTo) =>
    client.post(`/leads/${id}/assign`, { assigned_to: assignedTo }).then((r) => r.data),
  updateStatus: (id, payload) =>
    client.patch(`/leads/${id}/status`, payload).then((r) => r.data),

  notes: {
    list: (leadId, params) =>
      client.get(`/leads/${leadId}/notes`, { params }).then((r) => r.data),
    create: (leadId, note) =>
      client.post(`/leads/${leadId}/notes`, { note }).then((r) => r.data),
  },

  calls: {
    list: (leadId, params) =>
      client.get(`/leads/${leadId}/calls`, { params }).then((r) => r.data),
    create: (leadId, payload) =>
      client.post(`/leads/${leadId}/calls`, payload).then((r) => r.data),
  },

  statusHistory: (id, params) =>
    client.get(`/leads/${id}/status-history`, { params }).then((r) => r.data),
  assignmentHistory: (id, params) =>
    client.get(`/leads/${id}/assignment-history`, { params }).then((r) => r.data),

  appointments: {
    list: (leadId) =>
      client.get(`/leads/${leadId}/appointments`).then((r) => r.data),
    create: (leadId, payload) =>
      client.post(`/leads/${leadId}/appointments`, payload).then((r) => r.data),
  },
}
