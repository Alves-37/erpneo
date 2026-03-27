import { apiClient } from '../services/apiClient.js'

export async function listDebts({ status = null, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/debts', { params: { status, limit, offset } })
  return res.data
}

export async function getDebt(debtId) {
  const res = await apiClient.get(`/debts/${Number(debtId)}`)
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

export async function cancelDebt(debtId) {
  const res = await apiClient.post(`/debts/${Number(debtId)}/cancel`)
  return res.data
}

export async function deleteDebt(debtId) {
  const res = await apiClient.delete(`/debts/${Number(debtId)}`)
  return res.data
}
