import { apiClient } from '../services/apiClient.js'

export async function listPrinters({ establishment_id, include_inactive = false } = {}) {
  const res = await apiClient.get('/printers/', {
    params: {
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
      include_inactive: include_inactive ? true : false,
    },
  })
  return res.data
}

export async function createPrinter(payload) {
  const res = await apiClient.post('/printers/', payload)
  return res.data
}

export async function updatePrinter(printerId, payload) {
  const res = await apiClient.put(`/printers/${Number(printerId)}`, payload)
  return res.data
}

export async function deletePrinter(printerId) {
  const res = await apiClient.delete(`/printers/${Number(printerId)}`)
  return res.data
}

export async function listPrinterCounterTypes({ establishment_id, include_inactive = false } = {}) {
  const res = await apiClient.get('/printers/counter-types', {
    params: {
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
      include_inactive: include_inactive ? true : false,
    },
  })
  return res.data
}

export async function createPrinterCounterType(payload) {
  const res = await apiClient.post('/printers/counter-types', payload)
  return res.data
}

export async function updatePrinterCounterType(counterTypeId, payload) {
  const res = await apiClient.put(`/printers/counter-types/${Number(counterTypeId)}`, payload)
  return res.data
}

export async function deletePrinterCounterType(counterTypeId) {
  const res = await apiClient.delete(`/printers/counter-types/${Number(counterTypeId)}`)
  return res.data
}

export async function listPrinterContracts({ establishment_id, printer_id } = {}) {
  const res = await apiClient.get('/printers/contracts', {
    params: {
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
      printer_id: printer_id != null ? Number(printer_id) : undefined,
    },
  })
  return res.data
}

export async function createPrinterContract(payload) {
  const res = await apiClient.post('/printers/contracts', payload)
  return res.data
}

export async function updatePrinterContract(contractId, payload) {
  const res = await apiClient.put(`/printers/contracts/${Number(contractId)}`, payload)
  return res.data
}

export async function deletePrinterContract(contractId) {
  const res = await apiClient.delete(`/printers/contracts/${Number(contractId)}`)
  return res.data
}

export async function listPrinterReadings({ establishment_id, printer_id, counter_type_id, limit = 200, offset = 0 } = {}) {
  const res = await apiClient.get('/printers/readings', {
    params: {
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
      printer_id: printer_id != null ? Number(printer_id) : undefined,
      counter_type_id: counter_type_id != null ? Number(counter_type_id) : undefined,
      limit: limit != null ? Number(limit) : undefined,
      offset: offset != null ? Number(offset) : undefined,
    },
  })
  return res.data
}

export async function createPrinterReading(payload) {
  const res = await apiClient.post('/printers/readings', payload)
  return res.data
}

export async function updatePrinterReading(readingId, payload) {
  const res = await apiClient.put(`/printers/readings/${Number(readingId)}`, payload)
  return res.data
}

export async function deletePrinterReading(readingId) {
  const res = await apiClient.delete(`/printers/readings/${Number(readingId)}`)
  return res.data
}

export async function getPrintersBilling({ year, month, establishment_id } = {}) {
  const res = await apiClient.get('/printers/billing', {
    params: {
      year: year != null ? Number(year) : undefined,
      month: month != null ? Number(month) : undefined,
      establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    },
  })
  return res.data
}

export async function generatePrintersBillingLaunch({ year, month, establishment_id, include_zero = false } = {}) {
  const res = await apiClient.post('/printers/billing/generate-launch', {
    year: Number(year),
    month: Number(month),
    establishment_id: establishment_id != null ? Number(establishment_id) : undefined,
    include_zero: include_zero ? true : false,
  })
  return res.data
}
