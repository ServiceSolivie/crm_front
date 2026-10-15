<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Ban, Clock, Loader2, MonitorCheck, MonitorUp } from 'lucide-vue-next'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth.store'
import {
  createPasskey,
  isPromptCancelled,
  passkeyReady,
  rememberedDevice,
  signWithPasskey,
} from '@/utils/webauthn'

/**
 * Approved machines: what happens between the password and the CRM.
 *
 * `device` is what the login answered: { ticket, mode, known, options }.
 *   mode 'on'      → the machine must prove itself before any session exists
 *   mode 'prepare' → rehearsal: the session is already open, nothing here blocks
 *
 * A known machine signs the challenge (Windows asks for the PIN). An unknown
 * one is offered to register, then waits for the super admin.
 */
const props = defineProps({
  device: { type: Object, required: true },
})
const emit = defineEmits(['done', 'back'])

const { t } = useI18n()
const auth = useAuthStore()

const rehearsal = computed(() => props.device.mode === 'prepare')

// checking | cancelled | register | hello | pending | revoked | synced | failed
const view = ref(props.device.known ? 'checking' : 'register')
const busy = ref(false)
const message = ref('')

const reason = (error) => error?.errors?.code ?? null

onMounted(() => {
  if (props.device.known) check()
})

/** The machine signs the login challenge. */
async function check() {
  view.value = 'checking'
  busy.value = true
  try {
    const assertion = await signWithPasskey(props.device.options)
    await auth.verifyDevice(props.device.ticket, assertion)
    rememberedDevice.set(assertion.id)
    emit('done')
  } catch (error) {
    // Rehearsal: whatever happened, the person keeps working
    if (rehearsal.value) return emit('done')

    // An unknown machine that claimed to be registered goes back to the choice it came from
    if (isPromptCancelled(error)) view.value = props.device.known ? 'cancelled' : 'register'
    else if (reason(error) === 'device_pending') view.value = 'pending'
    else if (reason(error) === 'device_revoked') view.value = 'revoked'
    else if (reason(error) === 'device_unknown') {
      rememberedDevice.clear()
      view.value = 'register'
    } else if (reason(error) === 'ticket_expired') emit('back', error.message)
    else fail(error)
  } finally {
    busy.value = false
  }
}

/** Windows creates the passkey of this machine; the request goes to the super admin. */
async function register() {
  if (!(await passkeyReady())) {
    view.value = 'hello'
    return
  }

  busy.value = true
  try {
    const { data } = await authApi.deviceRegisterOptions(props.device.ticket)
    const credential = await createPasskey(data.options)
    const saved = await authApi.registerDevice({ ticket: props.device.ticket, ...credential })
    rememberedDevice.set(saved.data.credential_id)
    view.value = 'pending'
  } catch (error) {
    if (isPromptCancelled(error)) view.value = 'register'
    else if (reason(error) === 'device_synced_key') view.value = 'synced'
    else if (reason(error) === 'ticket_expired') emit('back', error.message)
    else fail(error)
  } finally {
    busy.value = false
  }
}

function fail(error) {
  message.value = error?.message ?? t('devices.login.failedText')
  view.value = 'failed'
}

// Leaving a blocked screen: back to the password, or into the CRM during the rehearsal
function leave() {
  if (rehearsal.value) emit('done')
  else emit('back')
}

const PRIMARY = 'h-11 w-full rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60'
const SECONDARY = 'h-11 w-full rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60'
const LINK = 'text-[13px] text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline'
</script>

<template>
  <div class="flex flex-col items-center gap-4 text-center" aria-live="polite">
    <!-- Windows is asking for the PIN -->
    <template v-if="view === 'checking'">
      <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center">
        <Loader2 class="w-5 h-5 animate-spin" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.checkingTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t('devices.login.checkingText') }}</p>
      </div>
    </template>

    <template v-else-if="view === 'cancelled'">
      <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center">
        <MonitorCheck class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.cancelledTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t('devices.login.cancelledText') }}</p>
      </div>
      <button type="button" :class="PRIMARY" :disabled="busy" @click="check">{{ t('devices.login.verify') }}</button>
      <button type="button" :class="LINK" @click="leave">{{ t('devices.login.backToLogin') }}</button>
    </template>

    <!-- Unknown machine -->
    <template v-else-if="view === 'register'">
      <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center">
        <MonitorUp class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.registerTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t(rehearsal ? 'devices.login.registerTextRehearsal' : 'devices.login.registerText') }}</p>
      </div>
      <button type="button" :class="PRIMARY" :disabled="busy" @click="register">
        {{ busy ? t('common.loading') : t('devices.login.register') }}
      </button>
      <button v-if="rehearsal" type="button" :class="SECONDARY" :disabled="busy" @click="emit('done')">{{ t('devices.login.later') }}</button>
      <template v-else>
        <!-- The browser forgot this machine (data cleared) but Windows still has its passkey -->
        <button type="button" :class="LINK" :disabled="busy" @click="check">{{ t('devices.login.alreadyRegistered') }}</button>
        <button type="button" :class="LINK" @click="leave">{{ t('devices.login.backToLogin') }}</button>
      </template>
    </template>

    <!-- Windows Hello has no PIN yet -->
    <template v-else-if="view === 'hello'">
      <span class="w-12 h-12 rounded-full bg-warning-bg text-warning-text flex items-center justify-center">
        <AlertTriangle class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.helloTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t('devices.login.helloText') }}</p>
      </div>
      <ol class="w-full text-left text-[13px] text-gray-700 space-y-1.5 list-decimal list-inside bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <li>{{ t('devices.login.helloStep1') }}</li>
        <li>{{ t('devices.login.helloStep2') }}</li>
        <li>{{ t('devices.login.helloStep3') }}</li>
      </ol>
      <button type="button" :class="PRIMARY" :disabled="busy" @click="register">{{ t('devices.login.retry') }}</button>
      <button type="button" :class="LINK" @click="leave">{{ t(rehearsal ? 'devices.login.later' : 'devices.login.backToLogin') }}</button>
    </template>

    <template v-else-if="view === 'pending'">
      <span class="w-12 h-12 rounded-full bg-warning-bg text-warning-text flex items-center justify-center">
        <Clock class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.pendingTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t(rehearsal ? 'devices.login.pendingTextRehearsal' : 'devices.login.pendingText') }}</p>
      </div>
      <button type="button" :class="rehearsal ? PRIMARY : SECONDARY" @click="leave">
        {{ t(rehearsal ? 'devices.login.continue' : 'devices.login.backToLogin') }}
      </button>
    </template>

    <template v-else-if="view === 'revoked'">
      <span class="w-12 h-12 rounded-full bg-danger-bg text-danger-text flex items-center justify-center">
        <Ban class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.revokedTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t('devices.login.revokedText') }}</p>
      </div>
      <button type="button" :class="SECONDARY" @click="leave">{{ t('devices.login.backToLogin') }}</button>
    </template>

    <!-- The passkey was saved in a Google / Microsoft account instead of this PC -->
    <template v-else-if="view === 'synced'">
      <span class="w-12 h-12 rounded-full bg-warning-bg text-warning-text flex items-center justify-center">
        <AlertTriangle class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.syncedTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ t('devices.login.syncedText') }}</p>
      </div>
      <button type="button" :class="PRIMARY" :disabled="busy" @click="register">{{ t('devices.login.retry') }}</button>
      <button type="button" :class="LINK" @click="leave">{{ t(rehearsal ? 'devices.login.later' : 'devices.login.backToLogin') }}</button>
    </template>

    <template v-else>
      <span class="w-12 h-12 rounded-full bg-danger-bg text-danger-text flex items-center justify-center">
        <AlertTriangle class="w-5 h-5" />
      </span>
      <div>
        <h1 class="font-display text-xl font-semibold tracking-tight text-gray-900">{{ t('devices.login.failedTitle') }}</h1>
        <p class="text-[13.5px] text-gray-600 mt-1">{{ message }}</p>
      </div>
      <button type="button" :class="SECONDARY" @click="leave">{{ t(rehearsal ? 'devices.login.continue' : 'devices.login.backToLogin') }}</button>
    </template>
  </div>
</template>
