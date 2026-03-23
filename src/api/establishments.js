import { apiClient } from '../services/apiClient.js'

export async function listEstablishments({ branch_id } = {}) {
  const res = await apiClient.get('/establishments', {
    params: {
      branch_id: branch_id != null ? Number(branch_id) : undefined,
    },
  })
  return res.data
}

export async function createEstablishment(payload) {
  const res = await apiClient.post('/establishments', payload)
  return res.data
}

export async function updateEstablishment(establishmentId, payload) {
  const res = await apiClient.put(`/establishments/${establishmentId}`, payload)
  return res.data
}

export async function deleteEstablishment(establishmentId) {
  const res = await apiClient.delete(`/establishments/${Number(establishmentId)}`)
  return res.data
}

export async function switchMyEstablishment(establishmentId) {
  const res = await apiClient.post('/establishments/switch', { establishment_id: Number(establishmentId) })
  return res.data
}
