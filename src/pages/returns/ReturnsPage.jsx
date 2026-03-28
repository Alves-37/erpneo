import { useEffect, useMemo, useState } from 'react'

import { getMyBranch } from '../../api/branches.js'
import { listProducts } from '../../api/products.js'
import { editSale, listSales, voidSale } from '../../api/sales.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

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

export default function ReturnsPage() {
  const setBranchGlobal = useAuthStore((s) => s.setBranch)
  const branch = useAuthStore((s) => s.branch)

  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])

  const [productsLoading, setProductsLoading] = useState(false)
  const [products, setProducts] = useState([])

  const [openVoid, setOpenVoid] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState(false)
  const [includeTax, setIncludeTax] = useState(true)
  const [editItems, setEditItems] = useState([])

  const [activeSale, setActiveSale] = useState(null)

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

  async function loadSales() {
    setLoading(true)
    try {
      const rows = await listSales({ limit: 100, offset: 0, status: 'paid' }) // Ocultar anuladas na página de devolução por padrão
      setSales(Array.isArray(rows) ? rows : [])
    } catch {
      setSales([])
      toast.error('Não foi possível carregar vendas agora.')
    } finally {
      setLoading(false)
    }
  }

  async function loadProductsOnce() {
    if (products?.length) return
    setProductsLoading(true)
    try {
      const rows = await listProducts({ q: '', is_active: true })
      setProducts(Array.isArray(rows) ? rows : [])
    } catch {
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  useEffect(() => {
    loadBranch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?.id])

  useEffect(() => {
    if (!openVoid) return
    setVoidReason('')
    setVoiding(false)
  }, [openVoid])

  useEffect(() => {
    if (!openEdit) return
    setEditing(false)
    setIncludeTax(Boolean(activeSale?.include_tax ?? true))
    const items = Array.isArray(activeSale?.items) ? activeSale.items : []
    setEditItems(
      items.map((it) => ({
        product_id: Number(it.product_id),
        qty: Number(it.qty || 0),
        price_at_sale: Number(it.price_at_sale || 0),
        cost_at_sale: Number(it.cost_at_sale || 0),
      }))
    )
    loadProductsOnce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEdit, activeSale?.id])

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of products || []) map.set(Number(p.id), p)
    return map
  }, [products])

  async function onConfirmVoid() {
    if (!activeSale?.id) return
    setVoiding(true)
    try {
      await voidSale(Number(activeSale.id), { reason: String(voidReason || '').trim() || null })
      toast.success('Venda anulada e stock devolvido.')
      setOpenVoid(false)
      setActiveSale(null)
      await loadSales()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível anular agora.'
      toast.error(msg)
    } finally {
      setVoiding(false)
    }
  }

  function updateEditItem(index, patch) {
    setEditItems((prev) => {
      const next = [...(prev || [])]
      next[index] = { ...(next[index] || {}), ...(patch || {}) }
      return next
    })
  }

  function removeEditItem(index) {
    setEditItems((prev) => {
      const next = [...(prev || [])]
      next.splice(index, 1)
      return next
    })
  }

  function addEditItem() {
    setEditItems((prev) => [
      ...(prev || []),
      {
        product_id: products?.[0]?.id ? Number(products[0].id) : 0,
        qty: 1,
        price_at_sale: 0,
        cost_at_sale: 0,
      },
    ])
  }

  async function onConfirmEdit() {
    if (!activeSale?.id) return

    const normalized = (editItems || [])
      .map((it) => ({
        product_id: Number(it.product_id),
        qty: Number(it.qty || 0),
        price_at_sale: Number(it.price_at_sale || 0),
        cost_at_sale: Number(it.cost_at_sale || 0),
      }))
      .filter((it) => Number.isFinite(it.product_id) && it.product_id > 0 && Number.isFinite(it.qty) && it.qty > 0)

    if (!normalized.length) {
      toast.error('Informe itens válidos para a venda.')
      return
    }

    setEditing(true)
    try {
      await editSale(Number(activeSale.id), {
        include_tax: Boolean(includeTax),
        items: normalized,
      })
      toast.success('Venda atualizada com sucesso.')
      setOpenEdit(false)
      setActiveSale(null)
      await loadSales()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível editar agora.'
      toast.error(msg)
    } finally {
      setEditing(false)
    }
  }

  return (
    <div className="h-[calc(100vh-56px-48px)] overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Devoluções</div>
          <div className="mt-1 text-sm text-slate-300">Anular venda ou trocar itens</div>
        </div>
        <button
          type="button"
          onClick={() => loadSales()}
          className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 flex flex-col flex-1 min-h-0">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-sm font-semibold text-white">Vendas recentes</div>
          <div className="mt-1 text-xs text-slate-400">Apenas últimas 100 vendas</div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="p-4">
            {loading ? (
              <div className="py-6 text-sm text-slate-300">Carregando...</div>
            ) : sales?.length ? (
              <div className="grid gap-2">
                {(sales || []).map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">Venda #{s.id}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          Estado: <span className="text-slate-200 font-semibold">{s.status || 'paid'}</span>
                          <span className="mx-2 text-slate-600">|</span>
                          Itens: <span className="text-slate-200 font-semibold">{(s.items || []).length}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-white">{fmtMoney.format(Number(s.total || 0))} MZN</div>
                    </div>

                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={(s.status || 'paid') === 'void'}
                        onClick={() => {
                          setActiveSale(s)
                          setOpenEdit(true)
                        }}
                        className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Editar/Trocar
                      </button>
                      <button
                        type="button"
                        disabled={(s.status || 'paid') === 'void'}
                        onClick={() => {
                          setActiveSale(s)
                          setOpenVoid(true)
                        }}
                        className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-60"
                      >
                        Anular (devolução total)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-sm text-slate-300">Sem vendas para mostrar.</div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={openVoid}
        title={activeSale?.id ? `Anular venda #${activeSale.id}` : 'Anular venda'}
        onClose={() => {
          setOpenVoid(false)
          setActiveSale(null)
        }}
      >
        <div className="grid gap-3">
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-200">
            Esta ação devolve o stock de todos os itens e cancela os documentos fiscais ligados à venda.
          </div>

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Motivo (opcional)</div>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full min-h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: Cliente devolveu / erro no registro"
            />
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenVoid(false)
                setActiveSale(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={voiding}
              onClick={onConfirmVoid}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {voiding ? 'Processando...' : 'Confirmar anulação'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openEdit}
        title={activeSale?.id ? `Editar venda #${activeSale.id}` : 'Editar venda'}
        onClose={() => {
          setOpenEdit(false)
          setActiveSale(null)
        }}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-400">IVA</div>
              <button
                type="button"
                onClick={() => setIncludeTax((v) => !v)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  includeTax ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200' : 'border-slate-800 bg-slate-950 text-slate-200'
                }`}
              >
                {includeTax ? 'Com IVA' : 'Sem IVA'}
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Nota: se a venda tiver documento fiscal emitido, a edição será bloqueada (erro 409) e você deve anular e refazer a venda.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">Itens</div>
              <button
                type="button"
                disabled={productsLoading}
                onClick={() => {
                  loadProductsOnce()
                  addEditItem()
                }}
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                Adicionar item
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              {(editItems || []).map((it, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <label className="grid gap-2 sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-400">Produto</div>
                      <select
                        value={String(it.product_id || '')}
                        onChange={(e) => {
                          const pid = Number(e.target.value)
                          const p = productById.get(pid)
                          updateEditItem(idx, {
                            product_id: pid,
                            price_at_sale: Number(p?.price || 0),
                            cost_at_sale: Number(p?.cost || 0),
                          })
                        }}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      >
                        {(products || []).map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <div className="text-xs font-semibold text-slate-400">Qtd</div>
                      <input
                        value={String(it.qty ?? '')}
                        onChange={(e) => updateEditItem(idx, { qty: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        inputMode="decimal"
                        type="text"
                      />
                    </label>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => removeEditItem(idx)}
                        className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="grid gap-2">
                      <div className="text-xs font-semibold text-slate-400">Preço</div>
                      <input
                        value={String(it.price_at_sale ?? '')}
                        onChange={(e) => updateEditItem(idx, { price_at_sale: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        inputMode="decimal"
                        type="text"
                      />
                    </label>
                    <label className="grid gap-2">
                      <div className="text-xs font-semibold text-slate-400">Custo</div>
                      <input
                        value={String(it.cost_at_sale ?? '')}
                        onChange={(e) => updateEditItem(idx, { cost_at_sale: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        inputMode="decimal"
                        type="text"
                      />
                    </label>
                  </div>
                </div>
              ))}

              {!editItems?.length ? (
                <div className="text-sm text-slate-300">Sem itens.</div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenEdit(false)
                setActiveSale(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={editing || productsLoading}
              onClick={onConfirmEdit}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editing ? 'Processando...' : 'Confirmar edição'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
