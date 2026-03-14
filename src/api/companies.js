import { apiClient } from '../services/apiClient.js'

export async function listCompanies() {
  const res = await apiClient.get('/companies')
  return res.data
}
