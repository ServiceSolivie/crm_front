import axios from 'axios'
import { i18n } from '@/i18n'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

/* ── Request interceptor: attach Bearer token + current locale ────── */
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Locale'] = i18n.global.locale.value
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
      const isAuthRoute = /\/(login|logout)/.test(url)
      if (!isAuthRoute) {
        localStorage.removeItem('auth_token')
        window.dispatchEvent(new CustomEvent('crm:unauthorized'))
      }
      // Login: errors.attempts_left tells how many tries remain before the lock
      return Promise.reject({ type: 'auth', message, errors: data?.errors ?? null })
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

    // Too many attempts (login lock, API throttle)
    if (status === 429) {
      return Promise.reject({
        type: 'rate_limited',
        message,
        errors: data?.errors ?? null,
        retryAfter: Number(data?.errors?.retry_after ?? error.response.headers?.['retry-after'] ?? 60),
      })
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
