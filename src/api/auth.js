import client from './client'

export const authApi = {
  login: (payload) => client.post('/auth/login', payload).then((r) => r.data),

  // Approved machines: second step of the login, sent with the ticket (no session yet)
  verifyDevice: (payload) => client.post('/auth/login/device/verify', payload).then((r) => r.data),
  deviceRegisterOptions: (ticket) =>
    client.post('/auth/login/device/register-options', { ticket }).then((r) => r.data),
  registerDevice: (payload) => client.post('/auth/login/device/register', payload).then((r) => r.data),

  logout: () => client.post('/auth/logout').then((r) => r.data),

  me: () => client.get('/auth/me').then((r) => r.data),

  updateProfile: (payload) => client.put('/auth/profile', payload).then((r) => r.data),

  changePassword: (payload) => client.put('/auth/password', payload).then((r) => r.data),
}
