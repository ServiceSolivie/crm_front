import { useAuthStore } from '@/stores/auth.store'

let bootPromise = null

export function registerGuards(router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!to.meta.requiresAuth) return true

    if (!auth.token) {
      return { name: 'login', query: to.name !== 'login' ? { redirect: to.fullPath } : undefined }
    }

    /* Token exists but user not yet loaded (e.g. page refresh) → boot */
    if (!auth.user) {
      if (!bootPromise) {
        bootPromise = auth.boot().finally(() => {
          bootPromise = null
        })
      }
      try {
        await bootPromise
      } catch (err) {
        console.warn('[CRM guard] boot failed:', err)
        if (err?.type === 'deactivated') return { name: 'deactivated' }
        return { name: 'login' }
      }

      // boot resolved but user is still null → response shape mismatch
      if (!auth.user) {
        return { name: 'login' }
      }
    }

    /* Permission guard — supports array and wildcard ('LEADS_VIEW_*') */
    if (to.meta.permission) {
      const perms = Array.isArray(to.meta.permission)
        ? to.meta.permission
        : [to.meta.permission]

      const hasPermission = perms.some((p) =>
        p.endsWith('_*') ? auth.canAny(p.slice(0, -2)) : auth.can(p),
      )

      if (!hasPermission) return { name: 'forbidden' }
    }

    /* Role guard */
    if (to.meta.role && !auth.hasRole(to.meta.role) && !(to.meta.supervisor && auth.isSupervisor())) {
      return { name: 'forbidden' }
    }

    return true
  })
}
