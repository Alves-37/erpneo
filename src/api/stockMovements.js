import { apiClient } from '../services/apiClient.js'

export async function listStockMovements({
  product_id,
  location_id,
  movement_type,
  date_from,
  date_to,
  limit = 200,
  offset = 0,
} = {}) {
  const res = await apiClient.get('/stock-movements/', {
    params: {
      product_id,
      location_id,
      movement_type,
      date_from,
      date_to,
      limit,
      offset,
    },
  })
  return res.data
}
