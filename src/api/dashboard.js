import { apiClient } from '../services/apiClient.js'

export async function getDashboardSummary({ establishment_id } = {}) {
  const res = await apiClient.get('/dashboard/summary', {
    params: {
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    },
  })
  return res.data
}

export async function getDashboardSalesSeries({ days = 30, establishment_id } = {}) {
  const res = await apiClient.get('/dashboard/sales-series', {
    params: {
      days,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    },
  })
  return res.data
}

export async function getDashboardExpiryAlerts({ days = 30, limit = 20, establishment_id } = {}) {
  const res = await apiClient.get('/dashboard/expiry-alerts', {
    params: {
      days,
      limit,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    },
  })
  return res.data
}
