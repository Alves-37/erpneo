import { apiClient } from '../services/apiClient.js'

export async function listCustomers({ q, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/customers/', { params: { q, limit, offset } })
  return res.data
}

export async function createCustomer(payload) {
  const res = await apiClient.post('/customers/', payload)
  return res.data
}

export async function updateCustomer(id, payload) {
  const res = await apiClient.put(`/customers/${id}`, payload)
  return res.data
}

export async function deleteCustomer(id) {
  const res = await apiClient.delete(`/customers/${id}`)
  return res.data
}
