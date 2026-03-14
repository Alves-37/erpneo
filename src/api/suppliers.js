import { apiClient } from '../services/apiClient.js'

export async function listSuppliers({ q, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/suppliers/', { params: { q, limit, offset } })
  return res.data
}

export async function createSupplier(payload) {
  const res = await apiClient.post('/suppliers/', payload)
  return res.data
}

export async function updateSupplier(id, payload) {
  const res = await apiClient.put(`/suppliers/${id}`, payload)
  return res.data
}

export async function deleteSupplier(id) {
  const res = await apiClient.delete(`/suppliers/${id}`)
  return res.data
}

export async function listSupplierPurchases({ supplier_id, status, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/supplier-purchases/', { params: { supplier_id, status, limit, offset } })
  return res.data
}

export async function createSupplierPurchase(payload) {
  const res = await apiClient.post('/supplier-purchases/', payload)
  return res.data
}

export async function updateSupplierPurchase(id, payload) {
  const res = await apiClient.put(`/supplier-purchases/${id}`, payload)
  return res.data
}

export async function deleteSupplierPurchase(id) {
  const res = await apiClient.delete(`/supplier-purchases/${id}`)
  return res.data
}

export async function listSupplierPayments({ supplier_id, purchase_id, limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get('/supplier-payments/', { params: { supplier_id, purchase_id, limit, offset } })
  return res.data
}

export async function createSupplierPayment(payload) {
  const res = await apiClient.post('/supplier-payments/', payload)
  return res.data
}

export async function updateSupplierPayment(id, payload) {
  const res = await apiClient.put(`/supplier-payments/${id}`, payload)
  return res.data
}

export async function deleteSupplierPayment(id) {
  const res = await apiClient.delete(`/supplier-payments/${id}`)
  return res.data
}
