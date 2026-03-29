import { apiClient } from '../services/apiClient.js'

export async function createSale(payload) {
  const res = await apiClient.post('/sales', payload)
  return res.data
}

export async function listSales({
  limit = 50,
  offset = 0,
  establishment_id,
  status,
  payment_method,
  sale_channel,
  date_from,
  date_to,
} = {}) {
  const res = await apiClient.get('/sales', {
    params: {
      limit,
      offset,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
      status: status || undefined,
      payment_method: payment_method || undefined,
      sale_channel: sale_channel || undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
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
  const res = await apiClient.put(`/sales/${Number(saleId)}`, payload)
  return res.data
}
