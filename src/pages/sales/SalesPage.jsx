import { useEffect, useMemo, useState } from 'react'

import { listCompanies } from '../../api/companies.js'
import { listCustomers } from '../../api/customers.js'
import { getDashboardSummary } from '../../api/dashboard.js'
import { listEstablishments } from '../../api/establishments.js'
import { issueFiscalDocumentFromSale, listFiscalDocumentsBySaleId } from '../../api/fiscalDocuments.js'
import { listSales } from '../../api/sales.js'
import { closeCashSession, downloadCashSessionClosePdf, getCurrentCashSession, getCashSessionSummary, openCashSession } from '../../api/cashSessions.js'
import { createExpense, payExpense } from '../../api/expenses.js'
import { listExpenseCategories } from '../../api/expenseCategories.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from '../../services/toast.js'
import { thermalPrinter } from '../../utils/thermalPrinter.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="text-sm font-semibold text-white">{title}</div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300"
              type="button"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

function parseDecimal(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return NaN
  const normalized = raw.replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

export default function SalesPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const businessType = String(branch?.business_type || '').trim().toLowerCase()
  const isRestaurant = businessType === 'restaurant'

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [sales, setSales] = useState([])
  const [openDetails, setOpenDetails] = useState(false)
  const [activeSale, setActiveSale] = useState(null)

  const [establishments, setEstablishments] = useState([])
  const establishmentsById = useMemo(() => {
    const map = new Map()
    for (const p of establishments || []) map.set(Number(p.id), p)
    return map
  }, [establishments])

  const [company, setCompany] = useState(null)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const [issuing, setIssuing] = useState(false)
  const [issuedDoc, setIssuedDoc] = useState(null)
  const [docType, setDocType] = useState('receipt')
  const [docSeries, setDocSeries] = useState('A')
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerNuit, setCustomerNuit] = useState('')

  const [customersLoading, setCustomersLoading] = useState(false)
  const [customers, setCustomers] = useState([])

  const [saleDocsLoading, setSaleDocsLoading] = useState(false)
  const [saleDocs, setSaleDocs] = useState([])

  const [cashSession, setCashSession] = useState(null)
  const [cashLoading, setCashLoading] = useState(false)
  const [openCashOpen, setOpenCashOpen] = useState(false)
  const [cashOpeningBalance, setCashOpeningBalance] = useState('')
  const [openCashClose, setOpenCashClose] = useState(false)
  const [cashClosingCounted, setCashClosingCounted] = useState('')
  const [cashClosingNotes, setCashClosingNotes] = useState('')
  const [cashSummary, setCashSummary] = useState(null)

  const [expenseCategories, setExpenseCategories] = useState([])
  const [openExpenseModal, setOpenExpenseModal] = useState(false)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category_id: '',
  })

  function addExpenseAmount(delta) {
    const current = Number.isFinite(parseDecimal(expenseForm.amount)) ? parseDecimal(expenseForm.amount) : 0
    const next = Math.max(0, Math.round((current + delta) * 100) / 100)
    setExpenseForm({ ...expenseForm, amount: next ? String(next) : '' })
  }

  async function refreshCashSession() {
    try {
      const row = await getCurrentCashSession()
      setCashSession(row || null)
      return row || null
    } catch {
      setCashSession(null)
      return null
    }
  }

  async function refresh() {
    setLoading(true)
    try {
      let points = []
      try {
        const list = await listEstablishments({ branch_id: branch?.id })
        points = Array.isArray(list) ? list : []
      } catch {
        points = []
      }

      const [s, rows] = await Promise.all([
        getDashboardSummary({ establishment_id: isAdmin ? (establishment?.id || undefined) : undefined }),
        listSales({
          limit: 100,
          offset: 0,
          establishment_id: isAdmin ? (establishment?.id || undefined) : undefined,
          status: filterStatus || undefined,
          payment_method: filterPayment || undefined,
          sale_channel: filterChannel || undefined,
          date_from: filterDateFrom ? new Date(filterDateFrom).toISOString() : undefined,
          date_to: filterDateTo ? new Date(filterDateTo).toISOString() : undefined,
        }),
      ])
      setSummary(s)
      setSales(rows || [])
      setEstablishments(points)
    } catch {
      setSummary(null)
      setSales([])
      setEstablishments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?.id, contextVersion, establishment?.id])

  useEffect(() => {
    refreshCashSession()
    ;(async () => {
      try {
        const cats = await listExpenseCategories()
        setExpenseCategories(Array.isArray(cats) ? cats : [])
      } catch {
        setExpenseCategories([])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?.id, contextVersion, establishment?.id])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const companies = await listCompanies()
        if (mounted) setCompany(companies?.[0] || null)
      } catch {
        if (mounted) setCompany(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function applyFilters() {
    await refresh()
  }

  async function clearFilters() {
    setFilterStatus('')
    setFilterPayment('')
    setFilterChannel('')
    setFilterDateFrom('')
    setFilterDateTo('')
    window.setTimeout(() => refresh(), 0)
  }

  const paymentMethodLabel = useMemo(() => {
    return {
      cash: 'Dinheiro',
      card: 'Cartão (POS)',
      mpesa: 'M-Pesa',
      emola: 'e-Mola',
      mkesh: 'mKesh',
      transfer: 'Transferência',
      cheque: 'Cheque',
      other: 'Outro',
      debt: 'Dívida (Fiado)',
    }
  }, [])

  const fmtPaymentMethod = useMemo(() => {
    return (value) => {
      const k = String(value || '').trim().toLowerCase()
      return paymentMethodLabel[k] || (value || '-')
    }
  }, [paymentMethodLabel])

  const statusLabel = useMemo(() => {
    return {
      paid: 'Pago',
      void: 'Anulado',
      open: 'Aberto',
      pending: 'Pendente',
    }
  }, [])

  const fmtStatus = useMemo(() => {
    return (value) => {
      const k = String(value || '').trim().toLowerCase()
      return statusLabel[k] || (value || '-')
    }
  }, [statusLabel])

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL || 'https://neoerp-production.up.railway.app', [])

  useEffect(() => {
    if (!openDetails) return
    setIssuedDoc(null)
    setIssuing(false)
    setDocType('receipt')
    setDocSeries('A')
    setCustomerId('')
    setCustomerName('')
    setCustomerNuit('')
    setSaleDocs([])
    setSaleDocsLoading(false)
  }, [openDetails])

  useEffect(() => {
    if (!openDetails) return
    let mounted = true
    ;(async () => {
      setCustomersLoading(true)
      try {
        const rows = await listCustomers({ q: '', limit: 200, offset: 0 })
        if (!mounted) return
        setCustomers(Array.isArray(rows) ? rows : [])
      } catch {
        if (!mounted) return
        setCustomers([])
      } finally {
        if (mounted) setCustomersLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [openDetails])

  useEffect(() => {
    if (!openDetails) return
    if (!activeSale?.id) return
    let mounted = true
    ;(async () => {
      setSaleDocsLoading(true)
      try {
        const docs = await listFiscalDocumentsBySaleId(Number(activeSale.id))
        if (!mounted) return
        setSaleDocs(Array.isArray(docs) ? docs : [])
      } catch (e) {
        if (!mounted) return
        setSaleDocs([])
      } finally {
        if (mounted) setSaleDocsLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [openDetails, activeSale?.id])

  const fmtDateTimeValue = useMemo(() => {
    return (value) => {
      if (!value) return '-'
      try {
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return String(value)
        return d.toLocaleString('pt-MZ')
      } catch {
        return String(value)
      }
    }
  }, [])

  const saleChannelLabel = useMemo(() => {
    return {
      counter: 'Balcão',
      table: 'Mesa',
      debt: 'Dívida',
      printer: 'Impressora',
    }
  }, [])

  const saleChannelBadgeClassName = useMemo(() => {
    return (channel) => {
      const c = String(channel || '').trim().toLowerCase()
      if (c === 'debt') return 'border-amber-900/60 bg-amber-950/40 text-amber-200'
      if (c === 'table') return 'border-indigo-900/60 bg-indigo-950/40 text-indigo-200'
      if (c === 'counter') return 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
      if (c === 'printer') return 'border-sky-900/60 bg-sky-950/40 text-sky-200'
      return 'border-slate-700 bg-slate-900/40 text-slate-200'
    }
  }, [])

  const fmtMoney = useMemo(() => {
    try {
      return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }, [])

  const fmtDateTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('pt-MZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return new Intl.DateTimeFormat('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }, [])

  return (
    <div className="h-[calc(100vh-56px-48px)] overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Vendas</div>
          <div className="mt-1 text-sm text-slate-300">Histórico e resumo</div>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={cashLoading}
            onClick={async () => {
              const cs = await refreshCashSession()
              if (cs?.id) {
                try {
                  const s = await getCashSessionSummary(Number(cs.id))
                  setCashSummary(s || null)
                  // Pré-preencher valor contado com o esperado
                  setCashClosingCounted(String(s?.expected_cash || 0))
                } catch {
                  setCashSummary(null)
                  setCashClosingCounted('0')
                }
                setCashClosingNotes('')
                setOpenCashClose(true)
              } else {
                setCashOpeningBalance('')
                setOpenCashOpen(true)
              }
            }}
            className={`w-full sm:w-auto rounded-xl border ${cashSession?.id ? 'border-emerald-900/60 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-200' : 'border-amber-900/60 bg-amber-950/30 hover:bg-amber-950/50 text-amber-200'} px-4 py-2.5 text-sm font-semibold disabled:opacity-60`}
            title={cashSession?.id ? 'Caixa aberto' : 'Caixa fechado'}
          >
            {cashSession?.id ? 'Fechar caixa' : 'Abrir caixa'}
          </button>

          <button
            type="button"
            disabled={!cashSession?.id}
            onClick={() => {
              setExpenseForm({ description: '', amount: '', category_id: '' })
              setOpenExpenseModal(true)
            }}
            className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            title={!cashSession?.id ? 'Abra o caixa para registrar despesa' : 'Registrar despesa (saída)'}
          >
            Registrar despesa
          </button>

          <button
            type="button"
            onClick={async () => {
              await Promise.all([refresh(), refreshCashSession()])
            }}
            className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Sales Filters */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="text-sm font-semibold text-white mb-3">Filtros</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                refresh()
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="completed">Concluída</option>
              <option value="pending">Pendente</option>
              <option value="void">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Método de Pagamento</label>
            <select
              value={filterPayment}
              onChange={(e) => {
                setFilterPayment(e.target.value)
                refresh()
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="cash">Dinheiro</option>
              <option value="mpesa">M-Pesa</option>
              <option value="card">Cartão</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Canal de Venda</label>
            <select
              value={filterChannel}
              onChange={(e) => {
                setFilterChannel(e.target.value)
                refresh()
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="pos">PDV</option>
              <option value="ecommerce">E-commerce</option>
              <option value="phone">Telefone</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value)
                  refresh()
                }}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="De"
              />
              <input
                type="datetime-local"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value)
                  refresh()
                }}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="Até"
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 flex flex-col flex-1 min-h-0">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-sm font-semibold text-white">Vendas recentes</div>
          <div className="mt-1 text-xs text-slate-400">Clique em atualizar após finalizar uma venda no PDV</div>
          {isAdmin ? (
            <div className="mt-3 text-xs text-slate-400">
              Ponto ativo: <span className="text-slate-100">{establishment?.name || '-'}</span>
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="md:hidden p-4">
            {loading ? (
              <div className="py-6 text-sm text-slate-300">Carregando...</div>
            ) : sales?.length ? (
              <div className="grid gap-3">
                {(sales || []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:bg-slate-900"
                    onClick={() => {
                      setActiveSale(s)
                      setOpenDetails(true)
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">Venda #{s.id}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {s?.created_at ? fmtDateTime.format(new Date(s.created_at)) : '-'}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Ponto: <span className="text-slate-200">{establishmentsById.get(Number(s.establishment_id || 0))?.name || '-'}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-sm font-semibold text-white">
                        {fmtMoney.format(Number(s?.total || 0))}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">Caixa</div>
                        <div className="mt-1 text-sm text-slate-200 truncate">{s?.cashier_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">Pagamento</div>
                        <div className="mt-1 text-sm text-slate-200 truncate">{fmtPaymentMethod(s?.payment_method)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">Tipo</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              saleChannelBadgeClassName(s?.sale_channel)
                            }`}
                          >
                            {saleChannelLabel[(s?.sale_channel || '').toLowerCase()] || (s?.sale_channel || '-')}
                          </span>
                        </div>
                      </div>
                      {isRestaurant ? (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400">Mesa</div>
                          <div className="mt-1 text-sm text-slate-200 truncate">
                            {(s?.sale_channel || '').toLowerCase() === 'table'
                              ? `Mesa ${s?.table_number ?? '-'} · ${s?.seat_number ?? '-'}`
                              : '-'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-sm text-slate-400">Sem vendas para mostrar</div>
            )}
          </div>

          <div className="hidden md:block">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur text-slate-300">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">ID</th>
                  <th className="px-5 py-3 text-left font-semibold">Caixa</th>
                  <th className="px-5 py-3 text-left font-semibold">Ponto</th>
                  <th className="px-5 py-3 text-left font-semibold">Data</th>
                  <th className="px-5 py-3 text-left font-semibold">Tipo</th>
                  {isRestaurant ? <th className="px-5 py-3 text-left font-semibold">Mesa</th> : null}
                  <th className="px-5 py-3 text-left font-semibold">Pagamento</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(sales || []).map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-950/40 cursor-pointer"
                    onClick={() => {
                      setActiveSale(s)
                      setOpenDetails(true)
                    }}
                  >
                    <td className="px-5 py-3 text-slate-200">#{s.id}</td>
                    <td className="px-5 py-3 text-slate-200">{s?.cashier_name || '-'}</td>
                    <td className="px-5 py-3 text-slate-200">{establishmentsById.get(Number(s.establishment_id || 0))?.name || '-'}</td>
                    <td className="px-5 py-3 text-slate-200">{s?.created_at ? fmtDateTime.format(new Date(s.created_at)) : '-'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          saleChannelBadgeClassName(s?.sale_channel)
                        }`}
                      >
                        {saleChannelLabel[(s?.sale_channel || '').toLowerCase()] || (s?.sale_channel || '-')}
                      </span>
                    </td>
                    {isRestaurant ? (
                      <td className="px-5 py-3 text-slate-200">
                        {(s?.sale_channel || '').toLowerCase() === 'table' ? `Mesa ${s?.table_number ?? '-'} · ${s?.seat_number ?? '-'}` : '-'}
                      </td>
                    ) : null}
                    <td className="px-5 py-3 text-slate-200">{fmtPaymentMethod(s?.payment_method)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{fmtMoney.format(Number(s?.total || 0))}</td>
                  </tr>
                ))}

                {!loading && (!sales || sales.length === 0) && (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-400" colSpan={isRestaurant ? 8 : 7}>
                      Sem vendas para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={openDetails}
        title={activeSale?.id ? `Detalhes da venda #${activeSale.id}` : 'Detalhes da venda'}
        onClose={() => {
          setOpenDetails(false)
          setActiveSale(null)
          setIssuedDoc(null)
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-semibold text-slate-400">Caixa</div>
            <div className="mt-1 text-sm font-semibold text-white">{activeSale?.cashier_name || '-'}</div>
            <div className="mt-3 text-xs font-semibold text-slate-400">Ponto</div>
            <div className="mt-1 text-sm text-slate-200">
              {establishmentsById.get(Number(activeSale?.establishment_id || 0))?.name || '-'}
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-400">Tipo</div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  saleChannelBadgeClassName(activeSale?.sale_channel)
                }`}
              >
                {saleChannelLabel[(activeSale?.sale_channel || '').toLowerCase()] || (activeSale?.sale_channel || '-')}
              </span>
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-400">Data/Hora</div>
            <div className="mt-1 text-sm text-slate-200">
              {activeSale?.created_at ? fmtDateTime.format(new Date(activeSale.created_at)) : '-'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-semibold text-slate-400">Resumo</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400">Canal</div>
                <div className="text-sm text-white">
                  {saleChannelLabel[(activeSale?.sale_channel || '').toLowerCase()] || (activeSale?.sale_channel || '-')}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Pagamento</div>
                <div className="text-sm text-white">{fmtPaymentMethod(activeSale?.payment_method)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Status</div>
                <div className="text-sm text-white">{fmtStatus(activeSale?.status)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Pago</div>
                <div className="text-sm text-white">{fmtMoney.format(Number(activeSale?.paid || 0))}</div>
              </div>
              {(activeSale?.sale_channel || '').toLowerCase() === 'table' ? (
                <>
                  <div>
                    <div className="text-xs text-slate-400">Mesa</div>
                    <div className="text-sm text-white">{activeSale?.table_number ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Assento</div>
                    <div className="text-sm text-white">{activeSale?.seat_number ?? '-'}</div>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <div className="text-xs text-slate-400">Atendimento</div>
                  <div className="text-sm text-white">
                    {saleChannelLabel[(activeSale?.sale_channel || '').toLowerCase()] || 'Balcão'}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 h-px bg-slate-800" />
            <div className="mt-3 flex items-end justify-between">
              <div className="text-xs font-semibold text-slate-400">Total</div>
              <div className="text-lg font-semibold text-white">{fmtMoney.format(Number(activeSale?.total || 0))} MZN</div>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-xs font-semibold text-slate-400">Troco</div>
              <div className="text-sm font-semibold text-slate-200">{fmtMoney.format(Number(activeSale?.change || 0))} MZN</div>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="text-sm font-semibold text-white">Itens vendidos</div>
            <div className="mt-1 text-xs text-slate-400">{(activeSale?.items || []).length} item(ns)</div>
          </div>
          <div className="max-h-[50vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/60 text-slate-300">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Produto</th>
                  <th className="px-4 py-2 text-right font-semibold">Qtd</th>
                  <th className="px-4 py-2 text-right font-semibold">Preço</th>
                  <th className="px-4 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(activeSale?.items || []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2 text-slate-200">{it?.product_name || `#${it?.product_id ?? '-'}`}</td>
                    <td className="px-4 py-2 text-right text-slate-200">{Number(it?.qty || 0)}</td>
                    <td className="px-4 py-2 text-right text-slate-200">{fmtMoney.format(Number(it?.price_at_sale || 0))}</td>
                    <td className="px-4 py-2 text-right font-semibold text-white">{fmtMoney.format(Number(it?.line_total || 0))}</td>
                  </tr>
                ))}

                {(!activeSale?.items || activeSale.items.length === 0) && (
                  <tr>
                    <td className="px-4 py-4 text-center text-slate-400" colSpan={4}>
                      Sem itens
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="text-sm font-semibold text-white">Emitir documento (Fatura/Recibo/Talão)</div>
            <div className="mt-1 text-xs text-slate-400">Gera numeração por série e guarda o cliente/NUIT (opcional)</div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-400">Tipo</div>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="invoice">Fatura</option>
                  <option value="receipt">Recibo</option>
                  <option value="ticket">Talão</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Série</div>
                <input
                  value={docSeries}
                  onChange={(e) => setDocSeries(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
                  placeholder="A"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Cliente (opcional)</div>
                <select
                  value={customerId}
                  onChange={(e) => {
                    const next = e.target.value
                    setCustomerId(next)
                    if (!next) return
                    const c = (customers || []).find((x) => String(x.id) === String(next))
                    if (!c) return
                    setCustomerName(String(c.name || ''))
                    setCustomerNuit(String(c.nuit || ''))
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="">{customersLoading ? 'Carregando clientes...' : 'Selecionar cliente...'}</option>
                  {(customers || []).map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}{c.nuit ? ` · NUIT: ${c.nuit}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">NUIT (opcional)</div>
                <input
                  value={customerNuit}
                  onChange={(e) => {
                    setCustomerId('')
                    setCustomerNuit(e.target.value)
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 disabled:opacity-60"
                  placeholder="Ex: 123456789"
                  disabled={Boolean(customerId)}
                />
              </div>
            </div>

            {!customerId ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-400">Nome do cliente (opcional)</div>
                <input
                  value={customerName}
                  onChange={(e) => {
                    setCustomerId('')
                    setCustomerName(e.target.value)
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
                  placeholder="Nome do cliente"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Se selecionar um cliente acima, o nome/NUIT serão preenchidos automaticamente.
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-300">
                Cliente selecionado: <span className="font-semibold text-white">{customerName || '-'}</span>
                {customerNuit ? <span> · NUIT: {customerNuit}</span> : null}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              {issuedDoc?.id ? (
                <div className="mr-auto text-sm text-slate-200">
                  Emitido: <span className="font-semibold text-white">{issuedDoc.document_type}/{issuedDoc.series}/{issuedDoc.number}</span>
                </div>
              ) : null}

              {/* Botão de Impressão Térmica */}
              <button
                type="button"
                disabled={!activeSale?.id}
                onClick={async () => {
                  if (!activeSale?.id) return
                  
                  try {
                    // Preparar dados da venda para impressão
                    const saleData = {
                      sale: activeSale,
                      items: activeSale.items || [],
                      company: {
                        name: 'ERPCRM - Sistema de Gestão',
                        address: 'Endereço da Empresa',
                        phone: '+258 84 123 4567',
                        document: 'NUIT: 123456789'
                      },
                      customer: activeSale.customer || null,
                      payment: {
                        method: activeSale.payment_method || 'cash',
                        amount_paid: activeSale.paid || activeSale.total,
                        change: activeSale.change || 0
                      }
                    }

                    toast.loading('Enviando para impressora...')
                    
                    const result = await thermalPrinter.printReceipt(saleData)
                    
                    if (result.success) {
                      toast.success('Recibo impresso com sucesso!')
                    } else {
                      toast.error(`Falha na impressão: ${result.error}`)
                    }
                  } catch (error) {
                    toast.error(`Erro ao imprimir: ${error.message}`)
                  }
                }}
                className="rounded-xl border border-slate-600 bg-slate-700 hover:bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Recibo
              </button>

              <button
                type="button"
                disabled={issuing || !activeSale?.id}
                onClick={async () => {
                  if (!activeSale?.id) return
                  setIssuing(true)
                  try {
                    const payload = {
                      sale_id: Number(activeSale.id),
                      document_type: String(docType || '').trim().toLowerCase(),
                      series: String(docSeries || 'A').trim().toUpperCase() || 'A',
                      customer_id: customerId ? Number(customerId) : null,
                      customer:
                        !customerId && customerName.trim()
                          ? {
                              name: customerName.trim(),
                              nuit: customerNuit.trim() || null,
                            }
                          : null,
                    }
                    const doc = await issueFiscalDocumentFromSale(payload)
                    setIssuedDoc(doc)
                    toast.success('Documento emitido com sucesso.')

                    try {
                      const docs = await listFiscalDocumentsBySaleId(Number(activeSale.id))
                      setSaleDocs(Array.isArray(docs) ? docs : [])
                    } catch {
                      // ignore
                    }
                  } catch (e) {
                    const msg = e?.response?.data?.detail || 'Falha ao emitir documento.'
                    toast.error(msg)
                  } finally {
                    setIssuing(false)
                  }
                }}
                className="rounded-xl border border-brand-600 bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {issuing ? 'Emitindo...' : 'Emitir'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="text-sm font-semibold text-white">Documentos desta venda</div>
            <div className="mt-1 text-xs text-slate-400">Recibos/Faturas/Talões emitidos para esta venda</div>
          </div>

          <div className="p-4">
            {saleDocsLoading ? (
              <div className="text-sm text-slate-400">Carregando documentos...</div>
            ) : saleDocs?.length ? (
              <div className="space-y-3">
                {saleDocs.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {String(d.document_type || '').toUpperCase()} {d.series}/{d.number}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Estado: {d.status} · Emitido: {fmtDateTimeValue(d.issued_at)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Cliente: {d.customer_name || '-'} {d.customer_nuit ? `· NUIT: ${d.customer_nuit}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const companyName = company?.name || ''
                            const companyNuit = company?.nuit || ''
                            const companyPhone = company?.phone || ''
                            const companyEmail = company?.email || ''
                            const companyAddress = company?.address || ''
                            const companyCity = company?.city || ''
                            const companyProvince = company?.province || ''
                            const logoUrl = company?.logo_url ? apiBaseUrl + company.logo_url : ''

                            const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${d.document_type} ${d.series}/${d.number}</title></head><body style="font-family: Arial, sans-serif; padding: 20px;">
                              <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
                                ${logoUrl ? `<div style="width:72px; height:72px; border:1px solid #ddd; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center;"><img src="${logoUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" /></div>` : ''}
                                <div style="flex:1; min-width:0;">
                                  ${companyName ? `<div style="font-size:18px; font-weight:700;">${companyName}</div>` : ''}
                                  <div style="margin-top:4px; font-size:12px; color:#333;">
                                    ${companyNuit ? `<span><b>NUIT:</b> ${companyNuit}</span>` : ''}
                                    ${companyPhone ? `<span style="margin-left:12px;"><b>Tel:</b> ${companyPhone}</span>` : ''}
                                    ${companyEmail ? `<span style="margin-left:12px;"><b>Email:</b> ${companyEmail}</span>` : ''}
                                  </div>
                                  <div style="margin-top:4px; font-size:12px; color:#333;">
                                    ${(companyAddress || companyCity || companyProvince)
                                      ? `<span>${[companyAddress, companyCity, companyProvince].filter(Boolean).join(' - ')}</span>`
                                      : ''}
                                  </div>
                                </div>
                              </div>

                              <h2 style="margin:0 0 8px 0;">Documento Fiscal</h2>
                              <div><b>Tipo:</b> ${d.document_type}</div>
                              <div><b>Série/Número:</b> ${d.series}/${d.number}</div>
                              <div><b>Data:</b> ${fmtDateTimeValue(d.issued_at)}</div>
                              <div><b>Cliente:</b> ${d.customer_name || '-'} ${d.customer_nuit ? `(NUIT: ${d.customer_nuit})` : ''}</div>
                              <hr />
                              <div><b>Total:</b> ${(d.gross_total ?? 0).toFixed ? d.gross_total.toFixed(2) : d.gross_total} ${d.currency || ''}</div>
                              <div><b>Incidência:</b> ${(d.net_total ?? 0).toFixed ? d.net_total.toFixed(2) : d.net_total}</div>
                              <div><b>IVA:</b> ${(d.tax_total ?? 0).toFixed ? d.tax_total.toFixed(2) : d.tax_total}</div>
                              <hr />
                              <h3>Linhas</h3>
                              <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%;">
                                <thead><tr><th>Descrição</th><th>Qtd</th><th>Preço</th><th>IVA%</th><th>Total</th></tr></thead>
                                <tbody>
                                  ${(d.lines || [])
                                    .map(
                                      (l) =>
                                        `<tr><td>${l.description || ''}</td><td>${l.qty}</td><td>${l.unit_price}</td><td>${l.tax_rate}</td><td>${l.line_gross}</td></tr>`
                                    )
                                    .join('')}
                                </tbody>
                              </table>
                              <script>
                                (function () {
                                  function doPrint() {
                                    setTimeout(function () {
                                      try { window.print(); } catch (e) {}
                                    }, 200);
                                  }

                                  var imgs = Array.prototype.slice.call(document.images || []);
                                  if (!imgs.length) {
                                    return doPrint();
                                  }

                                  var pending = imgs.length;
                                  function doneOne() {
                                    pending -= 1;
                                    if (pending <= 0) doPrint();
                                  }

                                  imgs.forEach(function (img) {
                                    if (img.complete) {
                                      doneOne();
                                      return;
                                    }
                                    img.addEventListener('load', doneOne);
                                    img.addEventListener('error', doneOne);
                                  });

                                  // fallback: print mesmo se a imagem demorar
                                  setTimeout(doPrint, 1500);
                                })();
                              </script>
                            </body></html>`
                            const w = window.open('', '_blank')
                            if (!w) return
                            w.document.open()
                            w.document.write(html)
                            w.document.close()
                          }}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Imprimir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Ainda não há documentos emitidos para esta venda.</div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={openCashOpen}
        title="Abrir caixa"
        onClose={() => {
          if (!cashLoading) setOpenCashOpen(false)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">Informe o fundo de caixa (troco inicial).</div>
          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Valor de abertura</div>
            <input
              value={cashOpeningBalance}
              onChange={(e) => setCashOpeningBalance(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="decimal"
              placeholder="0.00"
              type="text"
            />
          </label>

          <button
            type="button"
            disabled={cashLoading}
            onClick={async () => {
              const n = parseDecimal(cashOpeningBalance)
              if (!Number.isFinite(n) || n < 0) {
                toast.error('Valor de abertura inválido.')
                return
              }
              try {
                setCashLoading(true)
                const row = await openCashSession({ opening_balance: n })
                setCashSession(row || null)
                setOpenCashOpen(false)
                toast.success('Caixa aberto.')
              } catch (err) {
                const msg = err?.response?.data?.detail || 'Não foi possível abrir o caixa agora.'
                toast.error(msg)
              } finally {
                setCashLoading(false)
              }
            }}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {cashLoading ? 'Abrindo...' : 'Abrir caixa'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openCashClose}
        title="Fechar caixa"
        onClose={() => {
          if (!cashLoading) setOpenCashClose(false)
        }}
      >
        <div className="grid gap-4">
          {cashSummary ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <div>Total de vendas (todos os métodos)</div>
                <div className="font-semibold text-white">{Number(cashSummary.total_sales_all_methods || 0).toFixed(2)} MZN</div>
              </div>
              <div className="mt-2 flex items-center justify-between text-slate-300">
                <div>Esperado (dinheiro)</div>
                <div className="font-semibold text-white">{Number(cashSummary.expected_cash || 0).toFixed(2)} MZN</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">Vendas (dinheiro)</div>
                <div className="text-right text-slate-200">{Number(cashSummary.cash_sales_total || 0).toFixed(2)} MZN</div>
                <div className="text-slate-400">Despesas (dinheiro)</div>
                <div className="text-right text-slate-200">{Number(cashSummary.cash_expenses_total || 0).toFixed(2)} MZN</div>
              </div>
            </div>
          ) : null}

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Valor contado</div>
            <input
              value={cashClosingCounted}
              onChange={(e) => setCashClosingCounted(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="decimal"
              placeholder="0.00"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Observações (opcional)</div>
            <input
              value={cashClosingNotes}
              onChange={(e) => setCashClosingNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: sangria, diferença, etc."
              type="text"
            />
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={cashLoading}
              onClick={() => setOpenCashClose(false)}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={cashLoading || !cashSession?.id}
              onClick={async () => {
                const n = parseDecimal(cashClosingCounted)
                if (!Number.isFinite(n) || n < 0) {
                  toast.error('Valor contado inválido. Informe um valor maior ou igual a 0.')
                  return
                }
                try {
                  setCashLoading(true)
                  await closeCashSession(Number(cashSession.id), {
                    closing_balance_counted: n,
                    notes: String(cashClosingNotes || '').trim() || null,
                  })
                  toast.success('Caixa fechado.')

                  // Download PDF do backend (igual PDV3)
                  try {
                    await downloadCashSessionClosePdf(Number(cashSession.id))
                  } catch (pdfErr) {
                    console.error('Erro ao baixar PDF:', pdfErr)
                    toast.error('PDF não foi gerado, mas caixa foi fechado.')
                  }

                  setOpenCashClose(false)
                  setCashSession(null)
                  setCashSummary(null)
                } catch (err) {
                  const msg = err?.response?.data?.detail || 'Não foi possível fechar o caixa agora.'
                  toast.error(msg)
                } finally {
                  setCashLoading(false)
                }
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cashLoading ? 'Fechando...' : 'Fechar caixa'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openExpenseModal}
        title="Registrar despesa"
        onClose={() => {
          if (!expenseSaving) setOpenExpenseModal(false)
        }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Descrição</div>
            <input
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: compra urgente, transporte, etc."
              type="text"
            />
          </label>

          <div>
            <div className="text-xs font-semibold text-slate-400">Valor (MZN)</div>
            <input
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="decimal"
              placeholder="0.00"
              type="text"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addExpenseAmount(50)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => addExpenseAmount(100)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +100
              </button>
              <button
                type="button"
                onClick={() => addExpenseAmount(500)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => addExpenseAmount(1000)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +1000
              </button>
              <button
                type="button"
                onClick={() => setExpenseForm({ ...expenseForm, amount: '' })}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                Limpar
              </button>
            </div>
          </div>

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Categoria (opcional)</div>
            <select
              value={expenseForm.category_id}
              onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Sem categoria</option>
              {(expenseCategories || []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={expenseSaving}
              onClick={() => setOpenExpenseModal(false)}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={expenseSaving || !cashSession?.id}
              onClick={async () => {
                const description = String(expenseForm.description || '').trim()
                const amount = parseDecimal(expenseForm.amount)
                const category_id = expenseForm.category_id ? Number(expenseForm.category_id) : null

                if (!description) {
                  toast.error('Descrição é obrigatória.')
                  return
                }
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast.error('Valor inválido.')
                  return
                }
                if (!cashSession?.id) {
                  toast.error('Abra o caixa para registrar a despesa.')
                  return
                }

                try {
                  setExpenseSaving(true)
                  const today = new Date()
                  const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)
                  const created = await createExpense({
                    description,
                    amount,
                    due_date: dueDate,
                    category_id,
                  })
                  await payExpense(Number(created.id), {})
                  toast.success('Despesa registrada no caixa.')
                  setOpenExpenseModal(false)
                  await refreshCashSession()
                } catch (err) {
                  const msg = err?.response?.data?.detail || 'Não foi possível registrar a despesa agora.'
                  toast.error(msg)
                } finally {
                  setExpenseSaving(false)
                }
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {expenseSaving ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
