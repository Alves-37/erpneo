import { apiClient } from '../services/apiClient.js'

export async function listStockLocations({ include_inactive = false } = {}) {
  const res = await apiClient.get('/stock-locations/', { params: { include_inactive } })
  return res.data
}

export async function createStockLocation(payload) {
  const res = await apiClient.post('/stock-locations/', payload)
  return res.data
}

export async function updateStockLocation(id, payload) {
  const res = await apiClient.put(`/stock-locations/${id}`, payload)
  return res.data
}

export async function deleteStockLocation(id) {
  const res = await apiClient.delete(`/stock-locations/${id}`)
  return res.data
}
