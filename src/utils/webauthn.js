/**
 * Approved machines: the two calls to the browser's passkey API.
 *
 * The passkey is created and kept by the PC (Windows Hello); this page
 * never sees the secret. The backend sends its options with every binary
 * value as base64url text, and expects the answers the same way.
 */

const REMEMBER_KEY = 'crm_device'
const MARK_KEY = 'crm_device_mark'

function toBuffer(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer
}

function toText(buffer) {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Can this PC keep a passkey itself (Windows Hello set up with a PIN)? */
export async function passkeyReady() {
  if (!window.PublicKeyCredential || !navigator.credentials) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * The browser refused or the person closed the Windows window. Told apart
 * from a server refusal so the screen can simply offer to try again.
 */
export function isPromptCancelled(error) {
  return error instanceof DOMException || error?.name === 'NotAllowedError' || error?.name === 'AbortError'
}

/** Ask Windows to create the passkey of this machine. */
export async function createPasskey(options) {
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: toBuffer(options.challenge),
      user: { ...options.user, id: toBuffer(options.user.id) },
    },
  })

  return {
    clientDataJSON: toText(credential.response.clientDataJSON),
    attestationObject: toText(credential.response.attestationObject),
  }
}

/** Ask Windows to sign the login challenge with the passkey of this machine. */
export async function signWithPasskey(options) {
  const credential = await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: toBuffer(options.challenge),
      ...(options.allowCredentials
        ? { allowCredentials: options.allowCredentials.map((c) => ({ ...c, id: toBuffer(c.id) })) }
        : {}),
    },
  })

  return {
    id: toText(credential.rawId),
    clientDataJSON: toText(credential.response.clientDataJSON),
    authenticatorData: toText(credential.response.authenticatorData),
    signature: toText(credential.response.signature),
  }
}

/**
 * The id of this machine's passkey, kept so the login can ask for exactly
 * that one. It is not a secret: knowing it opens nothing without the PC.
 */
export const rememberedDevice = {
  get: () => localStorage.getItem(REMEMBER_KEY),
  set: (id) => localStorage.setItem(REMEMBER_KEY, id),
  clear: () => localStorage.removeItem(REMEMBER_KEY),
}

/**
 * "Remember this machine": given after a PIN check, it lets the next logins
 * skip the PIN until it expires (30 days). The server exchanges it for a new
 * one at every login.
 */
export const rememberedMark = {
  get: () => localStorage.getItem(MARK_KEY),
  set: (mark) => (mark ? localStorage.setItem(MARK_KEY, mark) : null),
}
