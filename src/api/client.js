import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

/* ── Request interceptor: attach Bearer token ─────────────────── */
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* ── Response interceptor: normalize errors ───────────────────── */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        type: 'network',
        message: 'Connection error. Check your internet connection.',
        errors: null,
      })
    }

    const { status, data } = error.response
    const message = data?.message ?? 'An unexpected error occurred.'

    if (status === 401) {
      const url = error.config?.url ?? ''
      const isAuthRoute = /\/(login|logout|register)/.test(url)
      if (!isAuthRoute) {
        localStorage.removeItem('auth_token')
        window.dispatchEvent(new CustomEvent('crm:unauthorized'))
      }
      return Promise.reject({ type: 'auth', message, errors: null })
    }

    if (status === 403) {
      const isDeactivated =
        message.toLowerCase().includes('deactivated') ||
        message.toLowerCase().includes('deactivée')
      return Promise.reject({
        type: isDeactivated ? 'deactivated' : 'forbidden',
        message,
        errors: null,
      })
    }

    if (status === 404) {
      return Promise.reject({ type: 'not_found', message, errors: null })
    }

    if (status === 422) {
      return Promise.reject({
        type: 'validation',
        message: data?.message ?? 'Validation failed.',
        errors: data?.errors ?? null,
      })
    }

    return Promise.reject({ type: 'server', message, errors: null })
  },
)

export default client
