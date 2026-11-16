import { computed } from 'vue'
import { useInsuranceTypesStore } from '@/stores/insuranceTypes.store'

/**
 * Insurance types managed from the CRM (labels set by the super admin) and
 * the leads pages they are placed on. Use this wherever a type coming from
 * a lead is shown or offered.
 */
export function useInsuranceTypes() {
  const store = useInsuranceTypesStore()

  const typeLabel = (code) => (code ? (store.byCode[code]?.label ?? code) : '')
  const typeShort = (code) => (code ? (store.byCode[code]?.short_label ?? store.byCode[code]?.label ?? code) : '')
  const requiresCompanyInfo = (code) => !!store.byCode[code]?.requires_company_info

  // Slug of the page a type shows on, or null for « Leads »
  const pageOf = (code) => {
    const pageId = store.byCode[code]?.lead_page_id
    return pageId ? (store.pages.find((p) => String(p.id) === String(pageId))?.slug ?? null) : null
  }

  const pageBySlug = (slug) => store.pages.find((p) => p.slug === slug) ?? null

  // Types on a page: 'general' for « Leads », a slug for an extra page, null for all
  const typesFor = (section = null) =>
    store.types.filter((t) => {
      if (!section) return true
      const slug = pageOf(t.code)
      return section === 'general' ? slug === null : slug === section
    })

  /**
   * { value, label } options. Only active types can be picked; keep `current`
   * listed so a lead with a deactivated type still shows it.
   */
  const optionsFor = (section = null, current = null) =>
    typesFor(section)
      .filter((t) => t.is_active || t.code === current)
      .map((t) => ({ value: t.code, label: t.label }))

  const options = computed(() => optionsFor())

  // Extra pages holding at least one active type, for the menu
  const menuPages = computed(() =>
    store.pages.filter((p) => store.types.some((t) => t.is_active && String(t.lead_page_id) === String(p.id))),
  )

  return { typeLabel, typeShort, requiresCompanyInfo, pageOf, pageBySlug, typesFor, optionsFor, options, menuPages }
}
