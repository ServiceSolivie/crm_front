import client from './client'

export const feedbackApi = {
  create: (payload) => client.post('/feedback', payload).then((r) => r.data),
}
