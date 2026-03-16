import { useEffect, useMemo, useState } from 'react'

import { listCompanies } from '../../api/companies.js'
import { getMyBranch } from '../../api/branches.js'
import { listProductCategories } from '../../api/productCategories.js'
import { createProduct, deleteProduct, listProductImages, listProducts, updateProduct, uploadProductImage } from '../../api/products.js'
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

export default function ProductsPage() {
  const [company, setCompany] = useState(null)
  const [branch, setBranch] = useState(null)
  const businessType = branch?.business_type || 'retail'
  const isRestaurant = businessType === 'restaurant'
  const isBar = businessType === 'bar'
  const allowsImages = isRestaurant || isBar

  const token = useAuthStore((s) => s.token)

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neoerp-production.up.railway.app'

  const [imageByProductId, setImageByProductId] = useState({})

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [restaurantActionsProduct, setRestaurantActionsProduct] = useState(null)

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [unit, setUnit] = useState('un')
  const [unitMode, setUnitMode] = useState('preset')
  const [unitCustom, setUnitCustom] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [minStock, setMinStock] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [trackStock, setTrackStock] = useState(true)
  const [isService, setIsService] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [images, setImages] = useState([])
  const [creating, setCreating] = useState(false)

  const [categories, setCategories] = useState([])
  const [categoryMode, setCategoryMode] = useState('select')
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')

  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')

  const [locations, setLocations] = useState([])
  const [defaultLocationId, setDefaultLocationId] = useState('')

  const canCreate = useMemo(() => name.trim().length > 0, [name])

  const UNIT_OPTIONS = useMemo(() => {
    if (businessType === 'services') {
      return [
        { value: 'serv', label: 'Serviço' },
        { value: 'h', label: 'Hora' },
        { value: 'un', label: 'Unidade' },
        { value: 'custom', label: 'Outro...' },
      ]
    }
    return [
      { value: 'un', label: 'Unidade' },
      { value: 'kg', label: 'Kg' },
      { value: 'g', label: 'Gramas' },
      { value: 'lt', label: 'Litro' },
      { value: 'ml', label: 'Mililitro' },
      { value: 'cx', label: 'Caixa' },
      { value: 'pct', label: 'Pacote' },
      { value: 'custom', label: 'Outro...' },
    ]
  }, [businessType])

  async function loadCategories(bt = businessType) {
    try {
      const rows = await listProductCategories({ businessType: bt })
      setCategories(rows || [])
    } catch {
      setCategories([])
    }
  }

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

  const categoriesById = useMemo(() => {
    const map = new Map()
    for (const c of categories || []) map.set(c.id, c)
    return map
  }, [categories])

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      if (!token) {
        setItems([])
        setImageByProductId({})
        return
      }
      const b = await getMyBranch()
      setBranch(b)
      const products = await listProducts({ q, low_stock: onlyLowStock && !showInactiveOnly, is_active: showInactiveOnly ? false : true })
      setItems(products || [])

      if (!company) {
        const companies = await listCompanies()
        const c = companies?.[0] || null
        setCompany(c)
      }

      await loadCategories(b?.business_type || 'retail')
    } catch {
      toast.error('Não foi possível carregar produtos agora.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!allowsImages) {
      setImageByProductId({})
      return
    }

    const next = {}
    for (const p of items || []) {
      if (!p?.id) continue
      next[p.id] = p?.image_url || null
    }
    setImageByProductId(next)
  }, [allowsImages, items])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
  }, [onlyLowStock])

  useEffect(() => {
    if (showInactiveOnly) setOnlyLowStock(false)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactiveOnly])

  function resetForm() {
    setName('')
    setSku('')
    setBarcode('')
    setUnit('un')
    setUnitMode('preset')
    setUnitCustom('')
    setPrice('')
    setCost('')
    setTaxRate('')
    setMinStock('')
    setStockQty('')
    setTrackStock(true)
    setIsService(false)
    setIsActive(true)
    setImages([])
    setCategoryMode('select')
    setCategoryId('')
    setCategoryName('')
    setSupplierId('')
    setDefaultLocationId('')
  }

  function fillFormFromProduct(p) {
    setName(p?.name || '')
    setSku(p?.sku || '')
    setBarcode(p?.barcode || '')
    setUnit(p?.unit || 'un')
    setUnitMode('preset')
    setUnitCustom('')
    setPrice(p?.price != null ? String(p.price) : '')
    setCost(p?.cost != null ? String(p.cost) : '')
    setTaxRate(p?.tax_rate != null ? String(p.tax_rate) : '')
    setMinStock(p?.min_stock != null ? String(p.min_stock) : '')
    setStockQty(p?.stock_qty != null ? String(p.stock_qty) : '')
    setTrackStock(Boolean(p?.track_stock))
    setIsService(Boolean(p?.is_service))
    setIsActive(Boolean(p?.is_active))

    setSupplierId(p?.supplier_id ? String(p.supplier_id) : '')
    setDefaultLocationId(p?.default_location_id ? String(p.default_location_id) : '')

    if (p?.category_id) {
      setCategoryMode('select')
      setCategoryId(String(p.category_id))
      setCategoryName('')
    } else {
      setCategoryMode('select')
      setCategoryId('')
      setCategoryName('')
    }

    setImages([])
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!canCreate) {
      toast.error('Informe o nome do produto.')
      return
    }

    const finalUnit = unitMode === 'custom' ? unitCustom.trim() : unit
    if (!finalUnit) {
      toast.error('Selecione a unidade.')
      return
    }

    const parsedTax = taxRate === '' ? 0 : Number(String(taxRate).replace(',', '.'))
    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      toast.error('IVA inválido.')
      return
    }

    if (categoryMode === 'new' && !categoryName.trim()) {
      toast.error('Informe o nome da categoria.')
      return
    }

    if (!defaultLocationId) {
      toast.error('Selecione o local padrão.')
      return
    }

    const parsedMinStock = isService ? 0 : (minStock === '' ? 0 : Number(String(minStock).replace(',', '.')))
    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      toast.error('Estoque mínimo inválido.')
      return
    }

    const parsedStockQty = isService ? null : (stockQty === '' ? null : Number(String(stockQty).replace(',', '.')))
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
      unit: finalUnit,
      price: price ? Number(price) : 0,
      cost: isService ? 0 : (cost ? Number(cost) : 0),
      tax_rate: parsedTax,
      min_stock: parsedMinStock,
      track_stock: isService ? false : trackStock,
      is_service: isService,
      is_active: isActive,
      category_id: categoryMode === 'select' && categoryId ? Number(categoryId) : null,
      category_name: categoryMode === 'new' ? categoryName.trim() : null,
    }

    if (!isService && parsedStockQty !== null) payload.stock_qty = parsedStockQty

    setCreating(true)
    try {
      if (editingId) {
        const updated = await updateProduct(editingId, payload)
        if (allowsImages && images.length) {
          for (const file of images) {
            await uploadProductImage(updated.id, file)
          }
        }
        toast.success('Produto atualizado com sucesso.')
      } else {
        const created = await createProduct(payload)
        if (allowsImages && images.length) {
          for (const file of images) {
            await uploadProductImage(created.id, file)
          }
        }
        toast.success('Produto criado com sucesso.')
      }

      setOpenCreate(false)
      setEditingId(null)
      resetForm()
      await load()
      await loadCategories(businessType)
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || (editingId ? 'Não foi possível atualizar o produto agora.' : 'Não foi possível criar o produto agora.'))
    } finally {
      setCreating(false)
    }
  }

  async function onToggleActive(p) {
    try {
      await updateProduct(p.id, { is_active: !p.is_active })
      toast.success(!p.is_active ? 'Produto ativado.' : 'Produto desativado.')
      await load()
    } catch {
      toast.error('Não foi possível alterar o status agora.')
    }
  }

  async function onDelete(p) {
    setDeletingProduct(p)
    setOpenDeleteConfirm(true)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Produtos</div>
          <div className="mt-1 text-sm text-slate-300">
            Tipo de estabelecimento: <span className="text-slate-100">{businessType}</span>
          </div>
        </div>
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                disabled={showInactiveOnly}
                className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
              />
              Baixo estoque
            </label>

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

          <button
            onClick={() => {
              resetForm()
              loadCategories(businessType)
              setEditingId(null)
              if (businessType === 'grocery' || businessType === 'fish' || businessType === 'grocery_fish') {
                setUnit('kg')
                setUnitMode('preset')
                setUnitCustom('')
              }
              setOpenCreate(true)
            }}
            className="self-end sm:self-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs sm:text-sm font-semibold text-white"
            type="button"
          >
            Novo produto
          </button>
        </div>
      </div>

      {isRestaurant ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {loading ? (
            <div className="py-6 text-sm text-slate-300">Carregando...</div>
          ) : items.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((p) => {
                const rawUrl = imageByProductId?.[p.id] || null
                const url = rawUrl && rawUrl.startsWith('/') ? `${apiBaseUrl}${rawUrl}` : rawUrl
                return (
                  <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">
                    <div className="relative aspect-[4/3] w-full bg-slate-900">
                      {url ? (
                        <img
                          src={url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-300 sm:group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Sem imagem</div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />

                      <div className="absolute left-2 top-2 rounded-xl border border-slate-700/60 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-100 backdrop-blur">
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </div>

                      <div className="absolute right-2 top-2 rounded-xl bg-brand-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                        {Number(p.price || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="text-sm font-semibold text-slate-100 leading-5" title={p.name}>
                        {p.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate" title={(p.category_id && categoriesById.get(p.category_id)?.name) || ''}>
                        {(p.category_id && categoriesById.get(p.category_id)?.name) || '-'}
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setRestaurantActionsProduct(p)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-100"
                        >
                          Ações
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-sm text-slate-300">Nenhum produto encontrado.</div>
          )}
        </div>
      ) : (
        <>
        <div className="mt-4 md:hidden rounded-2xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
          ) : items.length ? (
            items.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate" title={p.name || ''}>
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      SKU: <span className="text-slate-200">{p.sku || '-'}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Código: <span className="text-slate-200">{p.barcode || '-'}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Unidade: <span className="text-slate-200">{p.unit || 'un'}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      IVA: <span className="text-slate-200">{Number(p.tax_rate || 0).toFixed(2)}%</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Preço: <span className="text-slate-200">{Number(p.price || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-200">
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-2 text-xs text-slate-100"
                    onClick={() => {
                      resetForm()
                      loadCategories(businessType)
                      setEditingId(p.id)
                      fillFormFromProduct(p)
                      setOpenCreate(true)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-2 text-xs text-slate-100"
                    onClick={() => onToggleActive(p)}
                  >
                    {p.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-2 text-xs text-rose-200"
                    onClick={() => onDelete(p)}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-slate-300">Nenhum produto encontrado.</div>
          )}
        </div>

        <div className="mt-4 hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
            <>
              <div className="col-span-4">Produto</div>
              <div className="col-span-2">SKU</div>
              <div className="col-span-2">Código</div>
              <div className="col-span-1">Unidade</div>
              <div className="col-span-1">IVA</div>
              <div className="col-span-1">Preço</div>
              <div className="col-span-1 text-right">Ações</div>
            </>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
          ) : items.length ? (
            <div className="divide-y divide-slate-800">
              {items.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm items-center">
                  <>
                    <div className="col-span-4 font-semibold text-slate-100 truncate" title={p.name || ''}>
                      {p.name}
                    </div>
                    <div className="col-span-2 text-slate-300 truncate" title={p.sku || ''}>
                      {p.sku || '-'}
                    </div>
                    <div className="col-span-2 text-slate-300 truncate" title={p.barcode || ''}>
                      {p.barcode || '-'}
                    </div>
                    <div className="col-span-1 text-slate-300">{p.unit || 'un'}</div>
                    <div className="col-span-1 text-slate-300">{Number(p.tax_rate || 0).toFixed(2)}%</div>
                    <div className="col-span-1 text-slate-300">{Number(p.price || 0).toFixed(2)}</div>
                    <div className="col-span-1 flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100"
                        onClick={() => {
                          resetForm()
                          loadCategories(businessType)
                          setEditingId(p.id)
                          fillFormFromProduct(p)
                          setOpenCreate(true)
                        }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100"
                        onClick={() => onToggleActive(p)}
                      >
                        {p.is_active ? 'Desativar' : 'Ativar'}
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200"
                        onClick={() => onDelete(p)}
                      >
                        Apagar
                      </button>
                    </div>
                  </>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-slate-300">Nenhum produto encontrado.</div>
          )}
        </div>
        </>
      )}

      <Modal open={Boolean(restaurantActionsProduct)} title={restaurantActionsProduct?.name || 'Ações'} onClose={() => setRestaurantActionsProduct(null)}>
        <div className="grid gap-2">
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => {
              const p = restaurantActionsProduct
              setRestaurantActionsProduct(null)
              if (!p) return
              resetForm()
              loadCategories(businessType)
              setEditingId(p.id)
              fillFormFromProduct(p)
              setOpenCreate(true)
            }}
          >
            Editar
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => {
              const p = restaurantActionsProduct
              setRestaurantActionsProduct(null)
              if (!p) return
              onToggleActive(p)
            }}
          >
            {restaurantActionsProduct?.is_active ? 'Desativar' : 'Ativar'}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-4 py-3 text-sm font-semibold text-rose-200"
            onClick={() => {
              const p = restaurantActionsProduct
              setRestaurantActionsProduct(null)
              if (!p) return
              onDelete(p)
            }}
          >
            Apagar
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => setRestaurantActionsProduct(null)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal
        open={openCreate}
        title={editingId ? 'Editar produto' : 'Novo produto'}
        onClose={() => {
          if (!creating) {
            setOpenCreate(false)
            setEditingId(null)
          }
        }}
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isService}
              onChange={(e) => {
                const v = e.target.checked
                setIsService(v)
                if (v) {
                  setTrackStock(false)
                  setMinStock('')
                  setStockQty('')
                  setCost('')
                }
              }}
              className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
            />
            É serviço (sem stock e sem custo)
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Nome</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: X-Burger"
                type="text"
              />
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Unidade</div>
              <select
                value={unitMode === 'custom' ? 'custom' : unit}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'custom') {
                    setUnitMode('custom')
                    setUnit('un')
                  } else {
                    setUnitMode('preset')
                    setUnit(v)
                  }
                }}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>

              {unitMode === 'custom' ? (
                <input
                  value={unitCustom}
                  onChange={(e) => setUnitCustom(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Ex: porção, garrafa..."
                  type="text"
                />
              ) : null}
            </label>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Categoria</div>
              <select
                value={categoryMode === 'new' ? '__new__' : categoryId}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__new__') {
                    setCategoryMode('new')
                    setCategoryId('')
                  } else {
                    setCategoryMode('select')
                    setCategoryId(v)
                    setCategoryName('')
                  }
                }}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Sem categoria</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">+ Nova categoria...</option>
              </select>

              {categoryMode === 'new' ? (
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Nome da categoria"
                  type="text"
                />
              ) : null}
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
              <div className="text-xs font-semibold text-slate-400">IVA (%)</div>
              <input
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: 16"
                {...numericProps()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2">
                <div className="text-sm font-medium text-slate-200">Preço</div>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="0.00"
                  {...numericProps()}
                />
              </label>

              <label className="grid gap-2">
                <div className="text-sm font-medium text-slate-200">Custo</div>
                <input
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="0.00"
                  {...numericProps()}
                  disabled={isService}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Estoque</div>
              <input
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: 10"
                {...numericProps()}
                disabled={isService}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Estoque mínimo</div>
              <input
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Ex: 2"
                {...numericProps()}
                disabled={isService}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
                disabled={isService}
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

          {allowsImages ? (
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Imagens</div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="block w-full min-w-0 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
              />
              <div className="text-xs text-slate-400">Recomendado para cardápio (restaurante/bar).</div>
            </label>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenCreate(false)}
              disabled={creating}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openDeleteConfirm}
        title="Confirmar exclusão"
        onClose={() => {
          if (deleting) return
          setOpenDeleteConfirm(false)
          setDeletingProduct(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja apagar o produto{' '}
            <span className="font-semibold text-white">{deletingProduct?.name || ''}</span>?
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (deleting) return
                setOpenDeleteConfirm(false)
                setDeletingProduct(null)
              }}
              disabled={deleting}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              onClick={async () => {
                const p = deletingProduct
                if (!p) return
                if (deleting) return
                try {
                  setDeleting(true)
                  const res = await deleteProduct(p.id)
                  if (res?.status === 'deactivated') {
                    toast.success('Produto desativado.')
                  } else {
                    toast.success('Produto apagado.')
                  }
                  setOpenDeleteConfirm(false)
                  setDeletingProduct(null)
                  await load()
                } catch (err) {
                  const msg = err?.response?.data?.detail
                  toast.error(msg || 'Não foi possível apagar o produto agora.')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? 'Apagando...' : 'Apagar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
