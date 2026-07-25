/**
 * Extract a human-readable message from an API error for a toast.
 * Prefers the first field-level validation message (e.g. "The agent id
 * field is required.") over the generic "The given data was invalid." —
 * more useful, and doesn't depend on every field having its own inline
 * error UI wired up.
 */
export function firstErrorMessage(e, fallback) {
  if (e?.errors) {
    const first = Object.values(e.errors)[0]
    return Array.isArray(first) ? first[0] : first
  }
  return e?.message ?? fallback
}
