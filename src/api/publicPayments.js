import axios from 'axios'

/**
 * Public payment result page (the client, not an agent): its own axios
 * instance, without the agent's token nor the 401 → login handling.
 * Errors keep their HTTP status (404 unknown link, 410 expired).
 */
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30_000,
  headers: { Accept: 'application/json' },
})

export const publicPaymentsApi = {
  // Once when the page opens: the client came back from the bank
  markReturned: (token) =>
    publicClient.post(`/public/payments/${encodeURIComponent(token)}/return`).then((r) => r.data.data),
  // Polling: the saved status
  status: (token) =>
    publicClient.get(`/public/payments/${encodeURIComponent(token)}`).then((r) => r.data.data),
}
