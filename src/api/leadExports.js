import client from './client'

export const leadExportsApi = {
  // Counters, breakdown by status and first rows of the period
  importedSummary: (params) => client.get('/lead-exports/imported/summary', { params }).then((r) => r.data),
  // The .xlsx itself; a big month can take a while to build
  importedDownload: (params) =>
    client.get('/lead-exports/imported/download', { params, responseType: 'blob', timeout: 120_000 }).then((r) => r.data),
}
