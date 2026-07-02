export const LEAD_STATUS = {
  NRP: { color: 'neutral' },
  VALIDE: { color: 'success' },
  RAPPEL: { color: 'warning' },
  RENDEZ_VOUS_ASSURE: { color: 'info' },
  PAS_INTERESSEE: { color: 'danger' },
}

export const APPOINTMENT_STATUS = {
  PLANIFIE: { color: 'info' },
  REALISE: { color: 'success' },
  ANNULE: { color: 'danger' },
  REPORTE: { color: 'warning' },
}

export const INSURANCE_TYPE = {
  AUTO: {},
  MOTO: {},
  RC_PRO: {},
  MUTUELLE_SANTE: {},
  EMPRUNTEUR: {},
  CREDIT_CONSOMMATION: {},
  RACHAT_CREDIT: {},
  CREDIT_IMMOBILIER: {},
  DECENNALE: {},
  TAXI_VTC: {},
  AUTRE: {},
}

export const LEAD_IMPORT_STATUS = {
  PENDING: { color: 'neutral' },
  PROCESSING: { color: 'info' },
  COMPLETED: { color: 'success' },
  FAILED: { color: 'danger' },
}

export const ROLES = {
  super_admin: {},
  manager: {},
  team_leader: {},
  agent: {},
}

export const REMINDER_CHANNEL = {
  IN_APP: {},
  EMAIL: {},
  SMS: {},
}

export const PAYMENT_STATUS = {
  NON_PAYE: { color: 'danger' },
  PARTIELLEMENT_PAYE: { color: 'warning' },
  PAYE: { color: 'success' },
}

export const PAYMENT_METHOD = {
  STRIPE: {},
  VIREMENT_BANCAIRE: {},
  PAYMENT_LINK: {},
  AUTRE: {},
}

export const CLIENT_TYPE = {
  INDIVIDUAL: {},
  PROFESSIONAL: {},
}

export const DOCUMENT_TYPE = {
  CARTE_IDENTITE: {},
  PERMIS_CONDUIRE: {},
  CARTE_GRISE: {},
  RIB: {},
  RELEVE_INFORMATION: {},
  EXTRAIT_KBIS: {},
  NUMERO_SIRET: {},
  CONTRAT_CHANTIER: {},
}
