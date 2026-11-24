<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ShieldBan, Trash2 } from 'lucide-vue-next'
import { blockedIpsApi } from '@/api/blockedIps'
import { useToast } from '@/composables/useToast'
import { useUiStore } from '@/stores/ui.store'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

/**
 * « IP bloquées » (super admin): addresses refused by the whole CRM,
 * login included. The main website is not affected.
 */
const { t, locale } = useI18n()
const toast = useToast()
const ui = useUiStore()
const route = useRoute()

const items = ref([])
const yourIp = ref('')
const loading = ref(false)
const saving = ref(false)
const form = ref({ ip: route.query.ip ? String(route.query.ip) : '', note: '' })
const formError = ref('')

const dtf = computed(() => new Intl.DateTimeFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }))
const when = (iso) => (iso ? dtf.value.format(new Date(iso)) : '—')

async function load() {
  loading.value = true
  try {
    const res = await blockedIpsApi.list()
    items.value = res.items ?? []
    yourIp.value = res.your_ip ?? ''
  } catch (e) {
    toast.showError(e?.message ?? t('blockedIps.loadError'))
  } finally {
    loading.value = false
  }
}

async function add() {
  formError.value = ''
  if (!form.value.ip.trim()) {
    formError.value = t('blockedIps.ipRequired')
    return
  }
  saving.value = true
  try {
    await blockedIpsApi.add({ ip: form.value.ip.trim(), note: form.value.note.trim() || null })
    toast.showSuccess(t('blockedIps.added', { ip: form.value.ip.trim() }))
    form.value = { ip: '', note: '' }
    load()
  } catch (e) {
    formError.value = e?.errors?.ip?.[0] ?? e?.message ?? t('blockedIps.loadError')
  } finally {
    saving.value = false
  }
}

async function remove(item) {
  const ok = await ui.confirm(t('blockedIps.unblockTitle'), t('blockedIps.unblockConfirm', { ip: item.ip }), { confirmLabel: t('blockedIps.unblock') })
  if (!ok) return
  try {
    await blockedIpsApi.remove(item.id)
    toast.showSuccess(t('blockedIps.removed', { ip: item.ip }))
    load()
  } catch (e) {
    toast.showError(e?.message ?? t('blockedIps.loadError'))
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 max-w-[1100px] mx-auto">
    <div>
      <h1 class="font-display text-[28px] leading-[34px] font-semibold tracking-tight text-gray-900">{{ t('blockedIps.title') }}</h1>
      <p class="text-[13px] text-gray-500 mt-0.5">{{ t('blockedIps.subtitle') }}</p>
    </div>

    <!-- Add -->
    <form class="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3" @submit.prevent="add">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 w-full sm:w-[240px]">
          <span class="text-xs font-medium text-gray-700">{{ t('blockedIps.ip') }}</span>
          <input v-model="form.ip" type="text" inputmode="text" autocomplete="off" placeholder="176.185.163.76" class="h-9 px-3 rounded-lg border border-gray-300 text-[13px] font-mono focus:border-primary focus:outline-none" />
        </label>
        <label class="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span class="text-xs font-medium text-gray-700">{{ t('blockedIps.note') }}</span>
          <input v-model="form.note" type="text" maxlength="255" :placeholder="t('blockedIps.notePlaceholder')" class="h-9 px-3 rounded-lg border border-gray-300 text-[13px] focus:border-primary focus:outline-none" />
        </label>
        <button type="submit" :disabled="saving" class="h-9 inline-flex items-center gap-2 px-4 rounded-lg bg-danger text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50">
          <ShieldBan class="w-4 h-4" />{{ t('blockedIps.block') }}
        </button>
      </div>
      <p v-if="formError" class="text-[13px] text-danger-text">{{ formError }}</p>
      <p class="text-xs text-gray-500">{{ t('blockedIps.hint') }} <span v-if="yourIp">{{ t('blockedIps.yourIp') }} <span class="font-mono text-gray-700">{{ yourIp }}</span></span></p>
    </form>

    <!-- List -->
    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr class="text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
              <th class="text-left font-medium px-5 h-9">{{ t('blockedIps.ip') }}</th>
              <th class="text-left font-medium px-3">{{ t('blockedIps.note') }}</th>
              <th class="text-left font-medium px-3">{{ t('blockedIps.addedBy') }}</th>
              <th class="text-right font-medium px-3">{{ t('blockedIps.attempts') }}</th>
              <th class="text-left font-medium px-3">{{ t('blockedIps.lastAttempt') }}</th>
              <th class="px-5"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading && !items.length">
              <tr v-for="n in 3" :key="n" class="border-b border-gray-100"><td colspan="6" class="px-5 py-3"><AppSkeleton height="12px" /></td></tr>
            </template>
            <tr v-else-if="!items.length"><td colspan="6" class="px-5 py-10 text-center text-gray-500">{{ t('blockedIps.empty') }}</td></tr>
            <tr v-for="b in items" v-else :key="b.id" class="border-b border-gray-100 last:border-b-0">
              <td class="px-5 h-11 font-mono font-medium text-gray-900">{{ b.ip }}</td>
              <td class="px-3 text-gray-700">{{ b.note || '—' }}</td>
              <td class="px-3 text-gray-700">{{ b.created_by || '—' }}<span class="block text-[11px] text-gray-500">{{ when(b.created_at) }}</span></td>
              <td :class="['px-3 text-right font-mono', b.blocked_attempts ? 'text-danger-text font-medium' : 'text-gray-500']">{{ b.blocked_attempts }}</td>
              <td class="px-3 text-gray-700 font-mono text-[12px]">{{ when(b.last_attempt_at) }}</td>
              <td class="px-5 text-right">
                <button type="button" class="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md text-[12.5px] text-gray-700 hover:bg-gray-100" @click="remove(b)">
                  <Trash2 class="w-3.5 h-3.5" />{{ t('blockedIps.unblock') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
