import { apiClient } from '../services/apiClient.js'

export async function listStockTransfers({ limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/stock-transfers/', { params: { limit, offset } })
  return res.data
}

export async function createStockTransfer(payload) {
  const res = await apiClient.post('/stock-transfers/', payload)
  return res.data
}
