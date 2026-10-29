<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhoneCall, Link2, Unlink, Wand2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-vue-next'
import { ringoverApi } from '@/api/ringover'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSearchInput from '@/components/base/AppSearchInput.vue'
import AppSkeleton from '@/components/base/AppSkeleton.vue'

const { t } = useI18n()
const ui = useUiStore()
const toast = useToast()

const status = ref(null)
const overview = ref({ crm_users: [], ringover_users: [], ringover_error: null })
const loading = ref(true)
const autoLinking = ref(false)
const search = ref('')

const linkTarget = ref(null)
const linkForm = ref({ ringover_user_id: null, ringover_number: null })
const linkErrors = ref({})
const linking = ref(false)

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return overview.value.crm_users
  return overview.value.crm_users.filter((u) =>
    [u.name, u.email, u.ringover_number].some((v) => v?.toLowerCase().includes(q)),
  )
})

const linkedCount = computed(() => overview.value.crm_users.filter((u) => u.is_linked).length)

const ringoverById = computed(() =>
  Object.fromEntries(overview.value.ringover_users.map((r) => [r.user_id, r])),
)

const ringoverUserOptions = computed(() =>
  overview.value.ringover_users.map((r) => ({
    value: r.user_id,
    label: `${r.firstname ?? ''} ${r.lastname ?? ''} — ${r.email ?? r.user_id}`.trim(),
    disabled: r.linked_crm_user_id !== null && r.linked_crm_user_id !== linkTarget.value?.id,
  })),
)

const numberOptions = computed(() =>
  (ringoverById.value[linkForm.value.ringover_user_id]?.numbers ?? []).map((n) => ({ value: n, label: n })),
)

async function load() {
  loading.value = true
  try {
    const [s, o] = await Promise.all([ringoverApi.status(), ringoverApi.users()])
    status.value = s
    overview.value = o
  } catch (e) {
    toast.showError(e?.message ?? t('ringover.loadError'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function runAutoLink() {
  autoLinking.value = true
  try {
    const res = await ringoverApi.autoLink()
    const { linked, unmatched } = res.data
    toast.showSuccess(t('ringover.autoLinkResult', { linked: linked.length, unmatched: unmatched.length }))
    await load()
  } catch (e) {
    toast.showError(e?.message ?? t('ringover.loadError'))
  } finally {
    autoLinking.value = false
  }
}

function openLink(user) {
  linkTarget.value = user
  linkErrors.value = {}
  linkForm.value = {
    ringover_user_id: user.ringover_user_id ?? user.suggested_ringover_user_id ?? null,
    ringover_number: user.ringover_number ?? null,
  }
}

function onRingoverUserChange(value) {
  linkForm.value.ringover_user_id = value
  linkForm.value.ringover_number = ringoverById.value[value]?.numbers?.[0] ?? null
}

async function submitLink() {
  if (!linkForm.value.ringover_user_id) {
    linkErrors.value = { ringover_user_id: t('ringover.selectUserRequired') }
    return
  }
  linking.value = true
  try {
    await ringoverApi.link(linkTarget.value.id, linkForm.value)
    toast.showSuccess(t('ringover.linkSuccess', { name: linkTarget.value.name }))
    linkTarget.value = null
    await load()
  } catch (e) {
    if (e?.errors) {
      linkErrors.value = Object.fromEntries(
        Object.entries(e.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      )
    } else {
      toast.showError(e?.message ?? t('ringover.loadError'))
    }
  } finally {
    linking.value = false
  }
}

async function unlink(user) {
  const ok = await ui.confirm(t('ringover.unlinkTitle'), t('ringover.unlinkConfirm', { name: user.name }))
  if (!ok) return
  try {
    await ringoverApi.unlink(user.id)
    toast.showSuccess(t('ringover.unlinkSuccess'))
    await load()
  } catch (e) {
    toast.showError(e?.message ?? t('ringover.loadError'))
  }
}

function ringoverLabel(user) {
  const r = ringoverById.value[user.ringover_user_id]
  return r ? `${r.firstname ?? ''} ${r.lastname ?? ''}`.trim() || r.email : `#${user.ringover_user_id}`
}
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-5 shadow-card">
      <div class="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute -bottom-10 -right-20 w-56 h-56 rounded-full bg-white/5" />
      <div class="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('ringover.title') }}</h1>
          <p class="text-sm text-indigo-200 mt-0.5">
            {{ t('ringover.linkedCount', { linked: linkedCount, total: overview.crm_users.length }) }}
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="loading" @click="load">
            <template #icon><RefreshCw class="w-4 h-4" /></template>
            {{ t('ringover.refresh') }}
          </AppButton>
          <AppButton
            size="sm"
            class="!bg-white !text-primary hover:!bg-indigo-50"
            :loading="autoLinking"
            :disabled="!status?.connected"
            @click="runAutoLink"
          >
            <template #icon><Wand2 class="w-4 h-4" /></template>
            {{ t('ringover.autoLink') }}
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Connection status -->
    <AppCard padding="sm">
      <AppSkeleton v-if="loading && !status" height="20px" width="50%" />
      <div v-else-if="status" class="flex items-start gap-3">
        <CheckCircle2 v-if="status.connected" class="w-5 h-5 text-success shrink-0 mt-0.5" />
        <AlertTriangle v-else-if="!status.configured" class="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <XCircle v-else class="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div class="text-sm">
          <p class="font-medium text-gray-900">
            <template v-if="status.connected">
              {{ t('ringover.connected', { count: status.ringover_users_count }) }}
            </template>
            <template v-else-if="!status.configured">{{ t('ringover.notConfigured') }}</template>
            <template v-else>{{ t('ringover.connectionFailed') }}</template>
          </p>
          <p v-if="status.error" class="text-gray-500 mt-0.5">{{ status.error }}</p>
          <p v-if="!status.configured" class="text-gray-500 mt-0.5">{{ t('ringover.notConfiguredHint') }}</p>
          <p v-if="status.configured && !status.webhook_secret_configured" class="text-warning mt-0.5">
            {{ t('ringover.webhookSecretMissing') }}
          </p>
        </div>
      </div>
    </AppCard>

    <!-- Search -->
    <AppCard padding="sm">
      <AppSearchInput v-model="search" :placeholder="t('ringover.searchPlaceholder')" />
    </AppCard>

    <!-- Users -->
    <AppCard padding="none">
      <div v-if="loading" class="p-4 space-y-3">
        <AppSkeleton v-for="n in 5" :key="n" height="36px" />
      </div>

      <div v-else-if="filteredUsers.length === 0" class="text-center py-16">
        <PhoneCall class="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ t('ringover.noUsers') }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th class="px-4 py-3 font-medium">{{ t('ringover.crmUser') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('ringover.role') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('ringover.ringoverAccount') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('ringover.number') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('ringover.state') }}</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="border-b border-gray-50 last:border-0">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ user.name }}</p>
                <p class="text-xs text-gray-500">{{ user.email }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600">
                {{ user.roles.map((r) => t(`roles.${r}`)).join(', ') }}
                <p v-if="user.team" class="text-xs text-gray-400">{{ user.team.name }}</p>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <template v-if="user.is_linked">{{ ringoverLabel(user) }}</template>
                <span v-else-if="user.suggested_ringover_user_id" class="text-xs text-info">
                  {{ t('ringover.suggested', { name: ringoverLabel({ ringover_user_id: user.suggested_ringover_user_id }) }) }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ user.ringover_number ?? '—' }}</td>
              <td class="px-4 py-3">
                <AppBadge v-if="user.is_stale" variant="danger" dot :label="t('ringover.stale')" />
                <AppBadge v-else-if="user.is_linked" variant="success" dot :label="t('ringover.linked')" />
                <AppBadge v-else variant="neutral" dot :label="t('ringover.notLinked')" />
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    :title="t('ringover.link')"
                    :disabled="!status?.connected"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    @click="openLink(user)"
                  >
                    <Link2 class="w-4 h-4" />
                  </button>
                  <button
                    v-if="user.is_linked"
                    :title="t('ringover.unlink')"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-bg transition-colors"
                    @click="unlink(user)"
                  >
                    <Unlink class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- Link modal -->
    <AppModal
      :open="linkTarget !== null"
      :title="t('ringover.linkTitle', { name: linkTarget?.name ?? '' })"
      @close="linkTarget = null"
    >
      <div class="space-y-4">
        <AppSelect
          :model-value="linkForm.ringover_user_id"
          :label="t('ringover.ringoverAccount')"
          :options="ringoverUserOptions"
          :placeholder="t('ringover.selectUser')"
          :error="linkErrors.ringover_user_id"
          required
          @update:model-value="onRingoverUserChange"
        />
        <AppSelect
          v-model="linkForm.ringover_number"
          :label="t('ringover.number')"
          :options="numberOptions"
          :placeholder="t('ringover.selectNumber')"
          :error="linkErrors.ringover_number"
          :disabled="numberOptions.length === 0"
        />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="linkTarget = null">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="linking" @click="submitLink">{{ t('ringover.link') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
