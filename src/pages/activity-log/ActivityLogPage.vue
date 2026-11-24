<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, ChevronDown, ChevronRight, Download, RefreshCw } from 'lucide-vue-next'
import { activityLogsApi } from '@/api/activityLogs'
import { usersApi } from '@/api/users'
import { useToast } from '@/composables/useToast'
import AppFilterChip from '@/components/base/AppFilterChip.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import AppErrorState from '@/components/base/AppErrorState.vue'
import ReportKpis from '@/components/modules/reports/ReportKpis.vue'

/**
 * « Journal d'activité » (super admin): every login attempt and every action
 * done in the CRM, who did it, when and from which IP.
 */
const { t, locale } = useI18n()
const toast = useToast()

const rows = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 50 })
const summary = ref(null)
const loading = ref(false)
const error = ref(null)
const open = ref(new Set())
const users = ref([])

const filters = reactive({ category: '', sensitive: false, user_id: '', period: 'last7', search: '', page: 1, per_page: 50 })

/* ── Labels ────────────────────────────────────────────────── */
const ENTITY = {
  lead: 'Lead', lead_note: 'Note', lead_document: 'Document', appointment: 'Rendez-vous', payment: 'Paiement', contract: 'Contrat',
  user: 'Utilisateur', team: 'Équipe', trusted_device: 'Machine', lead_source: 'Source', lead_status: 'Statut', insurance_type: 'Type d’assurance',
  lead_page: 'Page de leads', dvc_type: 'Type de DVC', document_requirement: 'Document requis', app_setting: 'Réglage',
}
const EVENT = { created: 'créé', updated: 'modifié', deleted: 'supprimé', restored: 'restauré' }
const ACTION = {
  'auth.login': 'Connexion', 'auth.login_failed': 'Connexion échouée', 'auth.login_blocked': 'Connexion bloquée',
  'auth.login_device_check': 'Vérification machine', 'auth.device_refused': 'Machine refusée', 'auth.logout': 'Déconnexion',
  'auth.password_changed': 'Mot de passe changé', 'auth.password_reset': 'Mot de passe réinitialisé',
  'lead.status_changed': 'Statut modifié', 'lead.assigned': 'Lead assigné', 'lead.payment_status_changed': 'Statut de paiement',
  'lead.dvc_changed': 'DVC modifié', 'lead_note.created': 'Note ajoutée', 'lead_document.created': 'Document ajouté',
  'appointment.created': 'RDV créé', 'payment.created': 'Paiement ajouté', 'contract.created': 'Contrat généré',
  'export.imported_leads': 'Export retours leads', 'contract.downloaded': 'Contrat téléchargé', 'document.downloaded': 'Document téléchargé',
  'import.completed': 'Import de fichier',
}
const FIELD = {
  status: 'Statut', assigned_to: 'Agent', gestion_assigned_to: 'Gestionnaire', team_id: 'Équipe', first_name: 'Prénom', last_name: 'Nom',
  phone: 'Téléphone', email: 'E-mail', city: 'Ville', address: 'Adresse', insurance_type: 'Assurance', lead_source_id: 'Source',
  payment_status: 'Paiement', dvc_status: 'DVC', expected_revenue: 'CA attendu', validated_at: 'Validé le', is_doublon: 'Doublon',
  doublon_of_lead_id: 'Doublon de', comment: 'Formulaire', company_name: 'Société', client_type: 'Type de client', is_active: 'Actif',
  name: 'Nom', label: 'Libellé', amount: 'Montant', scheduled_at: 'Date', note: 'Note', manager_id: 'Manager', leader_id: 'Chef d’équipe',
  stage: 'Étape', value: 'Valeur', deleted_at: 'Supprimé le',
}
function actionLabel(action) {
  if (ACTION[action]) return ACTION[action]
  const [entity, event] = action.split('.')
  return `${ENTITY[entity] ?? entity} ${EVENT[event] ?? event}`
}
function tone(r) {
  if (/failed|blocked|refused|deleted/.test(r.action)) return 'bg-danger-bg text-danger-text'
  if (r.action === 'auth.login' || r.action.endsWith('.created')) return 'bg-success-bg text-success-text'
  if (r.sensitive || r.action.startsWith('export') || r.action.endsWith('downloaded')) return 'bg-warning-bg text-warning-text'
  if (/status_changed|assigned/.test(r.action)) return 'bg-info-bg text-info-text'
  return 'bg-gray-100 text-gray-700'
}
const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))
const changeSummary = (r) =>
  Object.entries(r.changes ?? {}).slice(0, 2).map(([k, [a, b]]) => `${FIELD[k] ?? k} : ${fmt(a)} → ${fmt(b)}`).join(' · ')
const detailText = (r) => r.description || changeSummary(r) || (r.meta ? Object.entries(r.meta).map(([k, v]) => `${k} : ${fmt(v)}`).join(' · ') : '')

const dtf = computed(() => new Intl.DateTimeFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
const when = (iso) => (iso ? dtf.value.format(new Date(iso)) : '—')
const browser = (ua) => {
  if (!ua) return '—'
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome / Brave' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Autre'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return [b, os].filter(Boolean).join(' · ')
}

/* ── Filters ───────────────────────────────────────────────── */
const CATS = ['', 'auth', 'lead', 'payment', 'user', 'export', 'settings']
const periodOptions = computed(() => [
  { value: 'today', label: t('activityLog.today') },
  { value: 'last7', label: t('activityLog.last7') },
  { value: 'last30', label: t('activityLog.last30') },
  { value: 'all', label: t('activityLog.all') },
])
const userOptions = computed(() => users.value.map((u) => ({ value: u.id, label: u.name })))

function params() {
  const iso = (d) => d.toISOString().slice(0, 10)
  const days = { today: 0, last7: 6, last30: 29 }[filters.period]
  const from = days === undefined ? undefined : iso(new Date(Date.now() - days * 86400000))
  return {
    category: filters.category || undefined,
    sensitive: filters.sensitive ? 1 : undefined,
    user_id: filters.user_id || undefined,
    search: filters.search || undefined,
    from,
    page: filters.page,
    per_page: filters.per_page,
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [list, sum] = await Promise.all([activityLogsApi.list(params()), activityLogsApi.summary()])
    rows.value = list.data ?? []
    meta.value = list.meta ?? meta.value
    summary.value = sum
    open.value = new Set()
  } catch (e) {
    error.value = e?.message ?? t('activityLog.loadError')
  } finally {
    loading.value = false
  }
}

function setFilter(key, value) {
  filters[key] = value
  filters.page = 1
  load()
}
function pickCategory(cat) {
  filters.sensitive = cat === 'sensitive'
  setFilter('category', cat === 'sensitive' ? '' : cat)
}
watch(() => filters.search, () => { filters.page = 1; load() })

function toggle(id) {
  const s = new Set(open.value)
  s.has(id) ? s.delete(id) : s.add(id)
  open.value = s
}

async function exportCsv() {
  try {
    const blob = await activityLogsApi.exportCsv({ ...params(), page: undefined, per_page: undefined })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.showSuccess(t('activityLog.exported'))
  } catch (e) {
    toast.showError(e?.message ?? t('activityLog.loadError'))
  }
}

const kpis = computed(() => [
  { label: t('activityLog.kpi.logins'), value: summary.value?.logins_today ?? '—' },
  { label: t('activityLog.kpi.failed'), value: summary.value?.failed_today ?? '—', tone: summary.value?.failed_today ? 'danger' : undefined },
  { label: t('activityLog.kpi.leadActions'), value: summary.value?.lead_actions_today ?? '—' },
  { label: t('activityLog.kpi.sensitive'), value: summary.value?.sensitive_today ?? '—', tone: summary.value?.sensitive_today ? 'warning' : undefined },
])

const GRID = 'grid grid-cols-[112px_minmax(120px,0.9fr)_minmax(150px,1fr)_minmax(0,2.4fr)_110px] gap-3 items-center'

onMounted(async () => {
  load()
  try {
    users.value = (await usersApi.list({ per_page: 100 })).data ?? []
  } catch {
    users.value = []
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1440px] mx-auto">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('activityLog.title') }}</h1>
        <p class="text-[13px] text-gray-500 mt-0.5">{{ t('activityLog.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50" @click="load">
          <RefreshCw :class="['w-4 h-4 text-gray-500', loading ? 'animate-spin' : '']" />{{ t('common.refresh') }}
        </button>
        <button type="button" class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 hover:bg-gray-50" @click="exportCsv">
          <Download class="w-4 h-4 text-gray-500" />{{ t('activityLog.export') }}
        </button>
      </div>
    </div>

    <ReportKpis :items="kpis" :loading="loading && !summary" />

    <!-- Categories -->
    <div role="tablist" class="flex items-end gap-5 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
      <button
        v-for="cat in [...CATS, 'sensitive']"
        :key="cat || 'all'"
        type="button"
        role="tab"
        :aria-selected="cat === 'sensitive' ? filters.sensitive : !filters.sensitive && filters.category === cat"
        :class="[
          'h-9.5 -mb-px px-0.5 border-b-2 text-[13.5px]',
          (cat === 'sensitive' ? filters.sensitive : !filters.sensitive && filters.category === cat) ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
        @click="pickCategory(cat)"
      >{{ t('activityLog.cat.' + (cat || 'all')) }}</button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <AppSearchInput v-model="filters.search" class="w-full sm:w-[280px]" :placeholder="t('activityLog.search')" />
      <AppFilterChip :label="t('activityLog.user')" :model-value="filters.user_id" :options="userOptions" @update:model-value="(v) => setFilter('user_id', v)" />
      <AppFilterChip :label="t('activityLog.period')" :model-value="filters.period" :options="periodOptions" :searchable="false" @update:model-value="(v) => setFilter('period', v || 'all')" />
    </div>

    <AppErrorState v-if="error && !loading" :icon="AlertTriangle" :title="t('activityLog.loadError')" :description="error" :action-label="t('common.retry')" @action="load" />

    <section v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[880px] text-[13px]">
          <div :class="[GRID, 'px-5 h-9 text-xs text-gray-600 bg-gray-50 border-b border-gray-200']">
            <span>{{ t('activityLog.col.when') }}</span>
            <span>{{ t('activityLog.col.who') }}</span>
            <span>{{ t('activityLog.col.action') }}</span>
            <span>{{ t('activityLog.col.detail') }}</span>
            <span>{{ t('activityLog.col.ip') }}</span>
          </div>

          <template v-if="loading && !rows.length">
            <div v-for="n in 8" :key="n" class="px-5 py-3 border-b border-gray-100"><AppSkeleton height="12px" /></div>
          </template>

          <p v-else-if="!rows.length" class="py-12 text-center text-sm text-gray-500">{{ t('activityLog.empty') }}</p>

          <template v-for="r in rows" v-else :key="r.id">
            <button type="button" :class="[GRID, 'w-full px-5 py-2.5 text-left border-b border-gray-100 hover:bg-gray-50']" :aria-expanded="open.has(r.id)" @click="toggle(r.id)">
              <span class="flex items-center gap-1 font-mono text-[12px] text-gray-700">
                <component :is="open.has(r.id) ? ChevronDown : ChevronRight" class="w-3.5 h-3.5 text-gray-400 shrink-0" />{{ when(r.at) }}
              </span>
              <span class="truncate text-gray-900">{{ r.user_name || t('activityLog.noUser') }}</span>
              <span><span :class="['px-2 rounded-full text-[11.5px] leading-5 font-medium whitespace-nowrap', tone(r)]">{{ actionLabel(r.action) }}</span></span>
              <span class="min-w-0">
                <span v-if="r.subject_label" class="block truncate text-gray-900">{{ r.subject_label }}</span>
                <span class="block truncate text-[12px] text-gray-500">{{ detailText(r) }}</span>
              </span>
              <span class="font-mono text-[12px] text-gray-500 truncate">{{ r.ip || '—' }}</span>
            </button>

            <!-- Details -->
            <div v-if="open.has(r.id)" class="px-5 py-3 bg-gray-50/70 border-b border-gray-100 text-[13px]">
              <div class="grid gap-4 md:grid-cols-2">
                <div v-if="r.changes && Object.keys(r.changes).length">
                  <table class="w-full">
                    <thead><tr class="text-xs text-gray-500"><th class="text-left font-medium pb-1">&nbsp;</th><th class="text-left font-medium pb-1">{{ t('activityLog.before') }}</th><th class="text-left font-medium pb-1">{{ t('activityLog.after') }}</th></tr></thead>
                    <tbody>
                      <tr v-for="(c, k) in r.changes" :key="k" class="border-t border-gray-200/70 align-top">
                        <td class="py-1 pr-3 text-gray-600 whitespace-nowrap">{{ FIELD[k] ?? k }}</td>
                        <td class="py-1 pr-3 text-danger-text break-words">{{ fmt(c[0]) }}</td>
                        <td class="py-1 text-success-text break-words">{{ fmt(c[1]) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <dl class="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1">
                  <template v-if="r.description"><dt class="text-gray-500">{{ t('activityLog.details') }}</dt><dd class="text-gray-900 break-words">{{ r.description }}</dd></template>
                  <template v-for="(v, k) in r.meta ?? {}" :key="k"><dt class="text-gray-500">{{ k }}</dt><dd class="text-gray-900 break-words">{{ fmt(v) }}</dd></template>
                  <template v-if="r.subject_type === 'Lead' && r.subject_id">
                    <dt class="text-gray-500">Lead</dt>
                    <dd><RouterLink :to="{ name: 'leads.detail', params: { id: r.subject_id } }" class="text-primary hover:underline">{{ r.subject_label }}</RouterLink></dd>
                  </template>
                  <dt class="text-gray-500">IP</dt><dd class="font-mono text-gray-900">{{ r.ip || '—' }}</dd>
                  <dt class="text-gray-500">{{ t('activityLog.browser') }}</dt><dd class="text-gray-900" :title="r.user_agent">{{ browser(r.user_agent) }}</dd>
                </dl>
              </div>
            </div>
          </template>
        </div>
      </div>
      <AppPagination
        v-if="meta.last_page > 1"
        :current-page="meta.current_page"
        :last-page="meta.last_page"
        :total="meta.total"
        :per-page="meta.per_page"
        :per-page-options="[50, 100]"
        @page-change="(p) => { filters.page = p; load() }"
        @per-page-change="(n) => setFilter('per_page', n)"
      />
    </section>
  </div>
</template>
