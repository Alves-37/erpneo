import { apiClient } from '../services/apiClient.js'

export async function listDebts({ status = null, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/debts', { params: { status, limit, offset } })
  return res.data
}

export async function createDebt(payload) {
  const res = await apiClient.post('/debts', payload)
  return res.data
}

export async function payDebt(debtId, payload) {
  const res = await apiClient.post(`/debts/${Number(debtId)}/pay`, payload)
  return res.data
}
