import { useEffect, useMemo, useState } from 'react'

import { getMyBranch } from '../../api/branches.js'
import { listDebts, payDebt } from '../../api/debts.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

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

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState([])

  const [openPay, setOpenPay] = useState(false)
  const [activeDebt, setActiveDebt] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [paying, setPaying] = useState(false)

  const isRestaurant = ((branch?.business_type || 'retail') + '').trim().toLowerCase() === 'restaurant'

  const fmtMoney = useMemo(() => {
    try {
      return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }, [])

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

  if (isRestaurant) {
    return (
      <div className="h-[calc(100vh-56px-48px)] overflow-hidden flex flex-col">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Dívidas</div>
          <div className="mt-2 text-sm text-slate-300">Funcionalidade indisponível para restaurante.</div>
        </div>
      </div>
    )
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
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-white">{fmtMoney.format(Number(d.total || 0))} MZN</div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-3">
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
    </div>
  )
}
