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

export async function getCashSessionItems(cashSessionId) {
  const res = await apiClient.get(`/cash-sessions/${cashSessionId}/items`)
  return res.data
}

export async function downloadCashSessionClosePdf(cashSessionId) {
  const res = await apiClient.get(`/cash-sessions/${cashSessionId}/close-pdf`, {
    responseType: 'blob',
  })
  
  // Criar URL do blob e fazer download
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  
  // Extrair filename do header ou usar default
  const contentDisposition = res.headers?.['content-disposition'] || ''
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
  const filename = filenameMatch ? filenameMatch[1] : `fechamento_caixa_${cashSessionId}.pdf`
  
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
  
  return res.data
}
