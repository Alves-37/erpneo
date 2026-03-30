import { apiClient } from '../services/apiClient.js'

export async function listOrders({ status, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/orders/', { params: { status: status || undefined, limit, offset } })
  return res.data
}

export async function createOrder(payload) {
  const res = await apiClient.post('/orders/', payload)
  return res.data
}

export async function updateOrder(orderId, payload) {
  const res = await apiClient.put(`/orders/${orderId}`, payload)
  return res.data
}

export async function closeOrder(orderId, payload) {
  const res = await apiClient.post(`/orders/${orderId}/close/`, payload)
  return res.data
}

export async function deleteOrder(orderId) {
  const res = await apiClient.delete(`/orders/${orderId}`)
  return res.data
}
