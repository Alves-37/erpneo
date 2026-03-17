import { apiClient } from '../services/apiClient.js'

export async function getCurrentCashSession() {
  const res = await apiClient.get('/cash-sessions/current')
  return res.data
}

export async function openCashSession({ opening_balance = 0 } = {}) {
  const res = await apiClient.post('/cash-sessions/open', { opening_balance })
  return res.data
}

export async function closeCashSession(cashSessionId, { closing_balance_counted, notes = null } = {}) {
  const res = await apiClient.post(`/cash-sessions/${cashSessionId}/close`, {
    closing_balance_counted,
    notes,
  })
  return res.data
}

export async function getCashSessionSummary(cashSessionId) {
  const res = await apiClient.get(`/cash-sessions/${cashSessionId}/summary`)
  return res.data
}
