import { apiClient } from '../services/apiClient.js'

export async function updateMe(payload) {
  const res = await apiClient.put('/auth/me', payload)
  return res.data
}

export async function changePassword(payload) {
  const res = await apiClient.post('/auth/change-password', payload)
  return res.data
}
