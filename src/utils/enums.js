export const LEAD_STATUS = {
  NRP: { label: 'No Reply / Not Reachable', color: 'neutral' },
  VALIDE: { label: 'Validated', color: 'success' },
  RAPPEL: { label: 'Callback Scheduled', color: 'warning' },
  RENDEZ_VOUS_ASSURE: { label: 'Appointment Confirmed', color: 'info' },
  PAS_INTERESSEE: { label: 'Not Interested', color: 'danger' },
}

export const APPOINTMENT_STATUS = {
  PLANIFIE: { label: 'Scheduled', color: 'info' },
  REALISE: { label: 'Completed', color: 'success' },
  ANNULE: { label: 'Cancelled', color: 'danger' },
  REPORTE: { label: 'Rescheduled', color: 'warning' },
}

export const INSURANCE_TYPE = {
  AUTO: { label: 'Auto Insurance' },
  MOTO: { label: 'Motorcycle Insurance' },
  RC_PRO: { label: 'Professional Liability' },
  MUTUELLE_SANTE: { label: 'Health Insurance' },
  EMPRUNTEUR: { label: 'Borrower Insurance' },
  CREDIT_CONSOMMATION: { label: 'Consumer Credit' },
  RACHAT_CREDIT: { label: 'Debt Consolidation' },
  CREDIT_IMMOBILIER: { label: 'Mortgage Credit' },
}

export const LEAD_IMPORT_STATUS = {
  PENDING: { label: 'Pending', color: 'neutral' },
  PROCESSING: { label: 'Processing', color: 'info' },
  COMPLETED: { label: 'Completed', color: 'success' },
  FAILED: { label: 'Failed', color: 'danger' },
}

export const ROLES = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  agent: 'Agent',
}

export const REMINDER_CHANNEL = {
  IN_APP: 'In-App',
  EMAIL: 'Email',
  SMS: 'SMS',
}

export const PAYMENT_STATUS = {
  NON_PAYE: { label: 'Non payé', color: 'danger' },
  PARTIELLEMENT_PAYE: { label: 'Partiellement payé', color: 'warning' },
  PAYE: { label: 'Payé', color: 'success' },
}

export const PAYMENT_METHOD = {
  STRIPE: { label: 'Stripe' },
  VIREMENT_BANCAIRE: { label: 'Virement bancaire' },
  PAYMENT_LINK: { label: 'Lien de paiement' },
  AUTRE: { label: 'Autre' },
}

/* Dropdown-ready arrays */
export const LEAD_STATUS_OPTIONS = Object.entries(LEAD_STATUS).map(([value, { label }]) => ({
  value,
  label,
}))

export const APPOINTMENT_STATUS_OPTIONS = Object.entries(APPOINTMENT_STATUS).map(
  ([value, { label }]) => ({ value, label }),
)

export const INSURANCE_TYPE_OPTIONS = Object.entries(INSURANCE_TYPE).map(([value, { label }]) => ({
  value,
  label,
}))

export const ROLE_OPTIONS = Object.entries(ROLES).map(([value, label]) => ({ value, label }))

export const REMINDER_CHANNEL_OPTIONS = Object.entries(REMINDER_CHANNEL).map(([value, label]) => ({
  value,
  label,
}))

export const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS).map(([value, { label }]) => ({
  value,
  label,
}))

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([value, { label }]) => ({
  value,
  label,
}))
