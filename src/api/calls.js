import client from './client'

const unwrap = (r) => r.data?.data ?? r.data

export const callsApi = {
  list: (params) => client.get('/calls', { params }).then((r) => r.data),

  get: (id) => client.get(`/calls/${id}`).then(unwrap),

  forLead: (leadId, params) =>
    client.get(`/leads/${leadId}/phone-calls`, { params }).then((r) => r.data),

  /** Returns { call, dial: { to, from } }. */
  initiate: (leadId) => client.post(`/leads/${leadId}/phone-calls`).then(unwrap),

  linkRingover: (callId, ringoverCallId) =>
    client.post(`/calls/${callId}/ringover-link`, { ringover_call_id: String(ringoverCallId) }).then(unwrap),

  updateNote: (callId, note) => client.patch(`/calls/${callId}`, { note }).then(unwrap),

  assignLead: (callId, leadId) =>
    client.post(`/calls/${callId}/lead`, { lead_id: leadId }).then(unwrap),

  /** kind: "recording" | "voicemail" | "transcription". Served through the CRM (permission-checked). */
  media: (callId, kind) =>
    client.get(`/calls/${callId}/${kind}`, { responseType: 'blob', timeout: 60_000 }).then((r) => r.data),
}
