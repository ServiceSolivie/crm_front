import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Who sees which reports. A supervisor (agent with the team-stats
 * permission) sees the reports of his own team, without the money
 * figures, and only opens the leads that are his.
 */
export function useReportAccess() {
  const auth = useAuthStore()

  const isSupervisorOnly = computed(
    () => auth.can('DASHBOARD_VIEW_TEAM_STATS') && !auth.can('REPORTS_VIEW_ALL') && !auth.can('REPORTS_VIEW_TEAM'),
  )
  const canViewReports = computed(
    () => auth.can('REPORTS_VIEW_ALL') || auth.can('REPORTS_VIEW_TEAM') || auth.can('DASHBOARD_VIEW_TEAM_STATS'),
  )
  const canOpenLead = (agentId) => !isSupervisorOnly.value || (agentId != null && agentId === auth.user?.id)

  return { canViewReports, hidesRevenue: isSupervisorOnly, canOpenLead }
}
