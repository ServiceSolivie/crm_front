import client from './client'

export const vaultAuditLogsApi = {
  list: (params) => client.get('/vault/admin/audit-logs', { params }).then((r) => r.data),
}
