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

function movementTypeLabel(value) {
  const k = String(value || '').trim().toLowerCase()
  if (!k) return '—'
  return {
    adjustment: 'Ajuste',
    purchase: 'Compra',
    sale: 'Venda',
    transfer: 'Transferência',
    initial: 'Inicial',
    sale_out: 'Saída (venda)',
    sale_return_in: 'Entrada (devolução)',
    sale_void: 'Venda anulada',
    sale_void_in: 'Entrada (anulação)',
    transfer_out: 'Saída (transferência)',
    transfer_in: 'Entrada (transferência)',
  }[k] || k
}

function movementTypeColor(value) {
  const k = String(value || '').trim().toLowerCase()
  if (k.includes('return') || k.endsWith('_in')) return 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
  if (k.includes('void')) return 'border-amber-900/60 bg-amber-950/30 text-amber-200'
  if (k.includes('sale') || k.endsWith('_out')) return 'border-rose-900/60 bg-rose-950/30 text-rose-200'
  if (k.includes('adjust')) return 'border-sky-900/60 bg-sky-950/30 text-sky-200'
  if (k.includes('transfer')) return 'border-violet-900/60 bg-violet-950/30 text-violet-200'
  return 'border-slate-800 bg-slate-950 text-slate-200'
}

function referenceLabel(refType, refId) {
  const t = String(refType || '').trim().toLowerCase()
  const id = refId != null ? String(refId) : ''
  if (!t && !id) return '—'
  if (t === 'sale') return `Venda #${id}`
  if (t === 'sale_void') return `Venda anulada #${id}`
  if (t === 'purchase') return `Compra #${id}`
  if (t === 'transfer') return `Transferência #${id}`
  if (t === 'adjustment') return `Ajuste #${id}`
  return `${t || 'ref'}${id ? ` #${id}` : ''}`
}

function referenceColor(refType) {
  const t = String(refType || '').trim().toLowerCase()
  if (t.includes('void')) return 'border-amber-900/60 bg-amber-950/30 text-amber-200'
  if (t.includes('sale')) return 'border-rose-900/60 bg-rose-950/30 text-rose-200'
  if (t.includes('purchase')) return 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
  if (t.includes('transfer')) return 'border-violet-900/60 bg-violet-950/30 text-violet-200'
  if (t.includes('adjust')) return 'border-sky-900/60 bg-sky-950/30 text-sky-200'
  return 'border-slate-800 bg-slate-950 text-slate-200'
}

function formatQty(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v ?? '')
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}`
}

function qtyColor(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return 'border-slate-800 bg-slate-950 text-slate-200'
  return n > 0
    ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
    : 'border-amber-900/60 bg-amber-950/30 text-amber-200'
}

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

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [colsView, setColsView] = useState('when_product')

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="md:hidden rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
          >
            Filtros
          </button>
          <button
            type="button"
            onClick={() => loadHistory()}
            className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="hidden md:grid mt-6 grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-5">
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

      <Modal
        open={filtersOpen}
        title="Filtros"
        onClose={() => setFiltersOpen(false)}
      >
        <div className="grid grid-cols-1 gap-3">
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

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setFiltersOpen(false)
                loadHistory()
              }}
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
                setFiltersOpen(false)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm text-slate-100"
            >
              Limpar
            </button>
          </div>
        </div>
      </Modal>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="text-sm font-semibold text-white">Movimentos</div>
          <div className="mt-1 text-xs text-slate-400">Até 200 registos</div>

          <div className="mt-3 md:hidden">
            <select
              value={colsView}
              onChange={(e) => setColsView(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="when_product">Data + Produto</option>
              <option value="loc_type">Local + Tipo</option>
              <option value="qty_ref">Qtd + Ref</option>
            </select>
          </div>
        </div>

        {/* Mobile: only 2 columns at a time */}
        <div className="md:hidden">
          <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
            {colsView === 'loc_type' ? (
              <>
                <div>Local</div>
                <div>Tipo</div>
              </>
            ) : colsView === 'qty_ref' ? (
              <>
                <div className="text-right">Qtd</div>
                <div className="text-right">Ref</div>
              </>
            ) : (
              <>
                <div>Data</div>
                <div>Produto</div>
              </>
            )}
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
          ) : items.length ? (
            <div className="divide-y divide-slate-800">
              {items.map((m) => {
                const p = productById.get(String(m.product_id))
                const l = locationById.get(String(m.location_id))
                const refText = referenceLabel(m.reference_type, m.reference_id)
                return (
                  <div key={m.id} className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {colsView === 'loc_type' ? (
                        <>
                          <div className="text-slate-300 truncate" title={l?.name || ''}>
                            {l ? `${l.type === 'store' ? 'Loja' : 'Armazém'} · ${l.name}` : `#${m.location_id}`}
                          </div>
                          <div className="flex justify-end">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${movementTypeColor(m.movement_type)}`}
                              title={String(m.movement_type || '')}
                            >
                              {movementTypeLabel(m.movement_type)}
                            </span>
                          </div>
                        </>
                      ) : colsView === 'qty_ref' ? (
                        <>
                          <div className="flex justify-end">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${qtyColor(m.qty_delta)}`}
                              title={formatQty(m.qty_delta)}
                            >
                              {formatQty(m.qty_delta)}
                            </span>
                          </div>
                          <div className="flex justify-end">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${referenceColor(m.reference_type)}`}
                              title={refText}
                            >
                              {refText}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-slate-300">{formatDateTime(m.created_at)}</div>
                          <div className="text-slate-100 font-medium truncate" title={p?.name || ''}>
                            {p?.name || `#${m.product_id}`}
                          </div>
                        </>
                      )}
                    </div>
                    {m.notes ? <div className="mt-2 text-xs text-slate-500">{m.notes}</div> : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-slate-300">Sem movimentos registados.</div>
          )}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block">
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
                const refText = referenceLabel(m.reference_type, m.reference_id)
                return (
                  <div key={m.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                    <div className="col-span-3 text-slate-300">{formatDateTime(m.created_at)}</div>
                    <div className="col-span-3 text-slate-100 font-medium truncate" title={p?.name || ''}>
                      {p?.name || `#${m.product_id}`}
                    </div>
                    <div className="col-span-3 text-slate-300 truncate" title={l?.name || ''}>
                      {l ? `${l.type === 'store' ? 'Loja' : 'Armazém'} · ${l.name}` : `#${m.location_id}`}
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${movementTypeColor(m.movement_type)}`}
                        title={String(m.movement_type || '')}
                      >
                        {movementTypeLabel(m.movement_type)}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${qtyColor(m.qty_delta)}`}
                        title={formatQty(m.qty_delta)}
                      >
                        {formatQty(m.qty_delta)}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${referenceColor(m.reference_type)}`}
                        title={refText}
                      >
                        {refText}
                      </span>
                    </div>
                    {m.notes ? <div className="col-span-12 -mt-1 text-xs text-slate-500">{m.notes}</div> : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-slate-300">Sem movimentos registados.</div>
          )}
        </div>
      </div>
    </div>
  )
}
