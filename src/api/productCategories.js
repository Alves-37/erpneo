import { apiClient } from '../services/apiClient.js'

export async function listProductCategories({ businessType } = {}) {
  const res = await apiClient.get('/product-categories', {
    params: {
      business_type: businessType || undefined,
    },
  })
  return res.data
}
