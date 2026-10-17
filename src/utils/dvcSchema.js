/**
 * Helpers around a DVC type's JSON schema (see the backend's DvcSchema):
 * the same schema drives the agent's form and the generated PDF.
 */

// Sections the agent fills in; text / list / broker sections only print in the PDF
export const INPUT_SECTION_TYPES = ['fields', 'garanties']

/** Every value of the schema, empty: '' for fields, false/'' for guarantees. */
export function blankDvcValues(schema) {
  const values = {}
  for (const section of schema?.sections ?? []) {
    if (section.type === 'garanties') {
      for (const item of section.items ?? []) {
        values[`${item.key}_included`] = false
        values[`${item.key}_franchise`] = ''
      }
    } else if (section.type === 'fields') {
      for (const field of section.fields ?? []) {
        values[field.key] = field.type === 'boolean' ? false : ''
      }
    }
  }
  return values
}

/** Server values (prefill) onto a form, keeping only the schema's keys. */
export function applyDvcValues(form, values) {
  Object.entries(values ?? {}).forEach(([key, value]) => {
    if (key in form) form[key] = typeof value === 'boolean' ? value : (value ?? '')
  })
}

/** "data.vehicle_brand": ["…"] → { vehicle_brand: "…" } */
export function dvcFieldErrors(errors) {
  const out = {}
  Object.entries(errors ?? {}).forEach(([key, messages]) => {
    if (key.startsWith('data.')) out[key.slice(5)] = Array.isArray(messages) ? messages[0] : messages
  })
  return out
}
