import { apiClient } from '../services/apiClient.js'

export async function issueFiscalDocumentFromSale(payload) {
  const res = await apiClient.post('/fiscal-documents/issue-from-sale', payload)
  return res.data
}

export async function listFiscalDocuments({ limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/fiscal-documents', { params: { limit, offset } })
  return res.data
}

export async function listFiscalDocumentsBySaleId(saleId) {
  const res = await apiClient.get(`/fiscal-documents/by-sale/${saleId}`)
  return res.data
}

export async function cancelFiscalDocument(docId, payload) {
  const res = await apiClient.post(`/fiscal-documents/${docId}/cancel`, payload)
  return res.data
}
