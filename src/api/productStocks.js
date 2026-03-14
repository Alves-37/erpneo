import { apiClient } from '../services/apiClient.js'

export async function listProductStocks({ product_id, location_id } = {}) {
  const res = await apiClient.get('/product-stocks/', { params: { product_id, location_id } })
  return res.data
}

export async function listLowStock({ scope = 'warehouse', limit = 200, offset = 0 } = {}) {
  const res = await apiClient.get('/product-stocks/low-stock', { params: { scope, limit, offset } })
  return res.data
}
