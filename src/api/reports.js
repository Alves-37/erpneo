import { apiClient } from '../services/apiClient.js'

export async function getDailyZ(day) {
  const res = await apiClient.get('/reports/daily-z', { params: { day } })
  return res.data
}

export const getDailyZReport = getDailyZ

export async function getVatByRate({ start_day, end_day }) {
  const res = await apiClient.get('/reports/vat-by-rate', { params: { start_day, end_day } })
  return res.data
}

export const getVatByRateReport = getVatByRate

export async function getDailyZPdf(day) {
  const res = await apiClient.get('/reports/daily-z.pdf', { params: { day }, responseType: 'blob' })
  return res.data
}

export async function getVatByRatePdf({ start_day, end_day }) {
  const res = await apiClient.get('/reports/vat-by-rate.pdf', { params: { start_day, end_day }, responseType: 'blob' })
  return res.data
}

export async function getSalesByPeriodPdf({ start_day, end_day }) {
  const res = await apiClient.get('/reports/sales-by-period.pdf', { params: { start_day, end_day }, responseType: 'blob' })
  return res.data
}

export async function getCashClosurePdf(day) {
  const res = await apiClient.get('/reports/cash-closure.pdf', { params: { day }, responseType: 'blob' })
  return res.data
}
