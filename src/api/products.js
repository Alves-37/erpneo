import { apiClient } from '../services/apiClient.js'

export async function listProducts({
  q,
  limit = 50,
  offset = 0,
  low_stock = false,
  is_active,
  in_stock,
  establishment_id,
  category_id,
  show_in_menu,
} = {}) {
  const res = await apiClient.get('/products', {
    params: {
      q: q || undefined,
      limit,
      offset,
      low_stock: low_stock ? true : undefined,
      is_active: typeof is_active === 'boolean' ? is_active : undefined,
      in_stock: in_stock ? true : undefined,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
      category_id: category_id != null ? Number(category_id) : undefined,
      show_in_menu: typeof show_in_menu === 'boolean' ? show_in_menu : undefined,
    },
  })
  return res.data
}

export async function createProduct(payload) {
  const res = await apiClient.post('/products', payload)
  return res.data
}

export async function updateProduct(productId, payload) {
  const res = await apiClient.put(`/products/${productId}`, payload)
  return res.data
}

export async function deleteProduct(productId) {
  const res = await apiClient.delete(`/products/${productId}`)
  return res.data
}

export async function uploadProductImage(productId, file) {
  const form = new FormData()
  form.append('file', file)

  const res = await apiClient.post(`/products/${productId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function listProductImages(productId) {
  const res = await apiClient.get(`/products/${productId}/images`)
  return res.data
}

export async function getProductRecipe(productId) {
  const res = await apiClient.get(`/products/${productId}/recipe`)
  return res.data
}

export async function upsertProductRecipe(productId, payload) {
  const res = await apiClient.put(`/products/${productId}/recipe`, payload)
  return res.data
}
