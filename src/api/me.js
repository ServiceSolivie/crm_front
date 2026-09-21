import client from './client'

// Data about the signed-in user's own workload
export const meApi = {
  counters: () => client.get('/me/counters').then((r) => r.data),
  agenda: (date) => client.get('/me/agenda', { params: date ? { date } : {} }).then((r) => r.data),
}
