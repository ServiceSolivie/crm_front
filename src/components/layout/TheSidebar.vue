<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarRange,
  Upload,
  UsersRound,
  UserCog,
  Tag,
  FileCog,
  BarChart2,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown,
  UserCheck,
  Banknote,
  ClipboardList,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import AppAvatar from '@/components/base/AppAvatar.vue'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const canViewReports = computed(() =>
  auth.can('REPORTS_VIEW_ALL') || auth.can('REPORTS_VIEW_TEAM'),
)
const canViewRevenue = computed(() =>
  auth.can('REVENUE_VIEW_ALL') || auth.can('REVENUE_VIEW_TEAM') || auth.can('REVENUE_VIEW_PERSONAL'),
)
const showReportsSection = computed(() => canViewReports.value || canViewRevenue.value)

const reportsOpen = ref(false)

const reportSubItems = computed(() => {
  const items = []
  if (canViewReports.value) {
    items.push(
      { label: t('leads.title'), to: '/reports/leads', icon: Users },
      { label: t('appointments.title'), to: '/reports/appointments', icon: CalendarDays },
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

const navGroups = computed(() => [
  {
    items: [
      { icon: LayoutDashboard, label: t('nav.dashboard'), to: '/dashboard', permission: null },
    ],
  },
  {
    label: t('nav.crm'),
    items: [
      { icon: Users, label: t('nav.leads'), to: '/leads', permission: 'LEADS_VIEW_*' },
      { icon: CalendarDays, label: t('nav.appointments'), to: '/appointments', permission: 'APPOINTMENTS_VIEW_*' },
      { icon: CalendarRange, label: t('nav.calendar'), to: '/calendar', permission: 'APPOINTMENTS_VIEW_*' },
      { icon: Upload, label: t('nav.importLeads'), to: '/lead-imports', permission: 'LEADS_IMPORT' },
    ],
  },
  {
    label: t('nav.team'),
    items: [
      { icon: UserCheck, label: t('nav.myAgents'), to: '/my-agents', role: 'team_leader' },
      { icon: ClipboardList, label: t('nav.followUps'), to: '/follow-ups', role: 'team_leader' },
    ],
  },
  {
    label: t('nav.organization'),
    items: [
      { icon: UsersRound, label: t('nav.teams'), to: '/teams', permission: 'TEAMS_VIEW' },
      { icon: UserCog, label: t('nav.users'), to: '/users', permission: 'USERS_VIEW' },
      { icon: Tag, label: t('nav.leadSources'), to: '/lead-sources', role: 'super_admin' },
      { icon: FileCog, label: t('nav.documentRequirements'), to: '/document-requirements', role: 'super_admin' },
    ],
  },
])

const isReportsActive = computed(() => route.path.startsWith('/reports'))

if (route.path.startsWith('/reports')) {
  reportsOpen.value = true
}

function isVisible(item) {
  if (item.role) return auth.hasRole(item.role)
  if (!item.permission) return true
  const perms = Array.isArray(item.permission) ? item.permission : [item.permission]
  return perms.some((p) =>
    p.endsWith('_*') ? auth.canAny(p.slice(0, -2)) : auth.can(p),
  )
}

function isActive(to) {
  return route.path === to || (to !== '/dashboard' && route.path.startsWith(to))
}

function closeMobile() {
  ui.sidebarOpen = false
}

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <!-- Sidebar: fixed drawer on mobile, relative column on desktop -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-sidebar transition-transform duration-300',
      'lg:relative lg:translate-x-0 lg:shrink-0',
      ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 h-16 px-5 shrink-0 border-b border-white/10">
      <div class="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shrink-0">
        <svg viewBox="0 0 24 24" class="w-5 h-5 text-white fill-none stroke-current" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div>
        <p class="text-white font-semibold text-sm leading-tight">BrandNova</p>
        <p class="text-sidebar-icon text-xs">CRM Platform</p>
      </div>
    </div>

    <!-- Nav groups -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5 px-3">
      <template v-for="(group, gi) in navGroups" :key="gi">
        <!-- Group label (hidden when no items are visible) -->
        <p v-if="group.label && group.items.some(isVisible)" class="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-icon/60">
          {{ group.label }}
        </p>

        <template v-for="item in group.items" :key="item.to">
          <RouterLink
            v-if="isVisible(item)"
            :to="item.to"
            :class="[
              'flex items-center gap-3 w-full h-10 px-3 rounded-lg text-sm font-medium transition-colors duration-150',
              isActive(item.to)
                ? 'bg-white/15 text-white'
                : 'text-sidebar-icon hover:bg-white/8 hover:text-white',
            ]"
            @click="closeMobile"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </template>
      </template>

      <!-- Reports section with sub-menu -->
      <div v-if="showReportsSection" class="pt-4">
        <p class="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-icon/60">
          {{ t('nav.reports') }}
        </p>
        <button
          :class="[
            'flex items-center gap-3 w-full h-10 px-3 rounded-lg text-sm font-medium transition-colors duration-150',
            isReportsActive
              ? 'bg-white/15 text-white'
              : 'text-sidebar-icon hover:bg-white/8 hover:text-white',
          ]"
          @click="reportsOpen = !reportsOpen"
        >
          <BarChart2 class="w-4 h-4 shrink-0" />
          <span class="flex-1 text-left">{{ t('nav.reports') }}</span>
          <ChevronDown
            :class="['w-3.5 h-3.5 transition-transform duration-200', reportsOpen ? 'rotate-180' : '']"
          />
        </button>

        <Transition
          enter-active-class="transition-all duration-200 ease-out overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-48 opacity-100"
          leave-active-class="transition-all duration-150 ease-in overflow-hidden"
          leave-from-class="max-h-48 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div v-if="reportsOpen" class="mt-0.5 ml-4 space-y-0.5 border-l border-white/10 pl-3">
            <RouterLink
              v-for="sub in reportSubItems"
              :key="sub.to"
              :to="sub.to"
              :class="[
                'flex items-center gap-2.5 w-full h-9 px-2 rounded-lg text-xs font-medium transition-colors duration-150',
                route.path === sub.to
                  ? 'bg-white/15 text-white'
                  : 'text-sidebar-icon hover:bg-white/8 hover:text-white',
              ]"
              @click="closeMobile"
            >
              <component :is="sub.icon" class="w-3.5 h-3.5 shrink-0" />
              <span>{{ sub.label }}</span>
            </RouterLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Bottom: profile + logout -->
    <div class="shrink-0 border-t border-white/10 p-3 space-y-0.5">
      <RouterLink
        to="/profile"
        :class="[
          'flex items-center gap-3 w-full h-10 px-3 rounded-lg text-sm font-medium transition-colors duration-150',
          route.path === '/profile'
            ? 'bg-white/15 text-white'
            : 'text-sidebar-icon hover:bg-white/8 hover:text-white',
        ]"
        @click="closeMobile"
      >
        <Settings class="w-4 h-4 shrink-0" />
        <span>{{ t('nav.settings') }}</span>
      </RouterLink>

      <!-- User info + logout -->
      <div class="flex items-center gap-3 px-3 pt-2 mt-1 border-t border-white/10">
        <AppAvatar :name="auth.user?.name" size="sm" class="shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-white text-xs font-medium truncate">{{ auth.user?.name ?? 'User' }}</p>
          <p class="text-sidebar-icon text-[10px] truncate capitalize">{{ (auth.user?.roles?.[0] ?? auth.user?.role ?? '').replace(/_/g, ' ') }}</p>
        </div>
        <button
          class="text-sidebar-icon hover:text-white transition-colors p-1 rounded"
          :title="t('nav.logout')"
          @click="handleLogout"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
