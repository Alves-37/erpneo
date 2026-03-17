import { useEffect, useMemo, useState } from 'react'

import { listCompanies } from '../../api/companies.js'
import { listCustomers } from '../../api/customers.js'
import { getDashboardSummary } from '../../api/dashboard.js'
import { listEstablishments } from '../../api/establishments.js'
import { issueFiscalDocumentFromSale, listFiscalDocumentsBySaleId } from '../../api/fiscalDocuments.js'
import { listSales } from '../../api/sales.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from '../../services/toast.js'

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

export default function SalesPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)

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
        listSales({ limit: 100, offset: 0, establishment_id: isAdmin ? (establishment?.id || undefined) : undefined }),
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
        <button
          type="button"
          onClick={refresh}
          className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs font-semibold text-slate-400">Vendas de hoje</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {loading ? '-' : fmtMoney.format(Number(summary?.sales_today || 0))}
          </div>
          <div className="mt-2 text-xs text-slate-400">MZN</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs font-semibold text-slate-400">Total de vendas listadas</div>
          <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : Number(sales?.length || 0)}</div>
          <div className="mt-2 text-xs text-slate-400">Últimas {Math.min(100, Number(sales?.length || 0))}</div>
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
                        <div className="mt-1 text-sm text-slate-200 truncate">{s?.payment_method || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">Tipo</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              (s?.sale_channel || '').toLowerCase() === 'table'
                                ? 'border-indigo-900/60 bg-indigo-950/40 text-indigo-200'
                                : 'border-slate-800 bg-slate-950 text-slate-200'
                            }`}
                          >
                            {saleChannelLabel[(s?.sale_channel || '').toLowerCase()] || (s?.sale_channel || '-')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">Mesa</div>
                        <div className="mt-1 text-sm text-slate-200 truncate">
                          {(s?.sale_channel || '').toLowerCase() === 'table'
                            ? `Mesa ${s?.table_number ?? '-'} · ${s?.seat_number ?? '-'}`
                            : '-'}
                        </div>
                      </div>
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
                  <th className="px-5 py-3 text-left font-semibold">Mesa</th>
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
                          (s?.sale_channel || '').toLowerCase() === 'table'
                            ? 'border-indigo-900/60 bg-indigo-950/40 text-indigo-200'
                            : 'border-slate-800 bg-slate-950 text-slate-200'
                        }`}
                      >
                        {saleChannelLabel[(s?.sale_channel || '').toLowerCase()] || (s?.sale_channel || '-')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-200">
                      {(s?.sale_channel || '').toLowerCase() === 'table' ? `Mesa ${s?.table_number ?? '-'} · ${s?.seat_number ?? '-'}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-200">{s?.payment_method || '-'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{fmtMoney.format(Number(s?.total || 0))}</td>
                  </tr>
                ))}

                {!loading && (!sales || sales.length === 0) && (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-400" colSpan={8}>
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
                  (activeSale?.sale_channel || '').toLowerCase() === 'table'
                    ? 'border-indigo-900/60 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-950 text-slate-200'
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
                <div className="text-sm text-white">{activeSale?.sale_channel || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Pagamento</div>
                <div className="text-sm text-white">{activeSale?.payment_method || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Status</div>
                <div className="text-sm text-white">{activeSale?.status || '-'}</div>
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
                  <div className="text-sm text-white">Balcão</div>
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
    </div>
  )
}
