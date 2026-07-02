import { createRouter, createWebHistory } from 'vue-router'
import { registerGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    /* ── Public ──────────────────────────────────────────────── */
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { layout: 'auth' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/auth/RegisterPage.vue'),
      meta: { layout: 'auth' },
    },

    /* ── Redirect root ───────────────────────────────────────── */
    {
      path: '/',
      redirect: '/dashboard',
    },

    /* ── Authenticated ───────────────────────────────────────── */
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', title: 'Dashboard' },
    },

    /* Leads */
    {
      path: '/leads',
      name: 'leads',
      component: () => import('@/pages/leads/LeadsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: '', title: 'Leads' },
    },
    {
      path: '/leads/create',
      name: 'leads.create',
      component: () => import('@/pages/leads/LeadCreatePage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'LEADS_CREATE', title: 'New Lead' },
    },
    {
      path: '/leads/:id',
      name: 'leads.detail',
      component: () => import('@/pages/leads/LeadDetailPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'LEADS_VIEW_*', title: 'Lead Detail' },
    },
    {
      path: '/leads/:id/edit',
      name: 'leads.edit',
      component: () => import('@/pages/leads/LeadEditPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'LEADS_UPDATE', title: 'Edit Lead' },
    },

    /* Calendar */
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/pages/calendar/CalendarPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'APPOINTMENTS_VIEW_*', title: 'Calendar' },
    },

    /* Appointments */
    {
      path: '/appointments',
      name: 'appointments',
      component: () => import('@/pages/appointments/AppointmentsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: '', title: 'Appointments' },
    },
    {
      path: '/leads/:leadId/appointments/create',
      name: 'leads.appointments.create',
      component: () => import('@/pages/appointments/AppointmentCreatePage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'APPOINTMENTS_CREATE', title: 'New Appointment' },
    },
    {
      path: '/appointments/:id',
      name: 'appointments.detail',
      component: () => import('@/pages/appointments/AppointmentDetailPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'APPOINTMENTS_VIEW_*', title: 'Appointment Detail' },
    },
    {
      path: '/appointments/:id/edit',
      name: 'appointments.edit',
      component: () => import('@/pages/appointments/AppointmentEditPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'APPOINTMENTS_UPDATE', title: 'Edit Appointment' },
    },

    /* Teams */
    {
      path: '/teams',
      name: 'teams',
      component: () => import('@/pages/teams/TeamsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: '', title: 'Teams' },
    },
    {
      path: '/teams/:id',
      name: 'teams.detail',
      component: () => import('@/pages/teams/TeamDetailPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'TEAMS_VIEW', title: 'Team Detail' },
    },

    /* Users */
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/users/UsersPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: '', title: 'Users' },
    },
    {
      path: '/users/create',
      name: 'users.create',
      component: () => import('@/pages/users/UserCreatePage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'USERS_CREATE', title: 'New User' },
    },
    {
      path: '/users/:id',
      name: 'users.detail',
      component: () => import('@/pages/users/UserDetailPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'USERS_VIEW', title: 'User Detail' },
    },
    {
      path: '/users/:id/edit',
      name: 'users.edit',
      component: () => import('@/pages/users/UserEditPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'USERS_UPDATE', title: 'Edit User' },
    },

    /* Team Leader */
    {
      path: '/my-agents',
      name: 'team-leader.agents',
      component: () => import('@/pages/team-leader/MyAgentsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', role: 'team_leader', title: 'My Agents' },
    },
    {
      path: '/follow-ups',
      name: 'team-leader.follow-ups',
      component: () => import('@/pages/team-leader/FollowUpsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', role: 'team_leader', title: 'Follow-ups' },
    },

    /* Lead Sources */
    {
      path: '/lead-sources',
      name: 'lead-sources',
      component: () => import('@/pages/lead-sources/LeadSourcesPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', role: 'super_admin', title: 'Lead Sources' },
    },

    /* Document Requirements */
    {
      path: '/document-requirements',
      name: 'document-requirements',
      component: () => import('@/pages/document-requirements/DocumentRequirementsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', role: 'super_admin', title: 'Document Requirements' },
    },

    /* Lead Imports */
    {
      path: '/lead-imports',
      name: 'lead-imports',
      component: () => import('@/pages/lead-imports/LeadImportsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'LEADS_IMPORT', title: 'Lead Imports' },
    },
    {
      path: '/lead-imports/create',
      name: 'lead-imports.create',
      component: () => import('@/pages/lead-imports/LeadImportCreatePage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: 'LEADS_IMPORT', title: 'Import Leads' },
    },

    /* Reports */
    {
      path: '/reports/leads',
      name: 'reports.leads',
      component: () => import('@/pages/reports/ReportLeadsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: ['REPORTS_VIEW_ALL', 'REPORTS_VIEW_TEAM'], title: 'Leads Report' },
    },
    {
      path: '/reports/appointments',
      name: 'reports.appointments',
      component: () => import('@/pages/reports/ReportAppointmentsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: ['REPORTS_VIEW_ALL', 'REPORTS_VIEW_TEAM'], title: 'Appointments Report' },
    },
    {
      path: '/reports/teams',
      name: 'reports.teams',
      component: () => import('@/pages/reports/ReportTeamsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: ['REPORTS_VIEW_ALL', 'REPORTS_VIEW_TEAM'], title: 'Teams Report' },
    },
    {
      path: '/reports/agents',
      name: 'reports.agents',
      component: () => import('@/pages/reports/ReportAgentsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: ['REPORTS_VIEW_ALL', 'REPORTS_VIEW_TEAM'], title: 'Agents Report' },
    },
    {
      path: '/reports/conversion',
      name: 'reports.conversion',
      component: () => import('@/pages/reports/ReportConversionPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: ['REPORTS_VIEW_ALL', 'REPORTS_VIEW_TEAM'], title: 'Conversion Report' },
    },
    {
      path: '/reports/revenue',
      name: 'reports.revenue',
      component: () => import('@/pages/reports/ReportRevenuePage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', permission: ['REVENUE_VIEW_ALL', 'REVENUE_VIEW_TEAM', 'REVENUE_VIEW_PERSONAL'], title: 'Revenue Report' },
    },

    /* Profile */
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/profile/ProfilePage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', title: 'My Profile' },
    },

    /* ── Error pages ─────────────────────────────────────────── */
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/pages/errors/ForbiddenPage.vue'),
      meta: { layout: 'auth' },
    },
    {
      path: '/deactivated',
      name: 'deactivated',
      component: () => import('@/pages/errors/DeactivatedPage.vue'),
      meta: { layout: 'auth' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/errors/NotFoundPage.vue'),
      meta: { layout: 'auth' },
    },
  ],
})

registerGuards(router)

export default router
