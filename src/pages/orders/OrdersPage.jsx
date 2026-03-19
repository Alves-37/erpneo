import { useEffect, useMemo, useState } from 'react'

import { closeOrder, deleteOrder, listOrders, updateOrder } from '../../api/orders.js'
import { listProductImages, listProducts } from '../../api/products.js'
import { toast } from '../../services/toast.js'

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

function fmtStatus(st) {
  if (st === 'open') return 'Aberto'
  if (st === 'in_progress') return 'Em preparo'
  if (st === 'closed') return 'Fechado'
  if (st === 'cancelled') return 'Cancelado'
  return st
}

export default function OrdersPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neoerp-production.up.railway.app'

  const [status, setStatus] = useState('open')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [products, setProducts] = useState([])
  const [imageByProductId, setImageByProductId] = useState({})

  const [openClose, setOpenClose] = useState(false)
  const [closingOrder, setClosingOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [saving, setSaving] = useState(false)

  const [openDetails, setOpenDetails] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState(null)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmKind, setConfirmKind] = useState(null)
  const [confirmOrder, setConfirmOrder] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const paidNum = useMemo(() => {
    const n = Number(String(paid || '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [paid])

  const orderTotal = useMemo(() => {
    const items = closingOrder?.items || []
    return (items || []).reduce((acc, i) => acc + Number(i.line_total || 0), 0)
  }, [closingOrder])

  const effectivePaid = useMemo(() => {
    if (paymentMethod === 'cash') return paidNum
    return orderTotal
  }, [paymentMethod, paidNum, orderTotal])

  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    return Math.max(0, effectivePaid - orderTotal)
  }, [paymentMethod, effectivePaid, orderTotal])

  useEffect(() => {
    if (!openClose) return
    if (paymentMethod !== 'cash') {
      setPaid(orderTotal ? Number(orderTotal).toFixed(2) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, orderTotal, openClose])

  function openDetailsModal(o) {
    setDetailsOrder(o)
    setOpenDetails(true)
  }

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of products || []) map.set(p.id, p)
    return map
  }, [products])

  async function load() {
    setLoading(true)
    try {
      const data = await listOrders({ status })
      setRows(data || [])
    } catch {
      toast.error('Não foi possível carregar pedidos agora.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    try {
      const data = await listProducts({ limit: 500, offset: 0 })
      setProducts(data || [])
    } catch {
      setProducts([])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadImages() {
      try {
        const entries = await Promise.all(
          (products || []).map(async (p) => {
            try {
              const imgs = await listProductImages(p.id)
              const first = imgs?.[0]?.url || imgs?.[0]?.file_path || null
              return [p.id, first]
            } catch {
              return [p.id, null]
            }
          })
        )

        const map = {}
        for (const [id, filePath] of entries) {
          map[id] = filePath
        }
        if (!cancelled) setImageByProductId(map)
      } catch {
        if (!cancelled) setImageByProductId({})
      }
    }

    if ((products || []).length) loadImages()
    return () => {
      cancelled = true
    }
  }, [products])

  async function markInProgress(o) {
    try {
      await updateOrder(o.id, { status: 'in_progress' })
      toast.success('Pedido marcado como em preparo.')
      await load()
    } catch {
      toast.error('Não foi possível atualizar o pedido agora.')
    }
  }

  function requestCancelOrder(o) {
    setConfirmKind('cancel')
    setConfirmOrder(o)
    setOpenConfirm(true)
  }

  function requestDeleteOrder(o) {
    if (!o) return
    if (o.status !== 'closed' && o.status !== 'cancelled') {
      toast.error('Só é possível excluir pedidos fechados ou cancelados.')
      return
    }
    setConfirmKind('delete')
    setConfirmOrder(o)
    setOpenConfirm(true)
  }

  async function confirmAction() {
    if (!confirmOrder || !confirmKind) return
    setConfirmBusy(true)
    try {
      if (confirmKind === 'cancel') {
        await updateOrder(confirmOrder.id, { status: 'cancelled' })
        toast.success('Pedido cancelado.')
      } else if (confirmKind === 'delete') {
        await deleteOrder(confirmOrder.id)
        toast.success('Pedido excluído.')
      }
      setOpenConfirm(false)
      setConfirmKind(null)
      setConfirmOrder(null)
      await load()
      setOpenDetails(false)
    } catch {
      toast.error(confirmKind === 'delete' ? 'Não foi possível excluir o pedido agora.' : 'Não foi possível cancelar o pedido agora.')
    } finally {
      setConfirmBusy(false)
    }
  }

  function openCloseModal(o) {
    setClosingOrder(o)
    setPaymentMethod('cash')
    setPaid('')
    setOpenClose(true)
  }

  async function doClose() {
    if (!closingOrder) return

    if (paymentMethod === 'cash' && effectivePaid < orderTotal) {
      toast.error('Valor recebido insuficiente.')
      return
    }

    setSaving(true)
    try {
      await closeOrder(closingOrder.id, { payment_method: paymentMethod, paid: effectivePaid })
      toast.success('Pedido finalizado e venda registrada.')
      setOpenClose(false)
      setClosingOrder(null)
      await load()
    } catch {
      toast.error('Não foi possível finalizar o pedido agora.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Pedidos</div>
          <div className="mt-1 text-sm text-slate-300">Acompanhe e finalize pedidos do restaurante</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ k: 'open', l: 'Abertos' }, { k: 'in_progress', l: 'Em preparo' }, { k: 'closed', l: 'Fechados' }, { k: 'cancelled', l: 'Cancelados' }].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setStatus(t.k)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              status === t.k
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {rows.map((o) => {
              const total = (o.items || []).reduce((acc, i) => acc + Number(i.line_total || 0), 0)
              const isDelivery = String(o.order_type || '').toLowerCase() === 'delivery'
              return (
                <div key={o.id} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <div className="border-b border-slate-800 bg-slate-900 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {isDelivery ? 'Delivery' : `Mesa ${o.table_number}`}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {isDelivery
                            ? `${o.customer_name || 'Cliente'}${o.customer_phone ? ` · ${o.customer_phone}` : ''}`
                            : `Cliente ${o.seat_number}`}
                        </div>
                        {isDelivery ? (
                          <div className="mt-1 text-[11px] text-slate-400 truncate" title={o.delivery_address || ''}>
                            {o.delivery_zone_name ? `${o.delivery_zone_name} · ` : ''}
                            {o.delivery_address || ''}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${
                          o.status === 'open'
                            ? 'border-amber-900/60 bg-amber-950/30 text-amber-200'
                            : o.status === 'in_progress'
                              ? 'border-sky-900/60 bg-sky-950/30 text-sky-200'
                              : o.status === 'closed'
                                ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
                                : 'border-rose-900/60 bg-rose-950/30 text-rose-200'
                        }`}
                      >
                        {fmtStatus(o.status)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <div>Itens: <span className="font-semibold text-slate-200">{o.items?.length || 0}</span></div>
                      <div>Total: <span className="font-semibold text-white">{Number(total || 0).toFixed(2)}</span></div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 bg-slate-900 px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        onClick={() => openDetailsModal(o)}
                      >
                        Detalhes
                      </button>

                      {o.status === 'open' || o.status === 'in_progress' ? (
                        <button
                          type="button"
                          className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                          onClick={() => requestCancelOrder(o)}
                        >
                          Cancelar
                        </button>
                      ) : null}

                      {o.status === 'closed' || o.status === 'cancelled' ? (
                        <button
                          type="button"
                          className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                          onClick={() => requestDeleteOrder(o)}
                        >
                          Excluir
                        </button>
                      ) : null}

                      {o.status === 'open' || o.status === 'in_progress' ? (
                        <button
                          type="button"
                          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
                          onClick={() => openCloseModal(o)}
                        >
                          Finalizar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Nenhum pedido encontrado.</div>
        )}
      </div>

      <Modal
        open={openDetails}
        title={
          detailsOrder
            ? String(detailsOrder.order_type || '').toLowerCase() === 'delivery'
              ? `Detalhes · Delivery`
              : `Detalhes · Mesa ${detailsOrder.table_number} · Cliente ${detailsOrder.seat_number}`
            : 'Detalhes'
        }
        onClose={() => setOpenDetails(false)}
      >
        {!detailsOrder ? null : (
          <div className="grid gap-4">
            {String(detailsOrder.order_type || '').toLowerCase() === 'delivery' ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-sm font-semibold text-white">Cliente</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.customer_name || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.customer_phone || '-'}</div>
                <div className="mt-3 text-sm font-semibold text-white">Entrega</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.delivery_kind || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.delivery_zone_name || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.delivery_address || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">Taxa: {Number(detailsOrder.delivery_fee || 0).toFixed(2)}</div>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">
                Status: <span className="font-semibold text-white">{fmtStatus(detailsOrder.status)}</span>
              </div>
              <div className="text-sm text-slate-200">
                Total:{' '}
                <span className="font-semibold text-white">
                  {Number((detailsOrder.items || []).reduce((acc, i) => acc + Number(i.line_total || 0), 0) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              {(detailsOrder.items || []).map((it) => {
                const p = productById.get(it.product_id)
                const rawUrl = imageByProductId?.[it.product_id] || null
                const url = rawUrl && rawUrl.startsWith('/') ? `${apiBaseUrl}${rawUrl}` : rawUrl
                return (
                  <div key={it.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-900">
                        {url ? (
                          <img src={url} alt={p?.name || 'Produto'} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">Sem</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100" title={p?.name || ''}>
                          {p?.name || `Produto ${it.product_id}`}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">Qtd: {Number(it.qty || 0)}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-white">{Number(it.line_total || 0).toFixed(2)}</div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {detailsOrder.status === 'open' ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                  onClick={async () => {
                    await markInProgress(detailsOrder)
                    setOpenDetails(false)
                  }}
                >
                  Em preparo
                </button>
              ) : null}

              {detailsOrder.status === 'open' || detailsOrder.status === 'in_progress' ? (
                <button
                  type="button"
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => {
                    setOpenDetails(false)
                    openCloseModal(detailsOrder)
                  }}
                >
                  Finalizar
                </button>
              ) : null}

              {detailsOrder.status === 'open' || detailsOrder.status === 'in_progress' ? (
                <button
                  type="button"
                  className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                  onClick={() => requestCancelOrder(detailsOrder)}
                >
                  Cancelar
                </button>
              ) : null}

              {detailsOrder.status === 'closed' || detailsOrder.status === 'cancelled' ? (
                <button
                  type="button"
                  className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                  onClick={() => requestDeleteOrder(detailsOrder)}
                >
                  Excluir
                </button>
              ) : null}

              <button
                type="button"
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                onClick={() => setOpenDetails(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={openConfirm}
        title={
          confirmKind === 'delete'
            ? 'Excluir pedido'
            : confirmKind === 'cancel'
              ? 'Cancelar pedido'
              : 'Confirmar'
        }
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmKind(null)
          setConfirmOrder(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            {confirmKind === 'delete' ? (
              <>
                Tem certeza que deseja excluir o pedido{' '}
                <span className="font-semibold text-white">
                  {String(confirmOrder?.order_type || '').toLowerCase() === 'delivery'
                    ? 'Delivery'
                    : `Mesa ${confirmOrder?.table_number} · Cliente ${confirmOrder?.seat_number}`}
                </span>
                ?
              </>
            ) : (
              <>
                Tem certeza que deseja cancelar o pedido{' '}
                <span className="font-semibold text-white">
                  {String(confirmOrder?.order_type || '').toLowerCase() === 'delivery'
                    ? 'Delivery'
                    : `Mesa ${confirmOrder?.table_number} · Cliente ${confirmOrder?.seat_number}`}
                </span>
                ?
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={confirmBusy}
              onClick={() => {
                setOpenConfirm(false)
                setConfirmKind(null)
                setConfirmOrder(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmAction}
              className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                confirmKind === 'delete'
                  ? 'border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 text-rose-100'
                  : 'border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 text-rose-200'
              }`}
            >
              {confirmBusy ? 'Processando...' : confirmKind === 'delete' ? 'Excluir' : 'Cancelar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openClose}
        title="Finalizar pedido"
        onClose={() => {
          if (!saving) setOpenClose(false)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Mesa <span className="font-semibold text-white">{closingOrder?.table_number || ''}</span> · Cliente{' '}
            <span className="font-semibold text-white">{closingOrder?.seat_number || ''}</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <div>Total</div>
              <div className="font-semibold text-white">{Number(orderTotal || 0).toFixed(2)}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Pagamento</div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
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
                <div className="text-xs font-semibold text-slate-400">Recebido</div>
                <input
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  disabled={paymentMethod !== 'cash'}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  inputMode="decimal"
                  placeholder="0.00"
                  type="text"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <div>Troco</div>
              <div className="text-slate-200">{Number(change || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenClose(false)}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => doClose()}
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Finalizando...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
