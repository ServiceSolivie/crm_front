import Pusher from 'pusher-js'
import Echo from 'laravel-echo'
import client from '@/api/client'

window.Pusher = Pusher

let echoInstance = null

/**
 * Lazily creates a singleton Echo/Pusher connection. Uses a custom
 * authorizer (instead of Echo's default cookie/same-origin auth) because
 * this app authenticates via a Sanctum Bearer token in localStorage, not
 * cookies — the authorizer posts through the shared axios `client` so the
 * request automatically carries the same Authorization header and baseURL
 * as every other API call.
 */
export function getEcho() {
  if (echoInstance) return echoInstance

  const key = import.meta.env.VITE_PUSHER_APP_KEY
  if (!key) return null

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
    forceTLS: true,
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        client
          .post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name })
          .then((response) => callback(false, response.data))
          .catch((error) => callback(true, error))
      },
    }),
  })

  return echoInstance
}

export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}
