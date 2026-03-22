import { useEffect, useMemo, useState } from 'react'

import { listCustomers } from '../../api/customers.js'
import { generatePdv3PrintersBillingLaunch, getPdv3PrintersBilling } from '../../api/printers.js'
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

function numberOnly(v) {
  if (v == null) return 0
  const s = String(v).replace(',', '.').trim()
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
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
  const [launchRow, setLaunchRow] = useState(null)
  const [pricePerCopy, setPricePerCopy] = useState('5.00')
  const [costPerCopy, setCostPerCopy] = useState('0.00')
  const [launchTotal, setLaunchTotal] = useState('0.00')
  const [asDebt, setAsDebt] = useState(false)
  const [debtCustomerId, setDebtCustomerId] = useState('')
  const [debtCustomerName, setDebtCustomerName] = useState('')
  const [debtCustomerNuit, setDebtCustomerNuit] = useState('')
  const [customers, setCustomers] = useState([])

  const [openDetails, setOpenDetails] = useState(false)
  const [detailsRow, setDetailsRow] = useState(null)
  const [detailsPricePerCopy, setDetailsPricePerCopy] = useState('5.00')
  const [detailsTotal, setDetailsTotal] = useState('0.00')

  const effectiveEstId = isAdmin ? (establishment?.id || undefined) : undefined

  async function load() {
    if (!isReprography) {
      setBilling(null)
      return
    }

    setLoading(true)
    try {
      const data = await getPdv3PrintersBilling({ year, month, establishment_id: effectiveEstId })
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

  useEffect(() => {
    const copiesNew = Number(launchRow?.copies_new || 0)
    const total = copiesNew * numberOnly(pricePerCopy)
    setLaunchTotal(money(total))
  }, [launchRow, pricePerCopy])

  useEffect(() => {
    const copiesTotal = Number(detailsRow?.copies_total || 0)
    const total = copiesTotal * numberOnly(detailsPricePerCopy)
    setDetailsTotal(money(total))
  }, [detailsRow, detailsPricePerCopy])

  async function openLaunchModal(row) {
    setLaunchRow(row)
    setPricePerCopy('5.00')
    setCostPerCopy('0.00')
    setAsDebt(false)
    setDebtCustomerId('')
    setDebtCustomerName('')
    setDebtCustomerNuit('')
    setOpenLaunch(true)
    try {
      const rows = await listCustomers({ limit: 200, offset: 0 })
      setCustomers(Array.isArray(rows) ? rows : [])
    } catch {
      setCustomers([])
    }
  }

  function openDetailsModal(row) {
    setDetailsRow(row)
    setDetailsPricePerCopy('5.00')
    setOpenDetails(true)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Faturamento de Impressões</div>
          <div className="mt-1 text-sm text-slate-300">Relatório mensal de cópias por impressora.</div>
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
        </div>
      </div>

      {!isReprography ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
          Esta página está disponível apenas para filiais de reprografia.
        </div>
      ) : null}

      {isReprography ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm font-semibold text-white">Período: {String(month).padStart(2, '0')}/{year}</div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
              <div className="col-span-3">Impressora</div>
              <div className="col-span-3">Marca/Modelo</div>
              <div className="col-span-2">Cópias</div>
              <div className="col-span-2">Já faturado</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>

            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
            ) : !billing?.rows?.length ? (
              <div className="px-4 py-6 text-sm text-slate-300">Sem dados para este período.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {(billing.rows || []).map((r) => {
                  const disabledLaunch = !isAdmin || Number(r.copies_new || 0) <= 0
                  return (
                    <div key={r.printer_id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm items-center">
                      <div className="col-span-3 font-semibold text-slate-100">{r.serial_number}</div>
                      <div className="col-span-3 text-slate-300">{`${r.brand || ''} ${r.model || ''}`.trim() || '-'}</div>
                      <div className="col-span-2 text-slate-200">{r.copies_total ?? 0}</div>
                      <div className="col-span-2 text-slate-200">{r.copies_billed_to ?? 0}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={disabledLaunch}
                          onClick={() => openLaunchModal(r)}
                          className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          title={!isAdmin ? 'Apenas admin' : Number(r.copies_new || 0) <= 0 ? 'Lançamento já gerado' : ''}
                        >
                          {Number(r.copies_new || 0) <= 0 ? 'Lançado' : 'Gerar Lançamento'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetailsModal(r)}
                          className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Modal
        open={openDetails}
        title="Detalhes do Faturamento"
        onClose={() => setOpenDetails(false)}
      >
        <div className="grid gap-3 text-sm">
          <div className="text-slate-200">Impressora: <span className="font-semibold text-white">{detailsRow?.serial_number || '-'}</span></div>
          <div className="text-slate-200">Marca/Modelo: <span className="font-semibold text-white">{`${detailsRow?.brand || ''} ${detailsRow?.model || ''}`.trim() || '-'}</span></div>
          <div className="h-px bg-slate-800" />
          <div className="text-slate-200">Período: <span className="font-semibold text-white">{detailsRow?.month_year || '-'}</span></div>
          <div className="text-slate-200">Cópias Realizadas: <span className="font-semibold text-white">{detailsRow?.copies_total ?? 0}</span></div>

          <div className="h-px bg-slate-800" />
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-400">Valor por Cópia (MT)</div>
              <input
                value={detailsPricePerCopy}
                onChange={(e) => setDetailsPricePerCopy(e.target.value)}
                className="mt-2 w-40 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                inputMode="decimal"
                type="text"
              />
            </div>
            <div className="ml-auto text-base font-semibold text-brand-400">Valor Total: MT {detailsTotal}</div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setOpenDetails(false)}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openLaunch}
        title="Confirmar Lançamento"
        onClose={() => {
          if (launching) return
          setOpenLaunch(false)
        }}
      >
        <div className="grid gap-3 text-sm">
          <div className="text-slate-200">Impressora: <span className="font-semibold text-white">{launchRow?.serial_number || '-'}</span></div>
          <div className="text-slate-200">Período: <span className="font-semibold text-white">{launchRow?.month_year || `${String(month).padStart(2, '0')}/${year}`}</span></div>
          <div className="text-slate-200">Cópias a faturar: <span className="font-semibold text-white">{launchRow?.copies_new ?? 0}</span></div>

          <div className="h-px bg-slate-800" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-400">Valor por Cópia (MT)</div>
              <input
                value={pricePerCopy}
                onChange={(e) => setPricePerCopy(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                inputMode="decimal"
                type="text"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Custo por Cópia (MT)</div>
              <input
                value={costPerCopy}
                onChange={(e) => setCostPerCopy(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                inputMode="decimal"
                type="text"
              />
            </div>
          </div>

          <div className="text-base font-semibold text-brand-400">Valor Total: MT {launchTotal}</div>

          <div className="h-px bg-slate-800" />
          <label className="flex items-center gap-2 cursor-pointer text-slate-200">
            <input
              type="checkbox"
              checked={asDebt}
              onChange={(e) => setAsDebt(e.target.checked)}
              className="rounded border-slate-600"
            />
            <span>Lançar como dívida (fiado) — não exige caixa aberto</span>
          </label>
          {asDebt ? (
            <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <div>
                <div className="text-xs font-semibold text-slate-400">Cliente cadastrado</div>
                <select
                  value={debtCustomerId}
                  onChange={(e) => setDebtCustomerId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">— Escolher ou preencher o nome abaixo —</option>
                  {(customers || []).map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name || `Cliente #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Nome do cliente (se não usar a lista)</div>
                <input
                  value={debtCustomerName}
                  onChange={(e) => setDebtCustomerName(e.target.value)}
                  placeholder="Obrigatório se não selecionar acima"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  type="text"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">NUIT (opcional)</div>
                <input
                  value={debtCustomerNuit}
                  onChange={(e) => setDebtCustomerNuit(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  type="text"
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={launching}
              onClick={() => setOpenLaunch(false)}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={launching || Number(launchRow?.copies_new || 0) <= 0}
              onClick={async () => {
                if (!launchRow?.printer_id) return
                if (asDebt) {
                  const hasId = debtCustomerId && String(debtCustomerId).trim() !== ''
                  const hasName = debtCustomerName && String(debtCustomerName).trim() !== ''
                  if (!hasId && !hasName) {
                    toast.error('Para fiado, selecione um cliente ou indique o nome.')
                    return
                  }
                }
                setLaunching(true)
                try {
                  const res = await generatePdv3PrintersBillingLaunch({
                    printer_id: Number(launchRow.printer_id),
                    year,
                    month,
                    establishment_id: effectiveEstId,
                    price_per_copy: numberOnly(pricePerCopy),
                    cost_per_copy: numberOnly(costPerCopy),
                    as_debt: asDebt,
                    customer_id: asDebt && debtCustomerId ? Number(debtCustomerId) : undefined,
                    customer_name: asDebt && !debtCustomerId ? String(debtCustomerName || '').trim() : undefined,
                    customer_nuit: asDebt ? String(debtCustomerNuit || '').trim() || undefined : undefined,
                  })
                  if (res?.debt_id) {
                    toast.success(`Dívida #${res.debt_id} registada (fiado).`)
                  } else {
                    toast.success(`Lançamento criado. Venda #${res?.sale_id || ''}`)
                  }
                  setOpenLaunch(false)
                  await load()
                } catch (err) {
                  const msg = err?.response?.data?.detail || 'Não foi possível gerar o lançamento.'
                  toast.error(msg)
                } finally {
                  setLaunching(false)
                }
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {launching ? 'Gerando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
