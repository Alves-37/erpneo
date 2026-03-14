import { apiClient } from '../services/apiClient.js'

export async function getMyBranch() {
  const res = await apiClient.get('/branches/me')
  return res.data
}

export async function getBranch(branchId) {
  const res = await apiClient.get(`/branches/${branchId}`)
  return res.data
}

export async function listBranches() {
  const res = await apiClient.get('/branches')
  return res.data
}

export async function updateBranch(branchId, payload) {
  const res = await apiClient.put(`/branches/${branchId}`, payload)
  return res.data
}

export async function switchMyBranch(branchId) {
  const res = await apiClient.post('/branches/switch', { branch_id: Number(branchId) })
  return res.data
}
