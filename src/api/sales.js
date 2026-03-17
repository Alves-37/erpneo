import { apiClient } from '../services/apiClient.js'

export async function createSale(payload) {
  const res = await apiClient.post('/sales', payload)
  return res.data
}

export async function listSales({ limit = 50, offset = 0, establishment_id } = {}) {
  const res = await apiClient.get('/sales', {
    params: {
      limit,
      offset,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    },
  })
  return res.data
}

export async function getSalesByPeriod({ start_day, end_day }) {
  const res = await apiClient.get('/reports/sales-by-period', { params: { start_day, end_day } })
  return res.data
}

export async function getCashClosure(day) {
  const res = await apiClient.get('/reports/cash-closure', { params: { day } })
  return res.data
}

export async function voidSale(saleId, payload) {
  const res = await apiClient.post(`/sales/${Number(saleId)}/void`, payload)
  return res.data
}

export async function editSale(saleId, payload) {
  const res = await apiClient.put(`/sales/${Number(saleId)}/edit`, payload)
  return res.data
}
