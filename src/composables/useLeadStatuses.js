import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LEAD_STATUS } from '@/utils/enums'
import { useLeadStatusesStore } from '@/stores/leadStatuses.store'

/**
 * Every status a lead can have: the system ones (LEAD_STATUS, translated)
 * and the custom ones added from the CRM (labelled by the admin, placed in
 * a pipeline stage). Use this instead of reading LEAD_STATUS directly
 * wherever a status coming from a lead is shown or offered.
 */
export function useLeadStatuses() {
  const { t } = useI18n()
  const store = useLeadStatusesStore()

  const isCustomStatus = (code) => !LEAD_STATUS[code] && !!store.byCode[code]

  const statusLabel = (code) =>
    LEAD_STATUS[code] ? t('statuses.lead.' + code, code) : (store.byCode[code]?.label ?? code)

  const statusStage = (code) => LEAD_STATUS[code]?.stage ?? store.byCode[code]?.stage ?? 'contact'

  // Statuses a lead may currently have: deactivated custom ones included
  const allCodes = computed(() => [...Object.keys(LEAD_STATUS), ...store.list.map((s) => s.code)])

  // Statuses a lead can be moved to
  const selectableCodes = computed(() => [
    ...Object.keys(LEAD_STATUS),
    ...store.list.filter((s) => s.is_active).map((s) => s.code),
  ])

  const statusOptions = computed(() => allCodes.value.map((code) => ({ value: code, label: statusLabel(code) })))

  return { isCustomStatus, statusLabel, statusStage, allCodes, selectableCodes, statusOptions }
}
