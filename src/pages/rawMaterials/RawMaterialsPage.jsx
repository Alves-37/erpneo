import { useEffect, useMemo, useState } from 'react'

import { listCompanies } from '../../api/companies.js'
import { getMyBranch } from '../../api/branches.js'
import { listEstablishments } from '../../api/establishments.js'
import { createProduct, deleteProduct, listProducts, updateProduct } from '../../api/products.js'
import { listSuppliers } from '../../api/suppliers.js'
import { listStockLocations } from '../../api/stockLocations.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function numericProps() {
  return {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
  }
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

export default function RawMaterialsPage() {
  const [company, setCompany] = useState(null)
  const [branch, setBranch] = useState(null)
  const businessType = branch?.business_type || 'retail'

  const me = useAuthStore((s) => s.me)
  const establishment = useAuthStore((s) => s.establishment)
  const token = useAuthStore((s) => s.token)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [unit, setUnit] = useState('un')
  const [cost, setCost] = useState('')
  const [minStock, setMinStock] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [trackStock, setTrackStock] = useState(true)
  const [isActive, setIsActive] = useState(true)

  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')

  const [locations, setLocations] = useState([])
  const [defaultLocationId, setDefaultLocationId] = useState('')

  const [establishments, setEstablishments] = useState([])
  const establishmentsById = useMemo(() => {
    const map = new Map()
    for (const p of establishments || []) map.set(Number(p.id), p)
    return map
  }, [establishments])

  const [establishmentId, setEstablishmentId] = useState('')

  const UNIT_OPTIONS = useMemo(() => {
    return [
      { value: 'un', label: 'Unidade' },
      { value: 'kg', label: 'Kg' },
      { value: 'g', label: 'Gramas' },
      { value: 'lt', label: 'Litro' },
      { value: 'ml', label: 'Mililitro' },
      { value: 'cx', label: 'Caixa' },
      { value: 'pct', label: 'Pacote' },
    ]
  }, [])

  async function loadSuppliers() {
    try {
      const rows = await listSuppliers({ limit: 200, offset: 0 })
      setSuppliers(rows || [])
    } catch (err) {
      setSuppliers([])
      if (err?.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente para carregar fornecedores.')
      }
    }
  }

  async function loadLocations() {
    try {
      const rows = await listStockLocations()
      setLocations(rows || [])
      const current = rows || []
      const defaultLoc = current.find((l) => l.is_default) || current[0]
      if (defaultLoc && !defaultLocationId) {
        setDefaultLocationId(String(defaultLoc.id))
      }
    } catch (err) {
      setLocations([])
      if (err?.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente para carregar locais de stock.')
      }
    }
  }

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      if (!token) {
        setItems([])
        return
      }
      const b = await getMyBranch()
      setBranch(b)

      let points = []
      try {
        points = await listEstablishments({ branch_id: b?.id })
        setEstablishments(Array.isArray(points) ? points : [])
      } catch {
        setEstablishments([])
        points = []
      }

      const products = await listProducts({
        q,
        is_active: showInactiveOnly ? false : true,
        establishment_id: isAdmin ? (establishment?.id || undefined) : undefined,
        show_in_menu: false,
      })
      setItems(products || [])

      if (!company) {
        const companies = await listCompanies()
        const c = companies?.[0] || null
        setCompany(c)
      }
    } catch {
      toast.error('Não foi possível carregar matérias-primas agora.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, contextVersion])

  useEffect(() => {
    const t = setTimeout(() => {
      load({ silent: true })
    }, 300)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactiveOnly])

  useEffect(() => {
    if (!token) {
      setSuppliers([])
      setLocations([])
      return
    }

    if (!company) return

    ;(async () => {
      await loadSuppliers()
      await loadLocations()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, company?.id])

  function resetForm() {
    setName('')
    setSku('')
    setBarcode('')
    setUnit('un')
    setCost('')
    setMinStock('')
    setStockQty('')
    setTrackStock(true)
    setIsActive(true)
    setSupplierId('')
    setDefaultLocationId('')
    setEstablishmentId('')
  }

  function fillFormFromProduct(p) {
    setName(p?.name || '')
    setSku(p?.sku || '')
    setBarcode(p?.barcode || '')
    setUnit(p?.unit || 'un')
    setCost(p?.cost != null ? String(p.cost) : '')
    setMinStock(p?.min_stock != null ? String(p.min_stock) : '')
    setStockQty(p?.stock_qty != null ? String(p.stock_qty) : '')
    setTrackStock(Boolean(p?.track_stock))
    setIsActive(Boolean(p?.is_active))
    setSupplierId(p?.supplier_id ? String(p.supplier_id) : '')
    setDefaultLocationId(p?.default_location_id ? String(p.default_location_id) : '')
    if (isAdmin) {
      setEstablishmentId(p?.establishment_id ? String(p.establishment_id) : '')
    }
  }

  async function onSubmit(e) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Informe o nome.')
      return
    }

    if (!defaultLocationId) {
      toast.error('Selecione o local padrão.')
      return
    }

    const parsedCost = cost === '' ? 0 : Number(String(cost).replace(',', '.'))
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      toast.error('Custo inválido.')
      return
    }

    const parsedMinStock = minStock === '' ? 0 : Number(String(minStock).replace(',', '.'))
    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      toast.error('Estoque mínimo inválido.')
      return
    }

    const parsedStockQty = stockQty === '' ? null : Number(String(stockQty).replace(',', '.'))
    if (parsedStockQty !== null && (!Number.isFinite(parsedStockQty) || parsedStockQty < 0)) {
      toast.error('Estoque inválido.')
      return
    }

    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      supplier_id: supplierId ? Number(supplierId) : null,
      default_location_id: Number(defaultLocationId),
      unit,
      price: 0,
      cost: parsedCost,
      tax_rate: 0,
      min_stock: parsedMinStock,
      track_stock: trackStock,
      is_service: false,
      is_active: isActive,
      show_in_menu: false,
    }

    if (isAdmin && establishmentId) payload.establishment_id = Number(establishmentId)
    if (parsedStockQty !== null) payload.stock_qty = parsedStockQty

    try {
      if (editingId) {
        await updateProduct(editingId, payload)
        toast.success('Matéria-prima atualizada com sucesso.')
      } else {
        await createProduct(payload)
        toast.success('Matéria-prima criada com sucesso.')
      }

      setOpenCreate(false)
      setEditingId(null)
      resetForm()
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || (editingId ? 'Não foi possível atualizar agora.' : 'Não foi possível criar agora.'))
    }
  }

  async function onDelete(p) {
    setDeletingProduct(p)
    setOpenDeleteConfirm(true)
  }

  async function confirmDelete() {
    const p = deletingProduct
    if (!p?.id) return
    setDeleting(true)
    try {
      await deleteProduct(p.id)
      toast.success('Matéria-prima removida.')
      setOpenDeleteConfirm(false)
      setDeletingProduct(null)
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível remover agora.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Matérias-primas</div>
          <div className="mt-1 text-sm text-slate-300">
            Tipo de estabelecimento: <span className="text-slate-100">{businessType}</span>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm()
            setEditingId(null)
            setOpenCreate(true)
          }}
          className="self-end sm:self-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs sm:text-sm font-semibold text-white"
          type="button"
        >
          Nova matéria-prima
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="relative w-full sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
            type="text"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={showInactiveOnly}
            onChange={(e) => setShowInactiveOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
          />
          Inativos
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <div className="min-w-[760px] grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-6">Matéria-prima</div>
          <div className="col-span-4">Ponto</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : items.length ? (
          <div className="min-w-[760px] divide-y divide-slate-800">
            {items.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm items-center">
                <div className="col-span-6 font-semibold text-slate-100 truncate" title={p.name || ''}>
                  {p.name}
                </div>
                <div className="col-span-4 text-slate-300 truncate" title={establishmentsById.get(Number(p.establishment_id || 0))?.name || ''}>
                  {establishmentsById.get(Number(p.establishment_id || 0))?.name || '-'}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setEditingId(p.id)
                      fillFormFromProduct(p)
                      setOpenCreate(true)
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="w-full rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhuma matéria-prima encontrada.</div>
        )}
      </div>

      <Modal
        open={openDeleteConfirm}
        title="Confirmar remoção"
        onClose={() => {
          if (!deleting) {
            setOpenDeleteConfirm(false)
            setDeletingProduct(null)
          }
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja remover <span className="font-semibold">{deletingProduct?.name || ''}</span>?
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100"
              onClick={() => setOpenDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openCreate}
        title={editingId ? 'Editar matéria-prima' : 'Nova matéria-prima'}
        onClose={() => {
          setOpenCreate(false)
          setEditingId(null)
        }}
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Nome</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: Farinha"
                type="text"
              />
            </label>

            {isAdmin ? (
              <label className="grid gap-2">
                <div className="text-sm font-medium text-slate-200">Ponto</div>
                <select
                  value={establishmentId}
                  onChange={(e) => setEstablishmentId(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  {!establishments?.length ? <option value="">Sem pontos</option> : <option value="">(Ponto do usuário)</option>}
                  {(establishments || []).map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Unidade</div>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">SKU</div>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Opcional"
                type="text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Código de barras</div>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Opcional"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Custo</div>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="0.00"
                {...numericProps()}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Estoque mínimo</div>
              <input
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="0"
                {...numericProps()}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Estoque</div>
              <input
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: 10"
                {...numericProps()}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Fornecedor (opcional)</div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Sem fornecedor</option>
                {(suppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Local padrão</div>
              <select
                value={defaultLocationId}
                onChange={(e) => setDefaultLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                required
              >
                <option value="">Selecione...</option>
                {(locations || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.type === 'store' ? 'Loja' : 'Armazém'} · {l.name}{l.is_default ? ' (Padrão)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
              />
              Controla estoque
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
              />
              Ativo
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100"
              onClick={() => {
                setOpenCreate(false)
                setEditingId(null)
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
