import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { getEcho, disconnectEcho } from '@/plugins/echo'
import { useNotificationsStore } from './notifications.store'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token'))
  const user = ref(null)
  const booting = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  function can(permission) {
    return user.value?.permissions?.includes(permission) ?? false
  }

  function hasRole(role) {
    return user.value?.roles?.includes(role) ?? false
  }

  function canAny(prefix) {
    return user.value?.permissions?.some((p) => p.startsWith(prefix)) ?? false
  }

  /**
   * Backend sends permissions as dot-notation lowercase ("leads.create", "reports.view_all").
   * Guards and sidebar check them as UPPERCASE_UNDERSCORE ("LEADS_CREATE", "REPORTS_VIEW_ALL").
   * Normalize once at parse time so every can() / canAny() call works correctly.
   */
  function _normalizeUser(userData) {
    if (!userData) return null
    return {
      ...userData,
      permissions: (userData.permissions ?? []).map((p) =>
        p.replace(/\./g, '_').toUpperCase(),
      ),
    }
  }

  /**
   * Normalise login responses across common Laravel shapes:
   *   { data: user, token }          ← our documented format
   *   { user, token }                ← alternative
   *   { data: { user, token } }      ← nested
   *   { data: user, access_token }   ← Passport style
   */
  function _parseSessionResponse(response) {
    // Unwrap one extra nesting level if token is inside .data
    const payload =
      response?.token || response?.access_token
        ? response
        : response?.data ?? response

    const authToken = payload?.token ?? payload?.access_token ?? null
    const userData = payload?.data ?? payload?.user ?? null

    return { authToken, userData }
  }

  async function login(email, password) {
    const response = await authApi.login({ email, password })
    const { authToken, userData } = _parseSessionResponse(response)
    if (!authToken) {
      throw { type: 'server', message: 'Login failed: server did not return a token. Check the console for the raw response.' }
    }
    _setSession(authToken, userData)
    return userData
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* fire and forget */
    } finally {
      clearSession()
    }
  }

  async function boot() {
    if (!token.value) return false
    booting.value = true
    try {
      const response = await authApi.me()
      user.value = _normalizeUser(response?.data ?? response?.user ?? response)
      _subscribeToNotifications()
      return true
    } finally {
      booting.value = false
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
    disconnectEcho()
  }

  function _setSession(newToken, newUser) {
    if (!newToken || newToken === 'undefined') {
      console.warn('[CRM auth] _setSession called with invalid token:', newToken)
      return
    }
    token.value = newToken
    user.value = _normalizeUser(newUser)
    localStorage.setItem('auth_token', newToken)
    _subscribeToNotifications()
  }

  /**
   * Live "today's appointment" reminders arrive over a private Pusher
   * channel scoped to this user (see routes/channels.php on the backend).
   * No-op if VITE_PUSHER_APP_KEY isn't configured (getEcho() returns null).
   */
  function _subscribeToNotifications() {
    if (!user.value?.id) return
    const echo = getEcho()
    if (!echo) return

    echo.private(`App.Models.User.${user.value.id}`).notification((notification) => {
      useNotificationsStore().pushLive(notification)
    })
  }

  return {
    token,
    user,
    booting,
    isAuthenticated,
    can,
    hasRole,
    canAny,
    login,
    logout,
    boot,
    clearSession,
  }
})
