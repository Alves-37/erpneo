import { useEffect, useMemo, useState } from 'react'

import { listProducts } from '../../api/products.js'
import { listStockLocations } from '../../api/stockLocations.js'
import { listProductStocks } from '../../api/productStocks.js'
import { createStockTransfer, listStockTransfers } from '../../api/stockTransfers.js'
import { toast } from '../../services/toast.js'

function numericProps() {
  return {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
  }
}

function fmtDateTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

export default function StockTransferPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])

  const [recent, setRecent] = useState([])

  const [productId, setProductId] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')

  const [currentFromQty, setCurrentFromQty] = useState(null)

  const [currentStoreQty, setCurrentStoreQty] = useState(null)
  const [currentWarehouseQty, setCurrentWarehouseQty] = useState(null)

  const locationById = useMemo(() => {
    const map = new Map()
    for (const l of locations || []) map.set(String(l.id), l)
    return map
  }, [locations])

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of products || []) map.set(String(p.id), p)
    return map
  }, [products])

  const selectedProduct = productById.get(String(productId))

  async function load() {
    setLoading(true)
    try {
      const [prods, locs, rec] = await Promise.all([
        listProducts({ limit: 200, offset: 0 }),
        listStockLocations({ include_inactive: false }),
        listStockTransfers({ limit: 50, offset: 0 }),
      ])
      setProducts(prods || [])
      setLocations(locs || [])
      setRecent(rec || [])

      // defaults
      const firstLoc = (locs || [])[0]
      if (firstLoc && !fromLocationId) setFromLocationId(String(firstLoc.id))
      const secondLoc = (locs || [])[1] || firstLoc
      if (secondLoc && !toLocationId) setToLocationId(String(secondLoc.id))
    } catch {
      toast.error('Não foi possível carregar dados de transferência.')
      setProducts([])
      setLocations([])
      setRecent([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadQty() {
      if (!productId || !fromLocationId) {
        if (mounted) setCurrentFromQty(null)
        return
      }
      try {
        const rows = await listProductStocks({ product_id: Number(productId), location_id: Number(fromLocationId) })
        const q = rows?.[0]?.qty_on_hand
        if (mounted) setCurrentFromQty(q != null ? Number(q) : 0)
      } catch {
        if (mounted) setCurrentFromQty(null)
      }
    }
    loadQty()
    return () => {
      mounted = false
    }
  }, [productId, fromLocationId])

  useEffect(() => {
    let mounted = true
    async function loadQty() {
      if (!productId) {
        if (mounted) {
          setCurrentStoreQty(null)
          setCurrentWarehouseQty(null)
        }
        return
      }
      try {
        const rows = await listProductStocks({ product_id: Number(productId) })
        const qtyByLocationId = new Map((rows || []).map((r) => [String(r.location_id), Number(r.qty_on_hand || 0)]))

        let store = 0
        let warehouse = 0
        for (const l of locations || []) {
          const q = qtyByLocationId.get(String(l.id)) || 0
          if (l.type === 'warehouse') warehouse += q
          else store += q
        }

        if (mounted) {
          setCurrentStoreQty(store)
          setCurrentWarehouseQty(warehouse)
        }
      } catch {
        if (mounted) {
          setCurrentStoreQty(null)
          setCurrentWarehouseQty(null)
        }
      }
    }
    loadQty()
    return () => {
      mounted = false
    }
  }, [productId, locations])

  async function submit(e) {
    e.preventDefault()

    if (!productId) {
      toast.error('Selecione um produto.')
      return
    }
    if (!fromLocationId || !toLocationId) {
      toast.error('Selecione origem e destino.')
      return
    }
    if (fromLocationId === toLocationId) {
      toast.error('Origem e destino não podem ser iguais.')
      return
    }

    const q = Number(String(qty).replace(',', '.'))
    if (!Number.isFinite(q) || q <= 0) {
      toast.error('Quantidade inválida.')
      return
    }

    setSaving(true)
    try {
      await createStockTransfer({
        product_id: Number(productId),
        from_location_id: Number(fromLocationId),
        to_location_id: Number(toLocationId),
        qty: q,
        notes: notes.trim() || null,
      })
      toast.success('Transferência realizada.')
      setQty('')
      setNotes('')
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível realizar a transferência agora.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Transferência de Stock</div>
          <div className="mt-1 text-sm text-slate-300">Mover produto entre locais (Loja / Armazém / etc.).</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Produto</div>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                required
              >
                <option value="">Selecione...</option>
                {(products || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-400">
                Nº: {selectedProduct?.id ?? '-'} | Loja: {currentStoreQty == null ? '-' : currentStoreQty} | Armazém:{' '}
                {currentWarehouseQty == null ? '-' : currentWarehouseQty}
              </div>
            </label>

            <label className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Quantidade</div>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: 5"
                {...numericProps()}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Origem</div>
              <select
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                required
              >
                <option value="">Selecione...</option>
                {(locations || []).map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {(l.type === 'store' ? 'Loja' : 'Armazém') + ' · ' + l.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-400">Disponível: {currentFromQty == null ? '-' : currentFromQty}</div>
            </label>

            <label className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Destino</div>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                required
              >
                <option value="">Selecione...</option>
                {(locations || []).map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {(l.type === 'store' ? 'Loja' : 'Armazém') + ' · ' + l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Motivo / notas (opcional)</div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: Reposição da loja"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Transferindo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-3">Data</div>
          <div className="col-span-3">Produto</div>
          <div className="col-span-3">Origem</div>
          <div className="col-span-3">Destino</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : recent.length ? (
          <div className="divide-y divide-slate-800">
            {recent.map((t) => {
              const p = productById.get(String(t.product_id))
              const from = locationById.get(String(t.from_location_id))
              const to = locationById.get(String(t.to_location_id))
              return (
                <div key={t.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-3 text-slate-300">{fmtDateTime(t.created_at)}</div>
                  <div className="col-span-3 text-slate-100 font-medium truncate" title={p?.name || ''}>
                    {p?.name || `#${t.product_id}`}
                  </div>
                  <div className="col-span-3 text-slate-300 truncate" title={from?.name || ''}>
                    {from ? `${from.type === 'store' ? 'Loja' : 'Armazém'} · ${from.name}` : `#${t.from_location_id}`}
                  </div>
                  <div className="col-span-3 text-slate-300 truncate" title={to?.name || ''}>
                    {to ? `${to.type === 'store' ? 'Loja' : 'Armazém'} · ${to.name}` : `#${t.to_location_id}`}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhuma transferência registrada.</div>
        )}
      </div>
    </div>
  )
}
