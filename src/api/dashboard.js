import { apiClient } from '../services/apiClient.js'

export async function getDashboardSummary() {
  const res = await apiClient.get('/dashboard/summary')
  return res.data
}

export async function getDashboardSalesSeries({ days = 30 } = {}) {
  const res = await apiClient.get('/dashboard/sales-series', { params: { days } })
  return res.data
}
