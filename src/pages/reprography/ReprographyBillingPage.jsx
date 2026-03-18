import { useEffect, useMemo, useState } from 'react'

import { generatePrintersBillingLaunch, getPrintersBilling } from '../../api/printers.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

function money(v) {
  const n = Number(v || 0)
  try {
    return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return String(n.toFixed(2))
  }
}

export default function ReprographyBillingPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isReprography = businessType === 'reprography' || businessType === 'reprografia'

  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [loading, setLoading] = useState(false)
  const [billing, setBilling] = useState(null)

  const [openLaunch, setOpenLaunch] = useState(false)
  const [launching, setLaunching] = useState(false)

  const effectiveEstId = isAdmin ? (establishment?.id || undefined) : undefined

  async function load() {
    if (!isReprography) {
      setBilling(null)
      return
    }

    setLoading(true)
    try {
      const data = await getPrintersBilling({ year, month, establishment_id: effectiveEstId })
      setBilling(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar o faturamento.'
      toast.error(msg)
      setBilling(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?.id, contextVersion, establishment?.id])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Reprografia · Faturamento</div>
          <div className="mt-1 text-sm text-slate-300">Cálculo mensal de excedentes por impressora e tipo.</div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-400">Ano</div>
            <input
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value || 0) || now.getFullYear())}
              type="number"
              min={2000}
              max={2100}
              className="w-28 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400">Mês</div>
            <select
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value || 1) || 1)}
              className="w-36 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {String(i + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>

          <button
            type="button"
            disabled={!billing || launching || !isAdmin}
            onClick={() => setOpenLaunch(true)}
            className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            title={!isAdmin ? 'Apenas admin pode gerar lançamento.' : ''}
          >
            Gerar lançamento
          </button>
        </div>
      </div>

      {!isReprography ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
          Esta página está disponível apenas para filiais de reprografia.
        </div>
      ) : null}

      {isReprography ? (
        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm font-semibold text-white">Resumo</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">Excedentes (páginas)</div>
                <div className="mt-1 text-lg font-semibold">{billing?.total_excess_pages ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">Total a cobrar</div>
                <div className="mt-1 text-lg font-semibold">{money(billing?.total_excess_amount ?? 0)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">Ponto</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {establishment?.name || (isAdmin ? 'Selecione no cabeçalho' : 'Atual')}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm font-semibold text-white">Detalhes</div>

            {!billing?.printers?.length ? (
              <div className="mt-3 text-sm text-slate-300">Sem contratos/leitura para este período.</div>
            ) : (
              <div className="mt-4 grid gap-4">
                {(billing.printers || []).map((p) => (
                  <div key={p.printer_id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{p.serial_number || `Impressora #${p.printer_id}`}</div>
                        <div className="mt-1 text-xs text-slate-400">{[p.brand, p.model].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-400">Total excedente</div>
                        <div className="text-sm font-semibold text-slate-100">{money(p.total_excess_amount || 0)}</div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-400">
                            <th className="py-2 pr-4">Tipo</th>
                            <th className="py-2 pr-4">Usado</th>
                            <th className="py-2 pr-4">Franquia</th>
                            <th className="py-2 pr-4">Excedente</th>
                            <th className="py-2 pr-4">Preço</th>
                            <th className="py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(p.lines || []).map((ln, idx) => (
                            <tr key={`${ln.printer_id}-${ln.counter_type_id}-${idx}`} className="border-t border-slate-800">
                              <td className="py-2 pr-4 text-slate-100">{ln.counter_type_name || ln.counter_type_code || ln.counter_type_id}</td>
                              <td className="py-2 pr-4 text-slate-200">{ln.pages_used ?? 0}</td>
                              <td className="py-2 pr-4 text-slate-200">{ln.monthly_allowance ?? 0}</td>
                              <td className="py-2 pr-4 text-slate-200">{ln.excess_pages ?? 0}</td>
                              <td className="py-2 pr-4 text-slate-200">{money(ln.price_per_page ?? 0)}</td>
                              <td className="py-2 font-semibold text-slate-100">{money(ln.excess_total ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Modal
        open={openLaunch}
        title="Gerar lançamento do mês"
        onClose={() => {
          if (launching) return
          setOpenLaunch(false)
        }}
      >
        <div className="text-sm text-slate-300">
          Isto vai criar uma venda interna paga com os itens de excedente do mês selecionado.
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
          <div className="text-slate-200">
            Período: <span className="font-semibold text-white">{String(month).padStart(2, '0')}/{year}</span>
          </div>
          <div className="mt-1 text-slate-200">
            Total estimado: <span className="font-semibold text-white">{money(billing?.total_excess_amount ?? 0)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={launching}
            onClick={() => setOpenLaunch(false)}
            className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={launching}
            onClick={async () => {
              setLaunching(true)
              try {
                const res = await generatePrintersBillingLaunch({ year, month, establishment_id: effectiveEstId })
                toast.success(`Lançamento criado. Venda #${res?.sale_id || ''}`)
                setOpenLaunch(false)
              } catch (err) {
                const msg = err?.response?.data?.detail || 'Não foi possível gerar o lançamento.'
                toast.error(msg)
              } finally {
                setLaunching(false)
              }
            }}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {launching ? 'Gerando...' : 'Confirmar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
