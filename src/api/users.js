import { apiClient } from '../services/apiClient.js'

export async function listUsers() {
  const res = await apiClient.get('/users')
  return res.data
}

export async function createUser(payload) {
  const res = await apiClient.post('/users', payload)
  return res.data
}

export async function getUser(userId) {
  const res = await apiClient.get(`/users/${userId}`)
  return res.data
}

export async function updateUser(userId, payload) {
  const res = await apiClient.put(`/users/${userId}`, payload)
  return res.data
}

export async function deleteUser(userId) {
  const res = await apiClient.delete(`/users/${userId}`)
  return res.data
}
