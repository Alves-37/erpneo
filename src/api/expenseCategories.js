import { apiClient } from '../services/apiClient.js'

export async function listExpenseCategories() {
  const res = await apiClient.get('/expense-categories/')
  return res.data
}

export async function createExpenseCategory(payload) {
  const res = await apiClient.post('/expense-categories/', payload)
  return res.data
}

export async function updateExpenseCategory(id, payload) {
  const res = await apiClient.put(`/expense-categories/${id}`, payload)
  return res.data
}

export async function deleteExpenseCategory(id) {
  const res = await apiClient.delete(`/expense-categories/${id}`)
  return res.data
}
