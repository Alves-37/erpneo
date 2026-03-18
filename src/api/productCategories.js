import { apiClient } from '../services/apiClient.js'

export async function listProductCategories({ businessType } = {}) {
  const res = await apiClient.get('/product-categories', {
    params: {
      business_type: businessType || undefined,
    },
  })
  return res.data
}

export async function createProductCategory({ name, businessType, color } = {}) {
  const res = await apiClient.post('/product-categories', {
    name,
    business_type: businessType || undefined,
    color,
  })
  return res.data
}

export async function updateProductCategory(categoryId, { name, color } = {}) {
  const res = await apiClient.put(`/product-categories/${categoryId}`, {
    name,
    color,
  })
  return res.data
}

export async function deleteProductCategory(categoryId) {
  const res = await apiClient.delete(`/product-categories/${categoryId}`)
  return res.data
}
