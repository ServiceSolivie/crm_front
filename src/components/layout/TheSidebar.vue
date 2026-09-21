<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CalendarRange,
  Upload,
  UsersRound,
  UserCog,
  Tag,
  FileCog,
  BarChart2,
  TrendingUp,
  SlidersHorizontal,
  LogOut,
  ChevronRight,
  UserCheck,
  Banknote,
  ClipboardList,
  FileSignature,
  KeyRound,
  ScrollText,
  Building2,
  ClipboardCheck,
  Lock,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { setLocale } from '@/i18n'
import AppAvatar from '@/components/base/AppAvatar.vue'
import TheNotificationBell from './TheNotificationBell.vue'
import TheLeadSearch from './TheLeadSearch.vue'
import { meApi } from '@/api/me'
import { formatNumber } from '@/utils/formatters'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

/* Counters next to menu items (GET /me/counters), refreshed on navigation and focus */
const counters = ref(null)
let lastFetch = 0
async function loadCounters(force = false) {
  if (!auth.isAuthenticated || (!force && Date.now() - lastFetch < 30000)) return
  lastFetch = Date.now()
  try {
    counters.value = (await meApi.counters()).data
  } catch {
    // counters are a convenience; the menu works without them
  }
}
function onFocus() {
  if (document.visibilityState !== 'hidden') loadCounters()
}
onMounted(() => {
  loadCounters(true)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onFocus)
})
watch(() => route.path, () => loadCounters())

const canSearchLeads = computed(() => auth.canAny('LEADS_VIEW'))

const canViewReports = computed(() =>
  auth.can('REPORTS_VIEW_ALL') || auth.can('REPORTS_VIEW_TEAM'),
)
const canViewRevenue = computed(() =>
  auth.can('REVENUE_VIEW_ALL') || auth.can('REVENUE_VIEW_TEAM') || auth.can('REVENUE_VIEW_PERSONAL'),
)

const reportChildren = computed(() => {
  const items = []
  if (canViewReports.value) {
    items.push(
      { label: t('leads.title'), to: '/reports/leads', icon: Users },
      { label: t('appointments.title'), to: '/reports/appointments', icon: CalendarClock },
      { label: t('teams.title'), to: '/reports/teams', icon: UsersRound },
      { label: t('reports.agents'), to: '/reports/agents', icon: UserCheck },
      { label: t('reports.conversion'), to: '/reports/conversion', icon: TrendingUp },
    )
  }
  if (canViewRevenue.value) {
    items.push({ label: t('revenue.title'), to: '/reports/revenue', icon: Banknote })
  }
  return items
})

/**
 * Items take `permission` / `role` / `excludeRole` like before. An item with
 * `children` is a collapsible group, shown when at least one child is visible.
 */
const navGroups = computed(() => [
  {
    items: [
      { icon: LayoutDashboard, label: t('nav.dashboard'), to: '/dashboard', permission: null, excludeRole: 'gestion' },
    ],
  },
  {
    label: t('nav.crm'),
    items: [
      { icon: Users, label: t('nav.leads'), to: '/leads', permission: 'LEADS_VIEW_*', count: counters.value?.leads_total },
      {
        icon: CalendarClock,
        label: t('nav.appointments'),
        to: '/appointments',
        permission: 'APPOINTMENTS_VIEW_*',
        // Red when some are late, otherwise what is left today
        count: counters.value?.appointments_overdue || counters.value?.appointments_today || null,
        countTone: counters.value?.appointments_overdue ? 'danger' : null,
        countTitle: counters.value?.appointments_overdue
          ? t('nav.overdueCount', { n: counters.value.appointments_overdue })
          : t('nav.todayCount', { n: counters.value?.appointments_today ?? 0 }),
      },
      { icon: CalendarRange, label: t('nav.calendar'), to: '/calendar', permission: 'APPOINTMENTS_VIEW_*' },
      { icon: FileSignature, label: t('nav.contracts'), to: '/contracts', permission: 'CONTRACTS_*' },
      { icon: Upload, label: t('nav.importLeads'), to: '/lead-imports', permission: 'LEADS_IMPORT' },
    ],
  },
  {
    label: t('nav.team'),
    items: [
      { icon: UserCheck, label: t('nav.myAgents'), to: '/my-agents', role: 'team_leader' },
      { icon: ClipboardList, label: t('nav.followUps'), to: '/follow-ups', role: 'team_leader' },
      { icon: ClipboardCheck, label: t('nav.gestionDashboard'), to: '/gestion-dashboard', role: 'gestion' },
      { key: 'reports', icon: BarChart2, label: t('nav.reports'), base: '/reports', children: reportChildren.value },
    ],
  },
  {
    label: t('nav.organization'),
    items: [
      { icon: UsersRound, label: t('nav.teams'), to: '/teams', permission: 'TEAMS_VIEW' },
      { icon: UserCog, label: t('nav.users'), to: '/users', permission: 'USERS_VIEW' },
      {
        key: 'settings',
        icon: SlidersHorizontal,
        label: t('nav.crmSettings'),
        children: [
          { icon: Tag, label: t('nav.leadSources'), to: '/lead-sources', role: 'super_admin' },
          { icon: FileCog, label: t('nav.documentRequirements'), to: '/document-requirements', role: 'super_admin' },
        ],
      },
      {
        key: 'vault',
        icon: Lock,
        label: t('nav.credentialVault'),
        base: '/vault',
        children: [
          { icon: Building2, label: t('nav.vaultPartners'), to: '/vault/partners', role: 'super_admin' },
          { icon: KeyRound, label: t('nav.vaultCredentials'), to: '/vault/credentials', role: 'super_admin' },
          { icon: ScrollText, label: t('nav.vaultAuditLogs'), to: '/vault/audit-logs', role: 'super_admin' },
        ],
      },
    ],
  },
])

function isVisible(item) {
  if (item.children) return item.children.some(isVisible)
  if (item.excludeRole && auth.hasRole(item.excludeRole)) return false
  if (item.role) return auth.hasRole(item.role)
  if (!item.permission) return true
  const perms = Array.isArray(item.permission) ? item.permission : [item.permission]
  return perms.some((p) =>
    p.endsWith('_*') ? auth.canAny(p.slice(0, -2)) : auth.can(p),
  )
}

function isActive(to) {
  return route.path === to || (to !== '/dashboard' && route.path.startsWith(to + '/'))
}

function isGroupActive(item) {
  return item.children.some((c) => isActive(c.to))
}

/* Collapsible groups: open the one containing the current page */
const openGroups = ref(new Set())
watch(
  () => route.path,
  () => {
    for (const group of navGroups.value) {
      for (const item of group.items) {
        if (item.children && isGroupActive(item)) openGroups.value.add(item.key)
      }
    }
  },
  { immediate: true },
)

function toggleGroup(key) {
  const next = new Set(openGroups.value)
  next.has(key) ? next.delete(key) : next.add(key)
  openGroups.value = next
}

const roleLabel = computed(() => {
  const role = auth.user?.roles?.[0] ?? auth.user?.role ?? ''
  return role ? t('roles.' + role, role.replace(/_/g, ' ')) : ''
})

function closeMobile() {
  ui.sidebarOpen = false
}

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

const itemBase = 'flex items-center gap-2.5 w-full h-9 px-2.5 rounded-lg text-[13.5px] transition-colors duration-150'
const itemActive = 'bg-white/12 text-white font-medium'
const itemIdle = 'text-sidebar-icon hover:bg-white/8 hover:text-white'
</script>

<template>
  <!-- Sidebar: fixed drawer on mobile, relative column on desktop -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-30 flex flex-col w-58 bg-sidebar text-white transition-transform duration-300',
      'lg:relative lg:translate-x-0 lg:shrink-0',
      ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <!-- Brand + notifications -->
    <div class="flex items-center gap-2.5 px-4.5 pt-4 pb-3 shrink-0">
      <div class="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center font-display font-bold text-[13px] shrink-0">
        BN
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-display font-semibold text-[15px] leading-tight">BrandNova</p>
        <p class="text-sidebar-icon text-xs leading-tight">CRM</p>
      </div>
      <TheNotificationBell dark />
    </div>

    <div v-if="canSearchLeads" class="px-3 pb-1 shrink-0">
      <TheLeadSearch @navigate="closeMobile" />
    </div>

    <!-- Nav groups -->
    <nav :aria-label="t('nav.mainNavigation')" class="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-0.5">
      <template v-for="(group, gi) in navGroups" :key="gi">
        <p
          v-if="group.label && group.items.some(isVisible)"
          class="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-sidebar-label"
        >
          {{ group.label }}
        </p>

        <template v-for="item in group.items" :key="item.to ?? item.key">
          <template v-if="isVisible(item)">
            <!-- Collapsible group -->
            <template v-if="item.children">
              <button
                :class="[itemBase, isGroupActive(item) && !openGroups.has(item.key) ? itemActive : itemIdle]"
                :aria-expanded="openGroups.has(item.key)"
                @click="toggleGroup(item.key)"
              >
                <component :is="item.icon" class="w-4 h-4 shrink-0" />
                <span class="flex-1 text-left truncate">{{ item.label }}</span>
                <ChevronRight
                  :class="['w-3.5 h-3.5 shrink-0 transition-transform duration-200', openGroups.has(item.key) ? 'rotate-90' : '']"
                />
              </button>
              <div v-if="openGroups.has(item.key)" class="space-y-0.5 pb-1">
                <template v-for="child in item.children" :key="child.to">
                  <RouterLink
                    v-if="isVisible(child)"
                    :to="child.to"
                    :class="[
                      'flex items-center w-full h-8 pl-9 pr-2.5 rounded-lg text-[13px] transition-colors duration-150',
                      isActive(child.to) ? itemActive : itemIdle,
                    ]"
                    @click="closeMobile"
                  >
                    <span class="truncate">{{ child.label }}</span>
                  </RouterLink>
                </template>
              </div>
            </template>

            <!-- Single link -->
            <RouterLink
              v-else
              :to="item.to"
              :class="[itemBase, isActive(item.to) ? itemActive : itemIdle]"
              @click="closeMobile"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0" />
              <span class="flex-1 truncate">{{ item.label }}</span>
              <span
                v-if="item.count"
                :title="item.countTitle"
                :class="[
                  'font-mono text-[11px] leading-none px-1.5 py-1 rounded-md',
                  item.countTone === 'danger' ? 'bg-danger text-white' : 'text-sidebar-icon bg-white/8',
                ]"
              >{{ formatNumber(item.count) }}</span>
            </RouterLink>
          </template>
        </template>
      </template>
    </nav>

    <!-- Language -->
    <div class="shrink-0 px-5.5 pb-2.5 flex items-center justify-between" role="group" :aria-label="t('nav.language')">
      <span class="text-[12.5px] text-sidebar-icon">{{ t('nav.language') }}</span>
      <div class="flex gap-0.5 p-0.5 rounded-md bg-white/8">
        <button
          v-for="lang in ['fr', 'en']"
          :key="lang"
          :aria-pressed="locale === lang"
          :class="[
            'h-6.5 px-2.5 rounded text-xs font-semibold uppercase transition-colors',
            locale === lang ? 'bg-white text-sidebar' : 'text-sidebar-icon hover:text-white',
          ]"
          @click="setLocale(lang)"
        >
          {{ lang }}
        </button>
      </div>
    </div>

    <!-- Profile + logout -->
    <div class="shrink-0 border-t border-white/10 px-3 py-2.5 flex items-center gap-1">
      <RouterLink
        to="/profile"
        :class="[
          'flex-1 min-w-0 flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg transition-colors',
          route.path === '/profile' ? 'bg-white/12' : 'hover:bg-white/8',
        ]"
        :title="t('nav.settings')"
        @click="closeMobile"
      >
        <AppAvatar :name="auth.user?.name" size="sm" />
        <div class="min-w-0">
          <p class="text-[13px] font-medium truncate">{{ auth.user?.name ?? 'User' }}</p>
          <p class="text-xs text-sidebar-icon truncate">{{ roleLabel }}</p>
        </div>
      </RouterLink>
      <button
        class="p-2 rounded-lg text-sidebar-icon hover:bg-white/8 hover:text-white transition-colors"
        :title="t('nav.logout')"
        :aria-label="t('nav.logout')"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>
