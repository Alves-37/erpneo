import { apiClient } from '../services/apiClient.js'

export async function getPrintersBilling({ year, month, establishment_id } = {}) {
  const res = await apiClient.get('/printers/billing', {
    params: {
      year: year != null ? Number(year) : undefined,
      month: month != null ? Number(month) : undefined,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    },
  })
  return res.data
}

export async function generatePrintersBillingLaunch({ year, month, establishment_id, include_zero = false } = {}) {
  const res = await apiClient.post('/printers/billing/generate-launch', {
    year: Number(year),
    month: Number(month),
    establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    include_zero: include_zero ? true : false,
  })
  return res.data
}
