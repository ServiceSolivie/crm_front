<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Lead progress along the sales + back-office flow.
 * Each status maps to a step and a tone:
 *   ok   → steps up to here done (green), current step highlighted
 *   warn → the current step needs attention (amber), e.g. Rappel, À corriger, Call 2 KO
 *   lost → the lead left the pipeline (red label, bar greyed)
 */
const props = defineProps({
  status: { type: String, required: true },
})
const { t } = useI18n()

// Sales, then back office: gestion reviews, Call 2 / PDG checks, and the lead is validated last
const STEPS = ['new', 'contact', 'quote', 'gestion', 'control', 'won']

const POSITION = {
  NOUVEAU: [0, 'ok'],
  PAS_DE_REPONSE: [1, 'ok'],
  OCCUPE: [1, 'ok'],
  RAPPEL: [1, 'warn'],
  EN_ATTENTE_CLIENT: [2, 'warn'],
  INTERESSE: [2, 'ok'],
  DEVIS_EN_COURS: [2, 'ok'],
  DEVIS_ENVOYE: [2, 'ok'],
  GESTION: [3, 'ok'],
  A_CORRIGER: [3, 'warn'],
  CALL2_OK: [4, 'ok'],
  PDG_OK: [4, 'ok'],
  CALL2_KO: [4, 'warn'],
  PDG_KO: [4, 'warn'],
  VALIDE: [5, 'ok'],
  PERDU: [1, 'lost'],
  PAS_INTERESSE: [1, 'lost'],
  MAUVAIS_NUMERO: [0, 'lost'],
  LEAD_INVALIDE: [0, 'lost'],
}

const position = computed(() => POSITION[props.status] ?? [0, 'ok'])

const steps = computed(() => {
  const [current, tone] = position.value
  return STEPS.map((key, i) => {
    let bar = 'bg-gray-200'
    let label = 'text-gray-500'
    if (tone === 'lost') {
      if (i < current) bar = 'bg-gray-300'
      if (i === current) { bar = 'bg-danger'; label = 'text-danger-text font-semibold' }
    } else if (i < current) {
      bar = 'bg-success'; label = 'text-gray-600'
    } else if (i === current) {
      bar = tone === 'warn' ? 'bg-warning' : 'bg-success'
      label = tone === 'warn' ? 'text-warning-text font-semibold' : 'text-gray-900 font-semibold'
    }
    const isCurrent = i === current
    return {
      key,
      bar,
      label,
      isCurrent,
      text: isCurrent && (tone !== 'ok' || key === 'contact')
        ? `${t('leadDetail.steps.' + key)} · ${t('statuses.lead.' + props.status, props.status)}`
        : t('leadDetail.steps.' + key),
    }
  })
})
</script>

<template>
  <ol :aria-label="t('leadDetail.steps.label')" class="flex items-start gap-1 min-w-0">
    <li
      v-for="s in steps"
      :key="s.key"
      :aria-current="s.isCurrent ? 'step' : undefined"
      class="flex-1 min-w-0 flex flex-col gap-1.5"
    >
      <span :class="['h-1 rounded-full', s.bar]" />
      <span :class="['text-xs truncate', s.label]" :title="s.text">{{ s.text }}</span>
    </li>
  </ol>
</template>
