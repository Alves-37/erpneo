import { apiClient } from '../services/apiClient.js'

export async function listExpenses({ status, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/expenses/', { params: { status, limit, offset } })
  return res.data
}

export async function createExpense(payload) {
  const res = await apiClient.post('/expenses/', payload)
  return res.data
}

export async function updateExpense(id, payload) {
  const res = await apiClient.put(`/expenses/${id}`, payload)
  return res.data
}

export async function payExpense(id, payload = {}) {
  const res = await apiClient.post(`/expenses/${id}/pay`, payload)
  return res.data
}

export async function deleteExpense(id) {
  const res = await apiClient.delete(`/expenses/${id}`)
  return res.data
}
