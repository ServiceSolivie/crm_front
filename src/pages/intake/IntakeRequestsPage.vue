<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy, Check, Eye, EyeOff, RefreshCw, Trash2, KeyRound, Inbox, RotateCw } from 'lucide-vue-next'
import { intakeApi } from '@/api/intake'
import { useToast } from '@/composables/useToast'
import { useUiStore } from '@/stores/ui.store'
import { formatDateTime } from '@/utils/formatters'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/**
 * Super admin: the marketing intake endpoint in its test phase. Shows the
 * address and key to give to the marketing team, and every request received
 * exactly as it arrived (no lead is created yet), so their format can be
 * studied before the real import is built.
 */
const { t } = useI18n()
const toast = useToast()
const ui = useUiStore()

/* ── Address and key ───────────────────────────────────────── */
const settings = ref(null)
const showKey = ref(false)
const copied = ref('')

async function loadSettings() {
  try {
    settings.value = (await intakeApi.settings()).data
  } catch {
    toast.showError(t('intake.loadError'))
  }
}

const maskedKey = computed(() => {
  const key = settings.value?.key
  if (!key) return ''
  return showKey.value ? key : `${key.slice(0, 3)}${'•'.repeat(20)}${key.slice(-4)}`
})

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // The clipboard API needs https or localhost: fall back to the old way
    const field = document.createElement('textarea')
    field.value = text
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    if (!ok) {
      toast.showError(t('intake.copyFailed'))
      return
    }
  }
  copied.value = what
  setTimeout(() => {
    if (copied.value === what) copied.value = ''
  }, 2000)
}

async function regenerateKey() {
  if (settings.value?.key) {
    const ok = await ui.confirm(t('intake.newKeyTitle'), t('intake.newKeyConfirm'), { confirmLabel: t('intake.newKey') })
    if (!ok) return
  }
  try {
    const { data } = await intakeApi.regenerateKey()
    settings.value = { ...settings.value, key: data.key }
    showKey.value = true
    toast.showSuccess(t('intake.keyCreated'))
  } catch {
    toast.showError(t('intake.actionError'))
  }
}

/* ── Requests received ─────────────────────────────────────── */
const requests = ref([])
const meta = ref({ total: 0, current_page: 1, last_page: 1 })
const loading = ref(false)
const selected = ref(null)
const detail = ref(null)
const detailLoading = ref(false)

async function loadRequests(page = 1) {
  loading.value = true
  try {
    const { data } = await intakeApi.requests({ page, per_page: 25 })
    requests.value = data.data
    meta.value = data.meta
    if (selected.value && !requests.value.some((r) => r.id === selected.value)) {
      selected.value = null
      detail.value = null
    }
  } catch {
    toast.showError(t('intake.loadError'))
  } finally {
    loading.value = false
  }
}

async function open(id) {
  selected.value = id
  detailLoading.value = true
  try {
    detail.value = (await intakeApi.request(id)).data
  } catch {
    toast.showError(t('intake.loadError'))
  } finally {
    detailLoading.value = false
  }
}

async function remove(id) {
  const ok = await ui.confirm(t('intake.deleteTitle'), t('intake.deleteConfirm'), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await intakeApi.remove(id)
    if (selected.value === id) {
      selected.value = null
      detail.value = null
    }
    await loadRequests(meta.value.current_page)
  } catch {
    toast.showError(t('intake.actionError'))
  }
}

async function removeAll() {
  const ok = await ui.confirm(t('intake.deleteAllTitle'), t('intake.deleteAllConfirm', { n: meta.value.total }), { confirmLabel: t('common.delete') })
  if (!ok) return
  try {
    await intakeApi.removeAll()
    selected.value = null
    detail.value = null
    await loadRequests(1)
  } catch {
    toast.showError(t('intake.actionError'))
  }
}

onMounted(() => {
  loadSettings()
  loadRequests()
})

/* ── Display helpers ───────────────────────────────────────── */
function formatOf(r) {
  const type = (r.content_type ?? '').toLowerCase()
  if (!r.key_valid) return { label: t('intake.format.invalidKey'), cls: 'bg-danger-bg text-danger-text' }
  if (!r.size) return { label: t('intake.format.empty'), cls: 'bg-gray-100 text-gray-600' }
  if (type.includes('json')) return { label: 'JSON', cls: 'bg-primary-light text-primary-hover' }
  if (type.includes('x-www-form-urlencoded')) return { label: t('intake.format.form'), cls: 'bg-warning-bg text-warning-text' }
  if (type.includes('multipart')) return { label: t('intake.format.multipart'), cls: 'bg-warning-bg text-warning-text' }
  if (type.includes('xml')) return { label: 'XML', cls: 'bg-gray-100 text-gray-700' }
  return { label: t('intake.format.other'), cls: 'bg-gray-100 text-gray-700' }
}

function size(bytes) {
  if (bytes < 1024) return `${bytes} o`
  return `${(Math.round((bytes / 1024) * 10) / 10).toLocaleString('fr-FR')} ko`
}

// The body made readable: indented JSON, or form fields one per line
const prettyBody = computed(() => {
  const body = detail.value?.body
  if (!body) return ''
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    // not JSON
  }
  if ((detail.value.content_type ?? '').includes('x-www-form-urlencoded')) {
    try {
      return [...new URLSearchParams(body)].map(([k, v]) => `${k} = ${v}`).join('\n')
    } catch {
      // not decodable: shown raw
    }
  }
  return body
})

const keyVia = (via) => (via ? t('intake.keyVia.' + via) : t('intake.keyVia.none'))

const card = 'bg-white border border-gray-200 rounded-xl'
const smallBtn = 'h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5 disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('intake.title') }}</h1>
        <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-light text-primary-hover">{{ t('intake.superAdmin') }}</span>
      </div>
      <p class="text-[13px] text-gray-500 mt-0.5">{{ t('intake.subtitle') }}</p>
    </div>

    <!-- Address and key to give to the marketing team -->
    <section :class="[card, 'px-5 py-4 flex flex-col gap-3']">
      <div v-if="!settings" class="space-y-2.5">
        <AppSkeleton height="32px" />
        <AppSkeleton height="32px" />
      </div>
      <template v-else>
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="w-20 text-[12.5px] text-gray-600">{{ t('intake.address') }}</span>
          <code class="flex-1 min-w-[240px] px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-100 text-[12.5px] text-gray-900 break-all">POST {{ settings.url }}</code>
          <button type="button" :class="smallBtn" @click="copy(settings.url, 'url')">
            <component :is="copied === 'url' ? Check : Copy" class="w-3.5 h-3.5" />{{ copied === 'url' ? t('intake.copied') : t('intake.copy') }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="w-20 text-[12.5px] text-gray-600">{{ t('intake.key') }}</span>
          <template v-if="settings.key">
            <code class="flex-1 min-w-[240px] px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-100 text-[12.5px] text-gray-900 break-all">{{ maskedKey }}</code>
            <button type="button" :class="smallBtn" @click="showKey = !showKey">
              <component :is="showKey ? EyeOff : Eye" class="w-3.5 h-3.5" />{{ showKey ? t('intake.hide') : t('intake.show') }}
            </button>
            <button type="button" :class="smallBtn" @click="copy(settings.key, 'key')">
              <component :is="copied === 'key' ? Check : Copy" class="w-3.5 h-3.5" />{{ copied === 'key' ? t('intake.copied') : t('intake.copy') }}
            </button>
            <button type="button" :class="[smallBtn, 'text-danger-text']" @click="regenerateKey">
              <RefreshCw class="w-3.5 h-3.5" />{{ t('intake.newKey') }}
            </button>
          </template>
          <template v-else>
            <span class="flex-1 text-[13px] text-gray-500">{{ t('intake.noKey') }}</span>
            <button type="button" class="h-8 px-3 rounded-lg bg-primary text-white text-[12.5px] font-medium hover:bg-primary-hover inline-flex items-center gap-1.5" @click="regenerateKey">
              <KeyRound class="w-3.5 h-3.5" />{{ t('intake.createKey') }}
            </button>
          </template>
        </div>
        <p class="text-xs text-gray-500">{{ t('intake.howToSend') }}</p>
        <p class="text-xs text-gray-500">{{ t('intake.retention', { n: settings.retention_days }) }}</p>
      </template>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 items-start">
      <!-- Requests received -->
      <section :class="[card, 'overflow-hidden']">
        <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
          <h2 class="font-display text-[15px] font-semibold text-gray-900">{{ t('intake.received', { n: meta.total }) }}</h2>
          <div class="flex items-center gap-2">
            <button type="button" :class="smallBtn" :disabled="loading" @click="loadRequests(meta.current_page)">
              <RotateCw :class="['w-3.5 h-3.5', loading ? 'animate-spin' : '']" />{{ t('intake.refresh') }}
            </button>
            <button v-if="meta.total" type="button" :class="[smallBtn, 'text-danger-text']" @click="removeAll">
              <Trash2 class="w-3.5 h-3.5" />{{ t('intake.deleteAll') }}
            </button>
          </div>
        </div>

        <div v-if="loading && !requests.length" class="p-4 space-y-2.5">
          <AppSkeleton v-for="n in 4" :key="n" height="36px" />
        </div>
        <div v-else-if="!requests.length" class="px-6 py-10 text-center">
          <Inbox class="w-8 h-8 mx-auto text-gray-300" />
          <p class="mt-2 text-sm font-medium text-gray-900">{{ t('intake.emptyTitle') }}</p>
          <p class="text-[13px] text-gray-500">{{ t('intake.emptyHint') }}</p>
        </div>
        <ul v-else>
          <li v-for="r in requests" :key="r.id">
            <button
              type="button"
              :class="[
                'w-full grid grid-cols-[150px_100px_60px_minmax(0,1fr)] gap-3 items-center px-4 py-2.5 text-left text-[12.5px] border-b border-gray-100',
                selected === r.id ? 'bg-primary-light/60' : 'hover:bg-gray-50',
              ]"
              @click="open(r.id)"
            >
              <span class="font-mono text-gray-900 whitespace-nowrap">{{ formatDateTime(r.received_at) }}</span>
              <span><span :class="['px-2 py-0.5 rounded-full text-[11px] font-medium', formatOf(r).cls]">{{ formatOf(r).label }}</span></span>
              <span class="font-mono text-gray-600">{{ size(r.size) }}</span>
              <span class="truncate text-gray-500">
                <template v-if="!r.key_valid">{{ t('intake.notKept') }}</template>
                <template v-else-if="r.preview">{{ r.preview }}</template>
                <template v-else>{{ t('intake.noContent', { method: r.method }) }}</template>
              </span>
            </button>
          </li>
        </ul>
        <div v-if="meta.last_page > 1" class="flex items-center justify-between px-4 py-2.5 text-[12.5px] text-gray-600">
          <button type="button" :class="smallBtn" :disabled="meta.current_page <= 1" @click="loadRequests(meta.current_page - 1)">‹</button>
          <span>{{ meta.current_page }} / {{ meta.last_page }}</span>
          <button type="button" :class="smallBtn" :disabled="meta.current_page >= meta.last_page" @click="loadRequests(meta.current_page + 1)">›</button>
        </div>
      </section>

      <!-- The selected request, as received -->
      <section :class="[card, 'px-4 py-3.5 xl:sticky xl:top-4']">
        <p v-if="!selected" class="py-10 text-center text-[13px] text-gray-500">{{ t('intake.pickOne') }}</p>
        <div v-else-if="detailLoading || !detail" class="space-y-2.5">
          <AppSkeleton height="20px" width="50%" />
          <AppSkeleton height="160px" />
        </div>
        <template v-else>
          <div class="flex items-center justify-between gap-2 mb-2">
            <h2 class="font-mono text-[14px] font-medium text-gray-900">{{ formatDateTime(detail.received_at) }}</h2>
            <div class="flex items-center gap-2">
              <button v-if="detail.body" type="button" :class="smallBtn" @click="copy(detail.body, 'body')">
                <component :is="copied === 'body' ? Check : Copy" class="w-3.5 h-3.5" />{{ copied === 'body' ? t('intake.copied') : t('intake.copy') }}
              </button>
              <button type="button" :class="[smallBtn, 'text-danger-text']" :aria-label="t('common.delete')" @click="remove(detail.id)">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <dl class="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12.5px] mb-3">
            <dt class="text-gray-500">{{ t('intake.meta.method') }}</dt><dd class="text-gray-900 font-mono">{{ detail.method }}</dd>
            <dt class="text-gray-500">{{ t('intake.meta.format') }}</dt><dd class="text-gray-900 break-all">{{ detail.content_type || '—' }}</dd>
            <dt class="text-gray-500">{{ t('intake.meta.size') }}</dt><dd class="text-gray-900">{{ size(detail.size) }}<span v-if="detail.truncated" class="text-warning-text"> · {{ t('intake.truncated') }}</span></dd>
            <dt class="text-gray-500">{{ t('intake.meta.key') }}</dt>
            <dd :class="detail.key_valid ? 'text-success-text' : 'text-danger-text'">{{ detail.key_valid ? t('intake.keyOk') : t('intake.keyBad') }} · {{ keyVia(detail.key_via) }}</dd>
            <dt class="text-gray-500">{{ t('intake.meta.ip') }}</dt><dd class="text-gray-900 font-mono">{{ detail.ip || '—' }}</dd>
            <dt class="text-gray-500">{{ t('intake.meta.userAgent') }}</dt><dd class="text-gray-900 break-all">{{ detail.user_agent || '—' }}</dd>
          </dl>

          <template v-if="detail.key_valid">
            <template v-if="detail.query && Object.keys(detail.query).length">
              <p class="text-[12px] font-medium text-gray-600 mb-1">{{ t('intake.queryParams') }}</p>
              <pre class="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-100 font-mono text-[12px] leading-5 text-gray-900 whitespace-pre-wrap break-all">{{ JSON.stringify(detail.query, null, 2) }}</pre>
            </template>
            <p class="text-[12px] font-medium text-gray-600 mb-1">{{ t('intake.body') }}</p>
            <pre v-if="detail.body" class="p-3 rounded-lg bg-gray-50 border border-gray-100 font-mono text-[12px] leading-5 text-gray-900 whitespace-pre-wrap break-all max-h-[480px] overflow-auto">{{ prettyBody }}</pre>
            <p v-else class="text-[13px] text-gray-500">{{ t('intake.emptyBody') }}</p>
          </template>
          <p v-else class="text-[13px] text-gray-500">{{ t('intake.invalidNotKept') }}</p>

          <details v-if="detail.headers" class="mt-3">
            <summary class="text-[12px] font-medium text-gray-600 cursor-pointer">{{ t('intake.headers') }}</summary>
            <pre class="mt-1 p-3 rounded-lg bg-gray-50 border border-gray-100 font-mono text-[11.5px] leading-5 text-gray-700 whitespace-pre-wrap break-all">{{ Object.entries(detail.headers).map(([k, v]) => `${k}: ${v}`).join('\n') }}</pre>
          </details>
        </template>
      </section>
    </div>
  </div>
</template>
