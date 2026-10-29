import { reactive, readonly } from 'vue'
import RingoverSDK from 'ringover-sdk'
import { callsApi } from '@/api/calls'

/**
 * The embedded Ringover phone (one per browser tab) and the call in progress.
 *
 * The agent signs in to Ringover inside the iframe with their own Ringover
 * account; the CRM never sees their credentials. Events posted by the iframe
 * are only used for display and to link the CRM call to Ringover's call id:
 * Ringover's signed webhooks remain the source of truth for the call history.
 */

const DIAL_TIMEOUT_MS = 60_000

const state = reactive({
  initialised: false,
  ready: false,
  // Ringover user signed in inside the iframe, and the one linked to the CRM user.
  signedInUserId: null,
  linkedUserId: null,
  // { crmCallId, ringoverCallId, lead, direction, number, phase, startedAt, answeredAt }
  active: null,
  // { crmCallId, lead, talkSeconds } — drives the after-call popup.
  postCall: null,
  // Lead the agent asked to call before signing in: dialled once they are signed in.
  pendingLead: null,
  // Slide-over panel holding the phone
  open: false,
})

let sdk = null
let dialTimer = null

const digits = (n) => String(n ?? '').replace(/\D/g, '')
const sameNumber = (a, b) => digits(a) !== '' && digits(a) === digits(b)

function isCurrentCall(data) {
  return state.active && (
    (state.active.ringoverCallId && String(data.call_id) === state.active.ringoverCallId)
    || (!state.active.ringoverCallId && sameNumber(data.direction === 'in' ? data.from_number : data.to_number, state.active.number))
  )
}

function onSignedIn(e) {
  state.ready = true
  state.signedInUserId = e?.data?.userId != null ? String(e.data.userId) : null

  // The agent clicked "Call" before signing in: place that call now.
  const lead = state.pendingLead
  state.pendingLead = null
  if (lead && !state.active) callLead(lead).catch(() => {})
}

function onRinging(e) {
  const data = e?.data ?? {}

  if (data.internal) return

  if (state.active && !state.active.ringoverCallId && isCurrentCall(data)) {
    clearTimeout(dialTimer)
    state.active.ringoverCallId = String(data.call_id)
    state.active.phase = 'ringing'
    // Best effort: the webhook matches the call by number anyway.
    if (state.active.crmCallId) {
      callsApi.linkRingover(state.active.crmCallId, data.call_id).catch(() => {})
    }
    return
  }

  if (!state.active && data.direction === 'in') {
    state.active = {
      crmCallId: null,
      ringoverCallId: String(data.call_id),
      lead: null,
      direction: 'in',
      number: data.from_number,
      phase: 'ringing',
      startedAt: Date.now(),
      answeredAt: null,
    }
    // Slide the phone in so the agent can pick up
    state.open = true
  }
}

function onAnswered(e) {
  if (isCurrentCall(e?.data ?? {})) {
    state.active.phase = 'answered'
    state.active.answeredAt = Date.now()
  }
}

function onHangup(e) {
  const data = e?.data ?? {}
  if (!isCurrentCall(data)) return

  const ended = state.active
  state.active = null

  // Only calls started from the CRM have a lead and a CRM call to annotate.
  if (ended.crmCallId) {
    state.postCall = {
      crmCallId: ended.crmCallId,
      lead: ended.lead,
      talkSeconds: Number(data.callDuration ?? 0) || (ended.answeredAt ? Math.round((Date.now() - ended.answeredAt) / 1000) : 0),
    }
  }
}

/**
 * Create the iframe once, filling `containerId` (the CRM's slide-over panel,
 * which opens and closes it, so Ringover's own tray button is not used).
 */
function init({ linkedUserId, containerId }) {
  state.linkedUserId = linkedUserId ? String(linkedUserId) : null
  if (state.initialised) return

  sdk = new RingoverSDK({
    type: 'relative',
    size: 'auto',
    container: containerId,
    animation: false,
    trayicon: false,
  })
  sdk.generate()
  sdk.show()

  sdk.on('dialerReady', onSignedIn)
  sdk.on('login', onSignedIn)
  sdk.on('logout', () => {
    state.ready = false
    state.signedInUserId = null
    state.pendingLead = null
  })
  sdk.on('ringingCall', onRinging)
  sdk.on('answeredCall', onAnswered)
  sdk.on('hangupCall', onHangup)

  state.initialised = true
}

function destroy() {
  if (!sdk) return
  sdk.off()
  sdk.destroy()
  sdk = null
  clearTimeout(dialTimer)
  Object.assign(state, { initialised: false, ready: false, signedInUserId: null, active: null, postCall: null, pendingLead: null, open: false })
}

/**
 * Call a lead: record the attempt in the CRM, then dial it in the phone.
 * Not signed in to Ringover yet: open the phone on its sign-in screen and
 * dial once the agent is signed in (returns "sign_in" in that case).
 * Throws with a user-facing message when the call cannot start.
 */
async function callLead(lead) {
  if (!sdk) throw new Error('phone_unavailable')
  if (state.active) throw new Error('call_in_progress')

  if (!state.ready) {
    state.pendingLead = {
      id: lead.id,
      reference: lead.reference,
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone,
    }
    state.open = true
    return 'sign_in'
  }

  const { call, dial } = await callsApi.initiate(lead.id)
  state.open = true

  state.active = {
    crmCallId: call.id,
    ringoverCallId: null,
    lead: { id: lead.id, reference: lead.reference, name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') },
    direction: 'out',
    number: dial.to,
    phase: 'dialing',
    startedAt: Date.now(),
    answeredAt: null,
  }

  // No CRM-side number: Ringover dials from the signed-in account's default line.
  if (!(dial.from ? sdk.dial(dial.to, dial.from) : sdk.dial(dial.to))) {
    state.active = null
    throw new Error('phone_unavailable')
  }

  // If Ringover never reports the call (not signed in, dial cancelled), free the UI.
  clearTimeout(dialTimer)
  dialTimer = setTimeout(() => {
    if (state.active?.crmCallId === call.id && state.active.phase === 'dialing') state.active = null
  }, DIAL_TIMEOUT_MS)
}

function showPhone() {
  state.open = true
}

function hidePhone() {
  state.open = false
}

function togglePhone() {
  state.open = !state.open
}

function closePostCall() {
  state.postCall = null
}

export function useRingoverPhone() {
  return {
    state: readonly(state),
    init,
    destroy,
    callLead,
    showPhone,
    hidePhone,
    togglePhone,
    closePostCall,
  }
}
