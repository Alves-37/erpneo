import { apiClient } from '../services/apiClient.js'

export async function updateMyCompany(payload) {
  const res = await apiClient.put('/companies/me', payload)
  return res.data
}

export async function uploadMyCompanyLogo(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post('/companies/me/logo', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

export async function resetMyCompany(confirmText) {
  const res = await apiClient.post('/companies/me/reset', {
    confirm: String(confirmText || ''),
  })
  return res.data
}

export async function getMyCompanyResetStatus() {
  const res = await apiClient.get('/companies/me/reset/status')
  return res.data
}
