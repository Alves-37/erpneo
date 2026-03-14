import { useEffect, useMemo, useState } from 'react'

import { listProducts } from '../../api/products.js'
import { listStockLocations } from '../../api/stockLocations.js'
import { createStockAdjustment } from '../../api/stockAdjustments.js'
import { listProductStocks } from '../../api/productStocks.js'
import { toast } from '../../services/toast.js'

function numericProps() {
  return {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
  }
}

export default function StockAdjustmentPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])

  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [qtyDelta, setQtyDelta] = useState('')
  const [notes, setNotes] = useState('')

  const [currentQty, setCurrentQty] = useState(null)

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of products || []) map.set(String(p.id), p)
    return map
  }, [products])

  const locationById = useMemo(() => {
    const map = new Map()
    for (const l of locations || []) map.set(String(l.id), l)
    return map
  }, [locations])

  async function load() {
    setLoading(true)
    try {
      const [prods, locs] = await Promise.all([
        listProducts({ limit: 200, offset: 0 }),
        listStockLocations({ include_inactive: false }),
      ])
      setProducts(prods || [])
      setLocations(locs || [])

      if (!locationId) {
        const def = (locs || []).find((l) => l.is_default) || (locs || [])[0]
        if (def) setLocationId(String(def.id))
      }
    } catch {
      toast.error('Não foi possível carregar produtos/locais.')
      setProducts([])
      setLocations([])
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
      if (!productId || !locationId) {
        if (mounted) setCurrentQty(null)
        return
      }
      try {
        const rows = await listProductStocks({ product_id: Number(productId), location_id: Number(locationId) })
        const q = rows?.[0]?.qty_on_hand
        if (mounted) setCurrentQty(q != null ? Number(q) : 0)
      } catch {
        if (mounted) setCurrentQty(null)
      }
    }
    loadQty()
    return () => {
      mounted = false
    }
  }, [productId, locationId])

  async function submit(e) {
    e.preventDefault()

    if (!productId) {
      toast.error('Selecione um produto.')
      return
    }
    if (!locationId) {
      toast.error('Selecione um local.')
      return
    }

    const q = Number(String(qtyDelta).replace(',', '.'))
    if (!Number.isFinite(q) || q === 0) {
      toast.error('Quantidade inválida (use positivo ou negativo).')
      return
    }

    setSaving(true)
    try {
      await createStockAdjustment({
        product_id: Number(productId),
        location_id: Number(locationId),
        qty_delta: q,
        notes: notes.trim() || null,
      })
      toast.success('Ajuste aplicado.')
      setQtyDelta('')
      setNotes('')

      const rows = await listProductStocks({ product_id: Number(productId), location_id: Number(locationId) })
      const next = rows?.[0]?.qty_on_hand
      setCurrentQty(next != null ? Number(next) : 0)
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível aplicar ajuste.')
    } finally {
      setSaving(false)
    }
  }

  const p = productById.get(String(productId))
  const l = locationById.get(String(locationId))

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Ajuste de Stock</div>
          <div className="mt-1 text-sm text-slate-300">Defina o saldo inicial ou corrija quantidades por local.</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        {loading ? (
          <div className="text-sm text-slate-300">Carregando...</div>
        ) : (
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
                  {(products || []).map((x) => (
                    <option key={x.id} value={String(x.id)}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Local</div>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  required
                >
                  <option value="">Selecione...</option>
                  {(locations || []).map((x) => (
                    <option key={x.id} value={String(x.id)}>
                      {(x.type === 'store' ? 'Loja' : 'Armazém') + ' · ' + x.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="text-sm text-slate-200">
              <span className="text-slate-400">Atual:</span>{' '}
              {p ? p.name : '-'}{' '}
              {l ? `(${l.type === 'store' ? 'Loja' : 'Armazém'} · ${l.name})` : ''}{' '}
              = <span className="font-semibold text-white">{currentQty == null ? '-' : currentQty}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Qtd (delta)</div>
                <input
                  value={qtyDelta}
                  onChange={(e) => setQtyDelta(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Ex: 100 (ou -5)"
                  {...numericProps()}
                />
              </label>

              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Motivo / notas (opcional)</div>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Ex: Inventário inicial"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Aplicando...' : 'Aplicar ajuste'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
