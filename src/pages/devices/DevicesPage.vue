<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, Check, Clock, MonitorCheck, Pencil, RotateCcw, Trash2, X } from 'lucide-vue-next'
import { useDevicesStore } from '@/stores/devices.store'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import { firstErrorMessage } from '@/utils/errors'
import { formatDate, formatRelative } from '@/utils/formatters'
import AppBadge from '@/components/base/AppBadge.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppPageHeader from '@/components/base/AppPageHeader.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

const { t } = useI18n()
const store = useDevicesStore()
const ui = useUiStore()
const toast = useToast()

const MODES = ['off', 'prepare', 'on']
const STATUS_VARIANT = { pending: 'warning', approved: 'success', revoked: 'danger' }

onMounted(() => store.fetchList())

const mode = computed(() => store.settings?.mode ?? 'off')
const counts = computed(() => store.settings?.counts ?? { pending: 0, approved: 0, revoked: 0 })
const pending = computed(() => store.list.filter((d) => d.status === 'pending'))
const machines = computed(() => store.list.filter((d) => d.status !== 'pending'))

const name = (device) => device.label || t('devices.unnamed', { n: device.id })

async function run(action, success) {
  try {
    await action()
    toast.showSuccess(success)
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

/* ── The switch ───────────────────────────────────────────────── */
async function changeMode(target) {
  if (target === mode.value || store.loading.mode) return

  // Turning it on closes sessions: say what is about to happen first
  if (target === 'on') {
    const ok = await ui.confirm(
      t('devices.confirmOnTitle'),
      counts.value.approved
        ? t('devices.confirmOnText', { n: counts.value.approved }, counts.value.approved)
        : t('devices.confirmOnTextNone'),
      { confirmLabel: t('devices.confirmOnAction') },
    )
    if (!ok) return
  }

  try {
    const result = await store.setMode(target)
    toast.showSuccess(
      result.closed_sessions
        ? t('devices.modeChangedClosed', { n: result.closed_sessions }, result.closed_sessions)
        : t('devices.modeChanged'),
    )
  } catch (e) {
    toast.showError(firstErrorMessage(e, t('common.noData')))
  }
}

/* ── Actions on a machine ─────────────────────────────────────── */
const approve = (device) => run(() => store.approve(device.id), t('devices.approved'))

async function refuse(device) {
  const ok = await ui.confirm(t('devices.refuseTitle'), t('devices.refuseText'), { confirmLabel: t('devices.refuse') })
  if (ok) run(() => store.remove(device.id), t('devices.refused'))
}

async function revoke(device) {
  const ok = await ui.confirm(t('devices.revokeTitle'), t('devices.revokeText', { name: name(device) }), {
    confirmLabel: t('devices.revoke'),
  })
  if (ok) run(() => store.revoke(device.id), t('devices.revoked'))
}

async function remove(device) {
  const ok = await ui.confirm(t('devices.deleteTitle'), t('devices.deleteText', { name: name(device) }), {
    confirmLabel: t('common.delete'),
  })
  if (ok) run(() => store.remove(device.id), t('devices.deleted'))
}

/* ── Rename ───────────────────────────────────────────────────── */
const renaming = ref(null)
const label = ref('')

function openRename(device) {
  renaming.value = device
  label.value = device.label ?? ''
}

async function submitRename() {
  await run(() => store.rename(renaming.value.id, label.value.trim() || null), t('devices.renamed'))
  renaming.value = null
}

const GRID = 'grid grid-cols-[minmax(200px,1.4fr)_minmax(150px,1fr)_minmax(170px,1.1fr)_110px_96px] items-center gap-x-4 px-5'
const ICON_BTN = 'w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100'
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <AppPageHeader :eyebrow="t('nav.organization')" :title="t('devices.title')" :subtitle="t('devices.subtitle')" />

    <!-- The switch -->
    <section class="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[13px] font-medium text-gray-900">{{ t('devices.restriction') }}</p>
          <p class="text-[13px] text-gray-600 mt-0.5">{{ t('devices.modeHelp.' + mode) }}</p>
        </div>
        <div role="group" :aria-label="t('devices.restriction')" class="flex gap-0.5 p-[3px] rounded-lg bg-gray-100 shrink-0">
          <button
            v-for="m in MODES"
            :key="m"
            type="button"
            :aria-pressed="mode === m"
            :disabled="store.loading.mode || !store.settings"
            :class="[
              'h-8 px-3 rounded-md text-[13px] font-medium transition-colors disabled:opacity-60',
              mode === m
                ? m === 'on' ? 'bg-primary text-white' : 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ]"
            @click="changeMode(m)"
          >{{ t('devices.modes.' + m) }}</button>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        {{ t('devices.summary', { approved: counts.approved, pending: counts.pending }) }}
      </p>

      <details class="text-[13px] text-gray-700">
        <summary class="cursor-pointer text-primary font-medium w-fit">{{ t('devices.prepareTitle') }}</summary>
        <ol class="mt-2 space-y-1 list-decimal list-inside text-gray-600">
          <li>{{ t('devices.prepareStep1') }}</li>
          <li>{{ t('devices.prepareStep2') }}</li>
          <li>{{ t('devices.prepareStep3') }}</li>
          <li>{{ t('devices.prepareStep4') }}</li>
        </ol>
      </details>
    </section>

    <!-- Requests waiting -->
    <section
      v-for="device in pending"
      :key="device.id"
      class="bg-white border border-warning/50 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
    >
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-9 h-9 rounded-full bg-warning-bg text-warning-text flex items-center justify-center shrink-0">
          <Clock class="w-4 h-4" />
        </span>
        <div class="min-w-0 text-[13px]">
          <p class="font-medium text-gray-900">{{ t('devices.newRequest') }}</p>
          <p class="text-gray-600 truncate">
            {{ t('devices.requestedBy', { name: device.registered_by?.name ?? '—' }) }}
            · {{ device.browser ?? '—' }} · {{ formatRelative(device.created_at) }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <AppButton variant="secondary" size="sm" :disabled="store.loading.action" @click="refuse(device)">
          <template #icon><X class="w-3.5 h-3.5" /></template>
          {{ t('devices.refuse') }}
        </AppButton>
        <AppButton size="sm" :disabled="store.loading.action" @click="approve(device)">
          <template #icon><Check class="w-3.5 h-3.5" /></template>
          {{ t('devices.approve') }}
        </AppButton>
      </div>
    </section>

    <!-- Machines -->
    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[820px] text-[13px]" role="table" :aria-label="t('devices.title')">
          <div role="row" :class="[GRID, 'h-10 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600']">
            <span role="columnheader">{{ t('devices.colMachine') }}</span>
            <span role="columnheader">{{ t('devices.colRegistered') }}</span>
            <span role="columnheader">{{ t('devices.colLastUse') }}</span>
            <span role="columnheader">{{ t('devices.colStatus') }}</span>
            <span role="columnheader"><span class="sr-only">{{ t('common.actions') }}</span></span>
          </div>

          <template v-if="store.loading.list && !store.list.length">
            <div v-for="n in 3" :key="n" :class="[GRID, 'h-[60px] border-b border-gray-100']">
              <AppSkeleton height="12px" width="60%" /><AppSkeleton height="10px" width="50%" /><AppSkeleton height="10px" width="55%" /><AppSkeleton height="10px" /><span />
            </div>
          </template>

          <div v-else-if="!machines.length" class="flex flex-col items-center gap-2 py-14 text-center">
            <span class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><MonitorCheck class="w-5 h-5" /></span>
            <p class="text-[13px] text-gray-600 max-w-sm">{{ t(pending.length ? 'devices.emptyPending' : 'devices.empty') }}</p>
          </div>

          <template v-else>
            <div
              v-for="device in machines"
              :key="device.id"
              role="row"
              :class="[GRID, 'min-h-[60px] py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50']"
            >
              <div role="cell" class="min-w-0">
                <p :class="['font-medium truncate', device.label ? 'text-gray-900' : 'text-gray-500']">{{ name(device) }}</p>
                <p class="text-xs text-gray-500 truncate">{{ device.browser ?? '—' }}</p>
              </div>
              <div role="cell" class="min-w-0">
                <p class="text-gray-900 truncate">{{ device.registered_by?.name ?? '—' }}</p>
                <p class="text-xs text-gray-500">{{ formatDate(device.created_at) }}</p>
              </div>
              <div role="cell" class="min-w-0">
                <template v-if="device.last_used_at">
                  <p class="text-gray-900 truncate">{{ device.last_used_by?.name ?? '—' }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ formatRelative(device.last_used_at) }}<template v-if="device.last_ip"> · {{ device.last_ip }}</template></p>
                </template>
                <p v-else class="text-gray-500">{{ t('devices.neverUsed') }}</p>
              </div>
              <div role="cell">
                <AppBadge :variant="STATUS_VARIANT[device.status]" :label="t('devices.status.' + device.status)" />
                <p v-if="device.revoked_reason === 'counter'" class="text-xs text-danger-text mt-0.5">{{ t('devices.clonedKey') }}</p>
              </div>
              <span role="cell" class="flex justify-end gap-0.5">
                <button type="button" :title="t('devices.rename')" :aria-label="t('devices.rename')" :class="ICON_BTN" @click="openRename(device)">
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="device.status === 'approved'"
                  type="button"
                  :title="t('devices.revoke')"
                  :aria-label="t('devices.revoke')"
                  class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
                  @click="revoke(device)"
                ><Ban class="w-3.5 h-3.5" /></button>
                <template v-else>
                  <button type="button" :title="t('devices.reactivate')" :aria-label="t('devices.reactivate')" :class="ICON_BTN" @click="approve(device)">
                    <RotateCcw class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    :title="t('common.delete')"
                    :aria-label="t('common.delete')"
                    class="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-danger-text hover:bg-danger-bg"
                    @click="remove(device)"
                  ><Trash2 class="w-3.5 h-3.5" /></button>
                </template>
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <AppModal :open="!!renaming" :title="t('devices.rename')" size="sm" @close="renaming = null">
      <form class="space-y-4" @submit.prevent="submitRename">
        <AppInput v-model="label" :label="t('devices.name')" :placeholder="t('devices.namePlaceholder')" :hint="t('devices.nameHint')" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="renaming = null">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="store.loading.action" @click="submitRename">{{ t('common.save') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
