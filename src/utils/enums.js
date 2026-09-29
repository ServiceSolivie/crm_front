/**
 * Pipeline stages. Every lead status belongs to one stage; the stage drives
 * the colour everywhere (badges, pipeline bar), the status drives the label.
 * Class strings are written out in full so Tailwind can see them.
 */
export const LEAD_STAGES = {
  new: { order: 0, dot: 'bg-info', badge: 'bg-info-bg text-info-text' },
  contact: { order: 1, dot: 'bg-gray-400', badge: 'bg-neutral-bg text-neutral-text' },
  follow_up: { order: 2, dot: 'bg-warning', badge: 'bg-warning-bg text-warning-text' },
  quote: { order: 3, dot: 'bg-primary-soft', badge: 'bg-primary-light text-primary-hover' },
  won: { order: 4, dot: 'bg-success', badge: 'bg-success-bg text-success-text' },
  lost: { order: 5, dot: 'bg-danger', badge: 'bg-danger-bg text-danger-text' },
}

export const LEAD_STATUS = {
  NOUVEAU: { color: 'info', stage: 'new' },
  PAS_DE_REPONSE: { color: 'neutral', stage: 'contact' },
  OCCUPE: { color: 'neutral', stage: 'contact' },
  RAPPEL: { color: 'warning', stage: 'follow_up' },
  INTERESSE: { color: 'info', stage: 'quote' },
  DEVIS_EN_COURS: { color: 'info', stage: 'quote' },
  DEVIS_ENVOYE: { color: 'info', stage: 'quote' },
  EN_ATTENTE_CLIENT: { color: 'warning', stage: 'follow_up' },
  VALIDE: { color: 'success', stage: 'won' },
  PERDU: { color: 'danger', stage: 'lost' },
  PAS_INTERESSE: { color: 'danger', stage: 'lost' },
  MAUVAIS_NUMERO: { color: 'danger', stage: 'lost' },
  LEAD_INVALIDE: { color: 'danger', stage: 'lost' },
  GESTION: { color: 'info', stage: 'won' },
  A_CORRIGER: { color: 'warning', stage: 'follow_up' },
  CALL2_OK: { color: 'success', stage: 'won' },
  CALL2_KO: { color: 'warning', stage: 'follow_up' },
  PDG_OK: { color: 'success', stage: 'won' },
  PDG_KO: { color: 'warning', stage: 'follow_up' },
}

// Back-office statuses: need the LEADS_SET_REVIEW_STATUS permission (gestion, managers)
export const REVIEW_STATUSES = ['VALIDE', 'CALL2_OK', 'CALL2_KO', 'PDG_OK', 'PDG_KO', 'A_CORRIGER']

export function leadStage(status) {
  return LEAD_STATUS[status]?.stage ?? 'contact'
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

export const ROLES = {
  super_admin: {},
  manager: {},
  team_leader: {},
  agent: {},
  gestion: {},
}

// Lead payment status, recalculated by the backend from its payments
export const PAYMENT_STATUS = {
  NON_PAYE: { color: 'danger' },
  EN_ATTENTE: { color: 'info' },
  PARTIELLEMENT_PAYE: { color: 'warning' },
  PAYE: { color: 'success' },
  REMBOURSE: { color: 'neutral' },
}

// One payment (from Hyperswitch, or entered by hand in the past)
export const PAYMENT_RECORD_STATUS = {
  REUSSI: { color: 'success' },
  EN_ATTENTE: { color: 'info' },
  ECHOUE: { color: 'danger' },
  ANNULE: { color: 'neutral' },
  REMBOURSE: { color: 'warning' },
}

// DVC track: generated → waiting for the client's signature → signed copy in the dossier
export const DVC_STATUS = {
  A_GENERER: { color: 'neutral' },
  EN_ATTENTE_SIGNATURE: { color: 'warning' },
  SIGNE: { color: 'success' },
}

export const CLIENT_TYPE = {
  INDIVIDUAL: {},
  PROFESSIONAL: {},
}
