import { useEffect, useMemo, useState } from 'react'

import { getDailyZReport, getVatByRateReport, getDailyZPdf, getVatByRatePdf, getSalesByPeriodPdf, getCashClosurePdf } from '../../api/reports.js'
import { getSalesByPeriod, getCashClosure } from '../../api/sales.js'
import { toast } from '../../services/toast.js'

export default function ReportsPage() {
  const today = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const [activeTab, setActiveTab] = useState('dailyZ')

  const [day, setDay] = useState(today)
  const [loadingZ, setLoadingZ] = useState(false)
  const [z, setZ] = useState(null)

  const [startDay, setStartDay] = useState(today)
  const [endDay, setEndDay] = useState(today)
  const [loadingVat, setLoadingVat] = useState(false)
  const [vat, setVat] = useState(null)

  const [salesStartDay, setSalesStartDay] = useState(today)
  const [salesEndDay, setSalesEndDay] = useState(today)
  const [loadingSales, setLoadingSales] = useState(false)
  const [sales, setSales] = useState(null)

  const [closureDay, setClosureDay] = useState(today)
  const [loadingClosure, setLoadingClosure] = useState(false)
  const [closure, setClosure] = useState(null)

  async function loadDailyZ(targetDay) {
    setLoadingZ(true)
    try {
      const data = await getDailyZReport(targetDay)
      setZ(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar o fecho diário.'
      toast.error(msg)
      setZ(null)
    } finally {
      setLoadingZ(false)
    }
  }

  async function loadVat(targetStartDay, targetEndDay) {
    setLoadingVat(true)
    try {
      const data = await getVatByRateReport({ start_day: targetStartDay, end_day: targetEndDay })
      setVat(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar o relatório de IVA.'
      toast.error(msg)
      setVat(null)
    } finally {
      setLoadingVat(false)
    }
  }

  async function loadSales(targetStartDay, targetEndDay) {
    setLoadingSales(true)
    try {
      const data = await getSalesByPeriod({ start_day: targetStartDay, end_day: targetEndDay })
      setSales(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar as vendas.'
      toast.error(msg)
      setSales(null)
    } finally {
      setLoadingSales(false)
    }
  }

  async function loadClosure(targetDay) {
    setLoadingClosure(true)
    try {
      const data = await getCashClosure(targetDay)
      setClosure(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar o fecho de caixa.'
      toast.error(msg)
      setClosure(null)
    } finally {
      setLoadingClosure(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'dailyZ') loadDailyZ(day)
    if (activeTab === 'vat') loadVat(startDay, endDay)
    if (activeTab === 'sales') loadSales(salesStartDay, salesEndDay)
    if (activeTab === 'closure') loadClosure(closureDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'sales') return
    if (!salesStartDay || !salesEndDay) return
    if (String(salesStartDay) > String(salesEndDay)) {
      setSales(null)
      return
    }

    const t = setTimeout(() => {
      loadSales(salesStartDay, salesEndDay)
    }, 350)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, salesStartDay, salesEndDay])

  function downloadCsv(filename, rows) {
    const escape = (v) => {
      const s = String(v ?? '')
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`
      return s
    }
    const csv = rows.map((r) => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function openBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="text-xl font-semibold">Relatórios</div>
      <div className="mt-1 text-sm text-slate-300">Relatórios AT (Moçambique) baseados em documentos fiscais emitidos.</div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('dailyZ')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            activeTab === 'dailyZ'
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
          }`}
        >
          Fecho diário (Z)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vat')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            activeTab === 'vat'
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
          }`}
        >
          IVA por taxa
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            activeTab === 'sales'
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
          }`}
        >
          Vendas por período
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('closure')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            activeTab === 'closure'
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
          }`}
        >
          Fecho de caixa
        </button>
      </div>

      {activeTab === 'dailyZ' ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-white">Fecho diário (Z)</div>
              <div className="text-xs text-slate-400">Data (Africa/Maputo)</div>
              <input
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="date"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await loadDailyZ(day)
                }}
                disabled={loadingZ}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingZ ? 'Carregando...' : 'Atualizar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const rows = [
                    ['day', z?.day || day],
                    ['docs_issued', z?.docs_issued ?? 0],
                    ['docs_cancelled', z?.docs_cancelled ?? 0],
                    ['net_total', z?.net_total ?? 0],
                    ['tax_total', z?.tax_total ?? 0],
                    ['gross_total', z?.gross_total ?? 0],
                  ]
                  downloadCsv(`fecho_z_${day}.csv`, rows)
                }}
                disabled={!z}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await getDailyZPdf(day)
                    openBlob(blob, `fecho_z_${day}.pdf`)
                  } catch (err) {
                    const msg = err?.response?.data?.detail || 'Não foi possível gerar o PDF.'
                    toast.error(msg)
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Docs emitidos</div>
              <div className="mt-1 text-lg font-semibold text-white">{z?.docs_issued ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Docs anulados</div>
              <div className="mt-1 text-lg font-semibold text-white">{z?.docs_cancelled ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">IVA</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(z?.tax_total ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Total</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(z?.gross_total ?? 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white">Por tipo</div>

              <div className="md:hidden p-4">
                {(z?.by_type || []).length ? (
                  <div className="grid gap-2">
                    {(z?.by_type || []).map((r) => (
                      <div key={r.document_type} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate" title={r.document_type || ''}>
                              {r.document_type}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">Qtd: {r.count ?? 0}</div>
                          </div>
                          <div className="shrink-0 text-sm font-semibold text-slate-100">
                            {Number(r.gross_total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">Sem dados</div>
                )}
              </div>

              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Qtd</th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(z?.by_type || []).map((r) => (
                      <tr key={r.document_type} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{r.document_type}</td>
                        <td className="px-4 py-3 text-slate-200">{r.count}</td>
                        <td className="px-4 py-3 text-slate-200">{Number(r.gross_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {!((z?.by_type || []).length) ? (
                      <tr className="border-t border-slate-800">
                        <td className="px-4 py-4 text-slate-400" colSpan={3}>
                          Sem dados
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white">IVA por taxa</div>

              <div className="md:hidden p-4">
                {(z?.vat_by_rate || []).length ? (
                  <div className="grid gap-2">
                    {(z?.vat_by_rate || []).map((r) => (
                      <div key={r.tax_rate} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">{Number(r.tax_rate || 0).toFixed(2)}%</div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-[11px] font-semibold text-slate-400">Incidência</div>
                                <div className="mt-0.5 text-sm text-slate-200">{Number(r.net_total || 0).toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold text-slate-400">IVA</div>
                                <div className="mt-0.5 text-sm text-slate-200">{Number(r.tax_total || 0).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-semibold text-slate-100">
                            {Number(r.gross_total || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-400">Total</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">Sem dados</div>
                )}
              </div>

              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Taxa</th>
                      <th className="px-4 py-3">Incidência</th>
                      <th className="px-4 py-3">IVA</th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(z?.vat_by_rate || []).map((r) => (
                      <tr key={r.tax_rate} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{Number(r.tax_rate || 0).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-slate-200">{Number(r.net_total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-200">{Number(r.tax_total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-200">{Number(r.gross_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {!((z?.vat_by_rate || []).length) ? (
                      <tr className="border-t border-slate-800">
                        <td className="px-4 py-4 text-slate-400" colSpan={4}>
                          Sem dados
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'vat' ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">IVA por taxa</div>
              <div className="mt-1 text-xs text-slate-400">Período (Africa/Maputo)</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  type="date"
                />
                <input
                  value={endDay}
                  onChange={(e) => setEndDay(e.target.value)}
                  className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  type="date"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await loadVat(startDay, endDay)
                }}
                disabled={loadingVat}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingVat ? 'Carregando...' : 'Atualizar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const header = ['tax_rate', 'net_total', 'tax_total', 'gross_total']
                  const dataRows = (vat?.rows || []).map((r) => [r.tax_rate, r.net_total, r.tax_total, r.gross_total])
                  downloadCsv(`iva_por_taxa_${startDay}_a_${endDay}.csv`, [header, ...dataRows])
                }}
                disabled={!vat}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await getVatByRatePdf({ start_day: startDay, end_day: endDay })
                    openBlob(blob, `iva_por_taxa_${startDay}_a_${endDay}.pdf`)
                  } catch (err) {
                    const msg = err?.response?.data?.detail || 'Não foi possível gerar o PDF.'
                    toast.error(msg)
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/60 text-xs text-slate-300">
                <tr>
                  <th className="px-4 py-3">Taxa</th>
                  <th className="px-4 py-3">Incidência</th>
                  <th className="px-4 py-3">IVA</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(vat?.rows || []).map((r) => (
                  <tr key={r.tax_rate} className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-200">{Number(r.tax_rate || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-slate-200">{Number(r.net_total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-200">{Number(r.tax_total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-200">{Number(r.gross_total || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {!((vat?.rows || []).length) ? (
                  <tr className="border-t border-slate-800">
                    <td className="px-4 py-4 text-slate-400" colSpan={4}>
                      Sem dados
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'sales' ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Vendas por período</div>
              <div className="mt-1 text-xs text-slate-400">Período (Africa/Maputo)</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  value={salesStartDay}
                  onChange={(e) => setSalesStartDay(e.target.value)}
                  className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  type="date"
                />
                <input
                  value={salesEndDay}
                  onChange={(e) => setSalesEndDay(e.target.value)}
                  className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  type="date"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await loadSales(salesStartDay, salesEndDay)
                }}
                disabled={loadingSales}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingSales ? 'Carregando...' : 'Atualizar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const header = ['Data', 'Série', 'Número', 'Cliente', 'Líquido', 'IVA', 'Total']
                  const rows = (sales?.sales || []).map((s) => [
                    s.created_at?.slice(0, 10),
                    s.series,
                    s.number,
                    s.customer_name || '',
                    s.net_total,
                    s.tax_total,
                    s.gross_total,
                  ])
                  downloadCsv(`vendas_${salesStartDay}_a_${salesEndDay}.csv`, [header, ...rows])
                }}
                disabled={!sales}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await getSalesByPeriodPdf({ start_day: salesStartDay, end_day: salesEndDay })
                    openBlob(blob, `vendas_${salesStartDay}_a_${salesEndDay}.pdf`)
                  } catch (err) {
                    const msg = err?.response?.data?.detail || 'Não foi possível gerar o PDF.'
                    toast.error(msg)
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Vendas</div>
              <div className="mt-1 text-lg font-semibold text-white">{sales?.sales_count ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Líquido</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(sales?.net_total ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">IVA</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(sales?.tax_total ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Total</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(sales?.gross_total ?? 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/60 text-xs text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Série/Nº</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Líquido</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(sales?.sales || []).map((s) => (
                    <tr key={s.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-200">{s.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-slate-200">{s.series}/{s.number}</td>
                      <td className="px-4 py-3 text-slate-200">{s.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-200 text-right">{Number(s.net_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-200 text-right">{Number(s.tax_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-200 text-right">{Number(s.gross_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!((sales?.sales || []).length) ? (
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-4 text-slate-400" colSpan={6}>
                        Sem dados
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'closure' ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-white">Fecho de caixa</div>
              <div className="text-xs text-slate-400">Data (Africa/Maputo) – Operador atual</div>
              <input
                value={closureDay}
                onChange={(e) => setClosureDay(e.target.value)}
                className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="date"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await loadClosure(closureDay)
                }}
                disabled={loadingClosure}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingClosure ? 'Carregando...' : 'Atualizar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const header = ['Hora', 'Série', 'Número', 'Cliente', 'Líquido', 'IVA', 'Total']
                  const rows = (closure?.sales || []).map((s) => [
                    s.created_at?.slice(11, 19),
                    s.series,
                    s.number,
                    s.customer_name || '',
                    s.net_total,
                    s.tax_total,
                    s.gross_total,
                  ])
                  downloadCsv(`fecho_caixa_${closureDay}.csv`, [header, ...rows])
                }}
                disabled={!closure}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await getCashClosurePdf(closureDay)
                    openBlob(blob, `fecho_caixa_${closureDay}.pdf`)
                  } catch (err) {
                    const msg = err?.response?.data?.detail || 'Não foi possível gerar o PDF.'
                    toast.error(msg)
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Vendas</div>
              <div className="mt-1 text-lg font-semibold text-white">{closure?.sales_count ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Líquido</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(closure?.net_total ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">IVA</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(closure?.tax_total ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Total</div>
              <div className="mt-1 text-lg font-semibold text-white">{Number(closure?.gross_total ?? 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/60 text-xs text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Série/Nº</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Líquido</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(closure?.sales || []).map((s) => (
                    <tr key={s.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-200">{s.created_at?.slice(11, 19)}</td>
                      <td className="px-4 py-3 text-slate-200">{s.series}/{s.number}</td>
                      <td className="px-4 py-3 text-slate-200">{s.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-200 text-right">{Number(s.net_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-200 text-right">{Number(s.tax_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-200 text-right">{Number(s.gross_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!((closure?.sales || []).length) ? (
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-4 text-slate-400" colSpan={6}>
                        Sem dados
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
 }
