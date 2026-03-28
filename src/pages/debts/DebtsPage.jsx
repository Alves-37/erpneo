import { useEffect, useMemo, useState } from 'react'

import { getMyBranch } from '../../api/branches.js'
import { cancelDebt, deleteDebt, getDebt, listDebts, payDebt } from '../../api/debts.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function originSourceLabel(src) {
  const s = (src || '').toString()
  if (s === 'printer_pdv3') return 'Faturamento impressão (PDV3)'
  if (s === 'printer_excess') return 'Faturamento excedentes (impressoras)'
  return s || '—'
}

function DebtItemsTable({ debt, fmtMoney }) {
  const items = debt?.items
  if (!Array.isArray(items) || !items.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500">
            <th className="px-2 py-1.5 font-semibold">Produto</th>
            <th className="px-2 py-1.5 font-semibold text-right">Qtd</th>
            <th className="px-2 py-1.5 font-semibold text-right">Preço</th>
            <th className="px-2 py-1.5 font-semibold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-800/80 text-slate-300">
              <td className="px-2 py-1.5">#{it.product_id}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{Number(it.qty || 0).toFixed(2)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtMoney.format(Number(it.price_at_debt || 0))}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtMoney.format(Number(it.line_total || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DebtOriginDetails({ debt }) {
  const meta = debt?.origin_meta
  const kind = meta?.kind
  if (!debt?.origin_summary && !debt?.origin_source && !meta) return null

  return (
    <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Origem da dívida</div>
      {debt.origin_source ? (
        <div className="text-slate-300">
          <span className="text-slate-500">Tipo: </span>
          {originSourceLabel(debt.origin_source)}
        </div>
      ) : null}
      {debt.origin_summary ? (
        <div className="text-slate-200 leading-relaxed">{debt.origin_summary}</div>
      ) : null}
      {kind === 'printer_pdv3' && meta ? (
        <ul className="grid gap-1 text-slate-400 border-t border-slate-800 pt-2">
          <li>
            <span className="text-slate-500">Impressora (série): </span>
            <span className="text-slate-200 font-medium">{meta.serial_number || '—'}</span>
          </li>
          {(meta.brand || meta.model) ? (
            <li>
              <span className="text-slate-500">Marca / modelo: </span>
              <span className="text-slate-200">{`${meta.brand || ''} ${meta.model || ''}`.trim()}</span>
            </li>
          ) : null}
          <li>
            <span className="text-slate-500">Período: </span>
            <span className="text-slate-200">
              {String(meta.month || '').padStart(2, '0')}/{meta.year || '—'}
            </span>
          </li>
          <li>
            <span className="text-slate-500">Cópias faturadas: </span>
            <span className="text-slate-200">{meta.copies_new ?? '—'}</span>
          </li>
        </ul>
      ) : null}
      {kind === 'printer_excess' && Array.isArray(meta?.lines) && meta.lines.length ? (
        <div className="border-t border-slate-800 pt-2 space-y-2">
          <div className="text-slate-500">Detalhe por impressora / contador</div>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="px-2 py-1.5 font-semibold">Série</th>
                  <th className="px-2 py-1.5 font-semibold">Contador</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Pág. exced.</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Total linha</th>
                </tr>
              </thead>
              <tbody>
                {meta.lines.map((ln, idx) => (
                  <tr key={idx} className="border-b border-slate-800/80 text-slate-300">
                    <td className="px-2 py-1.5">{ln.serial_number || `#${ln.printer_id}`}</td>
                    <td className="px-2 py-1.5">{ln.counter_type_name || ln.counter_type_code || '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{ln.excess_pages ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {ln.line_total != null ? Number(ln.line_total).toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

export default function DebtsPage() {
  const setBranchGlobal = useAuthStore((s) => s.setBranch)
  const branch = useAuthStore((s) => s.branch)
  const me = useAuthStore((s) => s.me)

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState([])

  const [openPay, setOpenPay] = useState(false)
  const [activeDebt, setActiveDebt] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [paying, setPaying] = useState(false)

  const [openDetails, setOpenDetails] = useState(false)
  const [detailsDebt, setDetailsDebt] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [mutating, setMutating] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // 'cancel' | 'delete'
  const [confirmDebt, setConfirmDebt] = useState(null)

  const isRestaurant = ((branch?.business_type || 'retail') + '').trim().toLowerCase() === 'restaurant'
  const isAdmin = ((me?.role || '') + '').trim().toLowerCase() === 'admin' || ((me?.role || '') + '').trim().toLowerCase() === 'owner'

  const fmtMoney = useMemo(() => {
    try {
      return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }, [])

  async function openDebtDetails(debtId) {
    if (!debtId) return
    setOpenDetails(true)
    setLoadingDetails(true)
    setDetailsDebt(null)
    try {
      const d = await getDebt(Number(debtId))
      setDetailsDebt(d)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar detalhes da dívida.'
      toast.error(msg)
      setOpenDetails(false)
    } finally {
      setLoadingDetails(false)
    }
  }

  function requestCancelDebt(debt) {
    if (!debt?.id) return
    setConfirmDebt(debt)
    setConfirmAction('cancel')
    setConfirmOpen(true)
  }

  function requestDeleteDebt(debt) {
    if (!debt?.id) return
    setConfirmDebt(debt)
    setConfirmAction('delete')
    setConfirmOpen(true)
  }

  async function runConfirmAction() {
    const debt = confirmDebt
    const action = confirmAction
    if (!debt?.id || !action) return

    setMutating(true)
    try {
      if (action === 'cancel') {
        const updated = await cancelDebt(Number(debt.id))
        toast.success('Dívida anulada.')
        setDetailsDebt(updated)
        await loadDebts(status)
      } else if (action === 'delete') {
        await deleteDebt(Number(debt.id))
        toast.success('Dívida apagada.')
        setOpenDetails(false)
        setDetailsDebt(null)
        await loadDebts(status)
      }
      setConfirmOpen(false)
      setConfirmAction(null)
      setConfirmDebt(null)
    } catch (err) {
      const msg = err?.response?.data?.detail || (action === 'delete' ? 'Não foi possível apagar a dívida.' : 'Não foi possível anular a dívida.')
      toast.error(msg)
    } finally {
      setMutating(false)
    }
  }

  async function loadBranch() {
    try {
      const b = await getMyBranch()
      setBranchGlobal(b, { persist: true })
    } catch {
      setBranchGlobal(null, { persist: true })
    }
  }

  async function loadDebts(nextStatus = status) {
    setLoading(true)
    try {
      const list = await listDebts({ status: nextStatus === 'all' ? null : nextStatus, limit: 100, offset: 0 })
      setRows(Array.isArray(list) ? list : [])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar dívidas agora.'
      toast.error(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadDebts(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (!openPay) return
    setPaymentMethod('cash')
    setPaid(activeDebt?.total ? Number(activeDebt.total).toFixed(2) : '')
    setPaying(false)
  }, [openPay, activeDebt?.id])

  async function onPay() {
    if (!activeDebt?.id) return

    const paidNum = Number(String(paid || '').replace(',', '.'))
    if (!Number.isFinite(paidNum) || paidNum <= 0) {
      toast.error('Informe o valor pago.')
      return
    }

    setPaying(true)
    try {
      await payDebt(Number(activeDebt.id), {
        payment_method: paymentMethod,
        paid: paidNum,
      })
      toast.success('Dívida paga e venda criada.')
      setOpenPay(false)
      setActiveDebt(null)
      await loadDebts(status)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível pagar a dívida agora.'
      toast.error(msg)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="h-[calc(100vh-56px-48px)] overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Dívidas</div>
          <div className="mt-1 text-sm text-slate-300">Fiados em aberto e pagamentos</div>
        </div>
        <button
          type="button"
          onClick={() => loadDebts(status)}
          className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="grid gap-2">
          <div className="text-xs font-semibold text-slate-400">Estado</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-60 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="open">Em aberto</option>
            <option value="paid">Pagas</option>
            <option value="all">Todas</option>
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 flex flex-col flex-1 min-h-0">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-sm font-semibold text-white">Lista de dívidas</div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="p-4">
            {loading ? (
              <div className="py-6 text-sm text-slate-300">Carregando...</div>
            ) : rows?.length ? (
              <div className="grid gap-3">
                {(rows || []).map((d) => (
                  <div key={d.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">Dívida #{d.id}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Cliente: <span className="text-slate-200 font-semibold">{d.customer_name || '-'}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Estado: <span className="text-slate-200 font-semibold">{d.status}</span>
                        </div>
                        <DebtOriginDetails debt={d} />
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-white">{fmtMoney.format(Number(d.total || 0))} MZN</div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openDebtDetails(d.id)}
                        className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        Detalhes
                      </button>
                      {d.status === 'open' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDebt(d)
                            setOpenPay(true)
                          }}
                          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          Pagar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-sm text-slate-300">Sem dívidas para mostrar.</div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={openPay}
        title={activeDebt?.id ? `Pagar dívida #${activeDebt.id}` : 'Pagar dívida'}
        onClose={() => {
          setOpenPay(false)
          setActiveDebt(null)
        }}
      >
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-semibold text-slate-400">Total</div>
            <div className="mt-1 text-xl font-semibold text-white">{fmtMoney.format(Number(activeDebt?.total || 0))} MZN</div>
            {activeDebt?.customer_name ? (
              <div className="mt-2 text-xs text-slate-400">
                Cliente: <span className="text-slate-200 font-semibold">{activeDebt.customer_name}</span>
              </div>
            ) : null}
            <DebtOriginDetails debt={activeDebt} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Pagamento</div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="cash">Dinheiro</option>
                <option value="mpesa">M-Pesa</option>
                <option value="emola">e-Mola</option>
                <option value="mkesh">mKesh</option>
                <option value="card">Cartão (POS)</option>
                <option value="transfer">Transferência</option>
                <option value="cheque">Cheque</option>
                <option value="other">Outro</option>
              </select>
            </label>

            <label className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Pago</div>
              <input
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                inputMode="decimal"
                placeholder="0.00"
                type="text"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenPay(false)
                setActiveDebt(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={paying}
              onClick={onPay}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {paying ? 'Processando...' : 'Confirmar pagamento'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openDetails}
        title={detailsDebt?.id ? `Detalhes da dívida #${detailsDebt.id}` : 'Detalhes da dívida'}
        onClose={() => {
          if (mutating) return
          setOpenDetails(false)
          setDetailsDebt(null)
        }}
      >
        {loadingDetails ? (
          <div className="py-6 text-sm text-slate-300">Carregando...</div>
        ) : detailsDebt ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-400">Cliente</div>
                  <div className="mt-1 text-sm font-semibold text-white">{detailsDebt.customer_name || '-'}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    Estado: <span className="text-slate-200 font-semibold">{detailsDebt.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Criado em: <span className="text-slate-200">{detailsDebt.created_at ? String(detailsDebt.created_at).replace('T', ' ').slice(0, 16) : '—'}</span>
                  </div>
                  {detailsDebt.paid_at ? (
                    <div className="mt-1 text-xs text-slate-400">
                      Pago em: <span className="text-slate-200">{String(detailsDebt.paid_at).replace('T', ' ').slice(0, 16)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold text-slate-400">Total</div>
                  <div className="mt-1 text-lg font-semibold text-white">{fmtMoney.format(Number(detailsDebt.total || 0))} MZN</div>
                </div>
              </div>
              <DebtOriginDetails debt={detailsDebt} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">Líquido</div>
                <div className="mt-1 text-sm font-semibold text-white">{fmtMoney.format(Number(detailsDebt.net_total || 0))} MZN</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">IVA</div>
                <div className="mt-1 text-sm font-semibold text-white">{fmtMoney.format(Number(detailsDebt.tax_total || 0))} MZN</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">Inclui IVA</div>
                <div className="mt-1 text-sm font-semibold text-white">{detailsDebt.include_tax ? 'Sim' : 'Não'}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-semibold text-slate-400">Itens</div>
              <div className="mt-3">
                <DebtItemsTable debt={detailsDebt} fmtMoney={fmtMoney} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {isAdmin && detailsDebt.status === 'open' ? (
                <>
                  <button
                    type="button"
                    disabled={mutating}
                    onClick={() => requestCancelDebt(detailsDebt)}
                    className="rounded-xl border border-amber-900/60 bg-amber-950/30 hover:bg-amber-950/50 px-4 py-2.5 text-sm font-semibold text-amber-200 disabled:opacity-60"
                  >
                    Anular
                  </button>
                  <button
                    type="button"
                    disabled={mutating}
                    onClick={() => requestDeleteDebt(detailsDebt)}
                    className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-4 py-2.5 text-sm font-semibold text-rose-200 disabled:opacity-60"
                  >
                    Apagar
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={mutating}
                onClick={() => {
                  setOpenDetails(false)
                  setDetailsDebt(null)
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-sm text-slate-300">Sem dados.</div>
        )}
      </Modal>

      <Modal
        open={confirmOpen}
        title={confirmAction === 'delete' ? 'Confirmar apagar' : 'Confirmar anular'}
        onClose={() => {
          if (mutating) return
          setConfirmOpen(false)
          setConfirmAction(null)
          setConfirmDebt(null)
        }}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-sm font-semibold text-white">
              {confirmAction === 'delete' ? 'Apagar dívida' : 'Anular dívida'}
            </div>
            <div className="mt-2 text-sm text-slate-300 leading-relaxed">
              {confirmAction === 'delete'
                ? `Tem certeza que deseja apagar a dívida #${confirmDebt?.id}? Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja anular a dívida #${confirmDebt?.id}?`}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={mutating}
              onClick={() => {
                setConfirmOpen(false)
                setConfirmAction(null)
                setConfirmDebt(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={mutating}
              onClick={runConfirmAction}
              className={
                (confirmAction === 'delete'
                  ? 'rounded-xl bg-rose-600 hover:bg-rose-700'
                  : 'rounded-xl bg-amber-600 hover:bg-amber-700') +
                ' px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'
              }
            >
              {mutating ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
