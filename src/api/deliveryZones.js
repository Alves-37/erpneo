import { apiClient } from '../services/apiClient.js'

export async function listDeliveryZones({ branchId } = {}) {
  const params = {}
  if (branchId != null && branchId !== '') params.branch_id = Number(branchId)
  const res = await apiClient.get('/delivery-zones', { params })
  return res.data
}

export async function createDeliveryZone(payload) {
  const res = await apiClient.post('/delivery-zones', {
    branch_id: Number(payload.branch_id),
    name: payload.name,
    fee: Number(payload.fee || 0),
    keywords: Array.isArray(payload.keywords) ? payload.keywords : [],
    is_active: Boolean(payload.is_active),
  })
  return res.data
}

export async function updateDeliveryZone(zoneId, payload) {
  const res = await apiClient.put(`/delivery-zones/${zoneId}`, {
    ...(payload.branch_id != null ? { branch_id: Number(payload.branch_id) } : {}),
    ...(payload.name != null ? { name: payload.name } : {}),
    ...(payload.fee != null ? { fee: Number(payload.fee || 0) } : {}),
    ...(payload.keywords != null ? { keywords: payload.keywords } : {}),
    ...(payload.is_active != null ? { is_active: Boolean(payload.is_active) } : {}),
  })
  return res.data
}

export async function deleteDeliveryZone(zoneId) {
  const res = await apiClient.delete(`/delivery-zones/${zoneId}`)
  return res.data
}
