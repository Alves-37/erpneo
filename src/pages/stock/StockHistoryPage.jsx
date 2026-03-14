import { useEffect, useMemo, useState } from 'react'

import { listProducts } from '../../api/products.js'
import { listStockLocations } from '../../api/stockLocations.js'
import { listStockMovements } from '../../api/stockMovements.js'
import { toast } from '../../services/toast.js'

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function formatQty(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v ?? '')
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}`
}

export default function StockHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])

  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [movementType, setMovementType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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

  async function loadFilters() {
    try {
      const [prods, locs] = await Promise.all([
        listProducts({ limit: 200, offset: 0 }),
        listStockLocations({ include_inactive: true }),
      ])
      setProducts(prods || [])
      setLocations(locs || [])
    } catch {
      setProducts([])
      setLocations([])
    }
  }

  async function loadHistory() {
    setLoading(true)
    try {
      const rows = await listStockMovements({
        product_id: productId ? Number(productId) : undefined,
        location_id: locationId ? Number(locationId) : undefined,
        movement_type: movementType || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        limit: 200,
        offset: 0,
      })
      setItems(rows || [])
    } catch {
      setItems([])
      toast.error('Não foi possível carregar o histórico de stock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFilters()
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Histórico de Stock</div>
          <div className="mt-1 text-sm text-slate-300">Movimentos registados por produto e local.</div>
        </div>

        <button
          type="button"
          onClick={() => loadHistory()}
          className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-5">
        <label className="grid gap-2">
          <div className="text-xs font-semibold text-slate-400">Produto</div>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">Todos</option>
            {(products || []).map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
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
          >
            <option value="">Todos</option>
            {(locations || []).map((l) => (
              <option key={l.id} value={String(l.id)}>
                {(l.type === 'store' ? 'Loja' : 'Armazém') + ' · ' + l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <div className="text-xs font-semibold text-slate-400">Tipo</div>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">Todos</option>
            <option value="adjustment">Ajuste</option>
            <option value="purchase">Compra</option>
            <option value="sale">Venda</option>
            <option value="transfer">Transferência</option>
            <option value="initial">Inicial</option>
          </select>
        </label>

        <label className="grid gap-2">
          <div className="text-xs font-semibold text-slate-400">De</div>
          <input
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            type="datetime-local"
          />
        </label>

        <label className="grid gap-2">
          <div className="text-xs font-semibold text-slate-400">Até</div>
          <input
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            type="datetime-local"
          />
        </label>

        <div className="md:col-span-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadHistory()}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={() => {
              setProductId('')
              setLocationId('')
              setMovementType('')
              setDateFrom('')
              setDateTo('')
              window.setTimeout(() => loadHistory(), 0)
            }}
            className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm text-slate-100"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-3">Data</div>
          <div className="col-span-3">Produto</div>
          <div className="col-span-3">Local</div>
          <div className="col-span-1">Tipo</div>
          <div className="col-span-1 text-right">Qtd</div>
          <div className="col-span-1 text-right">Ref</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : items.length ? (
          <div className="divide-y divide-slate-800">
            {items.map((m) => {
              const p = productById.get(String(m.product_id))
              const l = locationById.get(String(m.location_id))
              const ref = m.reference_type && m.reference_id != null ? `${m.reference_type}#${m.reference_id}` : '-'
              return (
                <div key={m.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-3 text-slate-300">{formatDateTime(m.created_at)}</div>
                  <div className="col-span-3 text-slate-100 font-medium truncate" title={p?.name || ''}>
                    {p?.name || `#${m.product_id}`}
                  </div>
                  <div className="col-span-3 text-slate-300 truncate" title={l?.name || ''}>
                    {l ? `${l.type === 'store' ? 'Loja' : 'Armazém'} · ${l.name}` : `#${m.location_id}`}
                  </div>
                  <div className="col-span-1 text-slate-300">{m.movement_type}</div>
                  <div className="col-span-1 text-right text-slate-100 font-semibold">{formatQty(m.qty_delta)}</div>
                  <div className="col-span-1 text-right text-slate-400 truncate" title={ref}>
                    {ref}
                  </div>
                  {m.notes ? (
                    <div className="col-span-12 -mt-1 text-xs text-slate-500">{m.notes}</div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Sem movimentos registados.</div>
        )}
      </div>
    </div>
  )
}
