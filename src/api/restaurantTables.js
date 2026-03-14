import { apiClient } from '../services/apiClient.js'

export async function listRestaurantTables() {
  const res = await apiClient.get('/restaurant-tables')
  return res.data
}

export async function createRestaurantTable(payload) {
  const res = await apiClient.post('/restaurant-tables', payload)
  return res.data
}

export async function updateRestaurantTable(tableId, payload) {
  const res = await apiClient.put(`/restaurant-tables/${tableId}`, payload)
  return res.data
}

export async function deleteRestaurantTable(tableId) {
  const res = await apiClient.delete(`/restaurant-tables/${tableId}`)
  return res.data
}
