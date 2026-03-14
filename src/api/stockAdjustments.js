import { apiClient } from '../services/apiClient.js'

export async function createStockAdjustment(payload) {
  const res = await apiClient.post('/stock-adjustments/', payload)
  return res.data
}
