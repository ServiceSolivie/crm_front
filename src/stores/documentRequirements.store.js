import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { documentRequirementsApi } from '@/api/documentRequirements'

export const useDocumentRequirementsStore = defineStore('documentRequirements', () => {
  const documentTypes = ref([])
  const matrix = ref([])
  const matrixDocumentTypes = ref([])
  // Types required for every product by the backend (the signed DVC), shown locked
  const alwaysRequired = ref([])
  const loaded = reactive({ types: false, matrix: false })

  const loading = reactive({
    types: false,
    matrix: false,
    form: false,
    sync: false,
  })

  const errors = ref(null)

  async function fetchDocumentTypes(force = false) {
    if (loaded.types && !force) return
    loading.types = true
    errors.value = null
    try {
      const { data } = await documentRequirementsApi.getDocumentTypes()
      documentTypes.value = data
      loaded.types = true
    } catch (e) {
      errors.value = e
    } finally {
      loading.types = false
    }
  }

  async function fetchMatrix(force = false) {
    if (loaded.matrix && !force) return
    loading.matrix = true
    errors.value = null
    try {
      const { data } = await documentRequirementsApi.getMatrix()
      matrix.value = data.matrix
      matrixDocumentTypes.value = data.document_types
      alwaysRequired.value = data.always_required ?? []
      loaded.matrix = true
    } catch (e) {
      errors.value = e
    } finally {
      loading.matrix = false
    }
  }

  async function createDocumentType(payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await documentRequirementsApi.createDocumentType(payload)
      documentTypes.value.push(data)
      loaded.matrix = false
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function updateDocumentType(id, payload) {
    loading.form = true
    errors.value = null
    try {
      const { data } = await documentRequirementsApi.updateDocumentType(id, payload)
      const idx = documentTypes.value.findIndex((t) => String(t.id) === String(id))
      if (idx !== -1) documentTypes.value[idx] = data
      loaded.matrix = false
      return data
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function removeDocumentType(id) {
    loading.form = true
    try {
      await documentRequirementsApi.deleteDocumentType(id)
      documentTypes.value = documentTypes.value.filter((t) => String(t.id) !== String(id))
      loaded.matrix = false
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.form = false
    }
  }

  async function syncRequirements(insuranceType, clientType, documentTypeIds) {
    loading.sync = true
    errors.value = null
    try {
      const { data } = await documentRequirementsApi.syncRequirements({
        insurance_type: insuranceType,
        client_type: clientType,
        document_type_ids: documentTypeIds,
      })
      matrix.value = data.matrix
      matrixDocumentTypes.value = data.document_types
      alwaysRequired.value = data.always_required ?? alwaysRequired.value
    } catch (e) {
      errors.value = e
      throw e
    } finally {
      loading.sync = false
    }
  }

  return {
    documentTypes,
    matrix,
    matrixDocumentTypes,
    alwaysRequired,
    loaded,
    loading,
    errors,
    fetchDocumentTypes,
    fetchMatrix,
    createDocumentType,
    updateDocumentType,
    removeDocumentType,
    syncRequirements,
  }
})
