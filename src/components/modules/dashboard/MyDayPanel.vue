<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Phone, ChevronRight, FileWarning, Check } from 'lucide-vue-next'
import { meApi } from '@/api/me'
import { useAuthStore } from '@/stores/auth.store'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/**
 * "Ma journée" (GET /me/agenda): every late appointment, today's
 * appointments (done ones greyed out) and the dossiers gestion sent back.
 * The API scopes everything to what the user may see.
 */
const auth = useAuthStore()
const { t, locale } = useI18n()

const agenda = ref(null)
const loading = ref(false)
const failed = ref(false)

const isAgent = computed(() => auth.hasRole('agent'))

async function load() {
  loading.value = true
  failed.value = false
  try {
    agenda.value = (await meApi.agenda()).data
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

const overdue = computed(() => agenda.value?.overdue ?? [])
const today = computed(() => agenda.value?.today ?? [])
const tasks = computed(() => agenda.value?.tasks ?? [])
const isEmpty = computed(() => !overdue.value.length && !today.value.length && !tasks.value.length)
const OPEN = ['PLANIFIE', 'CONFIRME']
const isDone = (a) => !OPEN.includes(a.status)

function leadName(l) {
  return [l?.first_name, l?.last_name].filter(Boolean).join(' ') || l?.reference || '—'
}

function when(a) {
  const d = new Date(a.scheduled_at)
  const loc = locale.value === 'fr' ? 'fr-FR' : 'en-GB'
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })
}

function subtitle(a) {
  const type = a.lead?.insurance_type ? t('insuranceTypes.' + a.lead.insurance_type, a.lead.insurance_type) : null
  const status = isDone(a) ? t('statuses.appointment.' + a.status, a.status) : t('dashboard.appointmentShort')
  return [status, type].filter(Boolean).join(' · ')
}

function taskLabel(task) {
  return task.documents?.length
    ? t('dashboard.missingDocs', { docs: task.documents.join(', ') })
    : t('dashboard.dossierToFix')
}
</script>

<template>
  <section class="bg-white border border-gray-200 rounded-xl flex flex-col min-w-0">
    <div class="px-5 pt-4.5 pb-3 flex items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-base font-semibold text-gray-900">
          {{ isAgent ? t('dashboard.myDay') : t('dashboard.todayAgenda') }}
        </h2>
        <p v-if="!loading && !failed" class="text-[12.5px] text-gray-500 mt-0.5">
          {{ t('dashboard.myDayCount', { n: today.length, late: overdue.length }) }}<template v-if="tasks.length"> · {{ t('dashboard.tasksCount', { n: tasks.length }) }}</template>
        </p>
      </div>
      <RouterLink to="/calendar" class="text-[13px] font-medium text-primary hover:text-primary-hover">
        {{ t('nav.calendar') }}
      </RouterLink>
    </div>

    <div v-if="loading" class="px-5 pb-5 space-y-3">
      <AppSkeleton v-for="n in 4" :key="n" height="44px" class="rounded-lg" />
    </div>

    <div v-else-if="failed" class="px-5 pb-5 text-sm text-gray-600">
      {{ t('dashboard.myDayError') }}
      <button class="ml-1 font-medium text-primary hover:underline" @click="load">{{ t('common.retry') }}</button>
    </div>

    <p v-else-if="isEmpty" class="px-5 pb-6 text-sm text-gray-500">
      {{ t('dashboard.nothingToday') }}
    </p>

    <div v-else class="px-3 pb-3">
      <template v-for="group in [
        { key: 'late', label: t('dashboard.overdue'), list: overdue },
        { key: 'next', label: t('dashboard.today'), list: today },
      ]" :key="group.key">
        <template v-if="group.list.length">
          <p
            :class="[
              'px-2 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em]',
              group.key === 'late' ? 'text-danger-text' : 'text-gray-500',
            ]"
          >{{ group.label }}</p>
          <div
            v-for="a in group.list"
            :key="a.id"
            :class="[
              'flex items-center gap-3 px-2 py-2.5 rounded-lg',
              group.key === 'late' ? 'bg-danger-bg/40 mb-1' : 'border-b border-gray-100 last:border-b-0',
              isDone(a) ? 'opacity-60' : '',
            ]"
          >
            <span
              :class="[
                'w-12 shrink-0 font-mono text-[12.5px] font-medium',
                group.key === 'late' ? 'text-danger-text' : 'text-gray-900',
              ]"
            >
              <Check v-if="isDone(a)" class="inline w-3.5 h-3.5 -mt-0.5 text-success" />
              {{ when(a) }}
            </span>
            <div class="flex-1 min-w-0">
              <RouterLink
                v-if="a.lead?.id"
                :to="`/leads/${a.lead.id}`"
                class="block text-[13.5px] font-medium text-gray-900 hover:text-primary truncate"
              >{{ leadName(a.lead) }}</RouterLink>
              <p class="text-[12.5px] text-gray-600 truncate">{{ subtitle(a) }}</p>
            </div>
            <a
              v-if="a.lead?.phone"
              :href="`tel:${a.lead.phone}`"
              class="w-8.5 h-8.5 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-900 flex items-center justify-center hover:border-gray-300"
              :aria-label="t('dashboard.callName', { name: leadName(a.lead) })"
            >
              <Phone class="w-3.5 h-3.5" />
            </a>
            <RouterLink
              v-else
              :to="`/appointments/${a.id}`"
              class="w-8.5 h-8.5 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-900 flex items-center justify-center hover:border-gray-300"
              :aria-label="t('calendar.viewDetails')"
            >
              <ChevronRight class="w-4 h-4" />
            </RouterLink>
          </div>
        </template>
      </template>

      <!-- Dossiers sent back by gestion -->
      <template v-if="tasks.length">
        <p class="px-2 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-warning-text">{{ t('dashboard.tasks') }}</p>
        <RouterLink
          v-for="task in tasks"
          :key="task.lead.id"
          :to="`/leads/${task.lead.id}`"
          class="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
        >
          <span class="w-12 shrink-0 flex justify-center"><FileWarning class="w-4 h-4 text-warning" /></span>
          <div class="flex-1 min-w-0">
            <p class="text-[13.5px] font-medium text-gray-900 truncate">{{ leadName(task.lead) }}</p>
            <p class="text-[12.5px] text-gray-600 truncate">{{ taskLabel(task) }}</p>
          </div>
          <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
        </RouterLink>
      </template>
    </div>

    <slot name="footer" />
  </section>
</template>
