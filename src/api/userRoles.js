import { apiClient } from '../services/apiClient.js'

export async function listUserRoles() {
  const res = await apiClient.get('/user_roles')
  return res.data
}

export async function createUserRole(payload) {
  const res = await apiClient.post('/user_roles', payload)
  return res.data
}

export async function getUserRole(roleId) {
  const res = await apiClient.get(`/user_roles/${roleId}`)
  return res.data
}

export async function updateUserRole(roleId, payload) {
  const res = await apiClient.put(`/user_roles/${roleId}`, payload)
  return res.data
}

export async function deleteUserRole(roleId) {
  const res = await apiClient.delete(`/user_roles/${roleId}`)
  return res.data
}
