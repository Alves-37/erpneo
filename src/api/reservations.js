import { apiClient } from '../services/apiClient.js'

export async function listReservations(params = {}) {
  const {
    date,
    status,
    table_id,
    establishment_id,
    limit = 100,
    offset = 0
  } = params

  const response = await apiClient.get('/reservations/', { params })
  return response.data
}

export async function getReservation(reservationId) {
  const response = await apiClient.get(`/reservations/${reservationId}/`)
  return response.data
}

export async function createReservation(reservationData) {
  const response = await apiClient.post('/reservations/', reservationData)
  return response.data
}

export async function updateReservation(reservationId, reservationData) {
  const response = await apiClient.put(`/reservations/${reservationId}/`, reservationData)
  return response.data
}

export async function cancelReservation(reservationId, cancellationReason = null) {
  const response = await apiClient.post(
    `/reservations/${reservationId}/cancel/`,
    {},
    { params: { cancellation_reason: cancellationReason } }
  )
  return response.data
}

export async function getTablesAvailability(date) {
  const response = await apiClient.get(`/reservations/tables/availability/${date}/`)
  return response.data
}
