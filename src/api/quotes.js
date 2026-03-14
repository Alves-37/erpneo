import { apiClient } from '../services/apiClient.js'

export async function listQuotes({ limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/quotes', { params: { limit, offset } })
  return res.data
}

export async function createQuote(payload) {
  const res = await apiClient.post('/quotes', payload)
  return res.data
}

export async function convertQuoteToSale(quoteId, payload) {
  const res = await apiClient.post(`/quotes/${quoteId}/convert`, payload)
  return res.data
}

export async function updateQuote(quoteId, payload) {
  const res = await apiClient.put(`/quotes/${quoteId}`, payload)
  return res.data
}

export async function deleteQuote(quoteId) {
  const res = await apiClient.delete(`/quotes/${quoteId}`)
  return res.data
}
