import { apiClient } from '../services/apiClient.js'

export async function listProductOptionGroups(productId) {
  const res = await apiClient.get(`/product-options/products/${productId}/option-groups`)
  return res.data
}

export async function createProductOptionGroup(productId, data) {
  const res = await apiClient.post(`/product-options/products/${productId}/option-groups`, data)
  return res.data
}

export async function updateProductOptionGroup(groupId, data) {
  const res = await apiClient.put(`/product-options/option-groups/${groupId}`, data)
  return res.data
}

export async function deleteProductOptionGroup(groupId) {
  const res = await apiClient.delete(`/product-options/option-groups/${groupId}`)
  return res.data
}

export async function createProductOption(groupId, data) {
  const res = await apiClient.post(`/product-options/option-groups/${groupId}/options`, data)
  return res.data
}

export async function updateProductOption(optionId, data) {
  const res = await apiClient.put(`/product-options/options/${optionId}`, data)
  return res.data
}

export async function deleteProductOption(optionId) {
  const res = await apiClient.delete(`/product-options/options/${optionId}`)
  return res.data
}
