import client from './client'

export const authApi = {
  login: (payload) => client.post('/auth/login', payload).then((r) => r.data),


  logout: () => client.post('/auth/logout').then((r) => r.data),

  me: () => client.get('/auth/me').then((r) => r.data),

  updateProfile: (payload) => client.put('/auth/profile', payload).then((r) => r.data),

  changePassword: (payload) => client.put('/auth/password', payload).then((r) => r.data),
}
