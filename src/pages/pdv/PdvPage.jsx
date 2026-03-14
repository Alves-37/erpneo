import { useEffect, useMemo, useState } from 'react'

import { listCompanies } from '../../api/companies.js'
import { getMyBranch } from '../../api/branches.js'
import { issueFiscalDocumentFromSale } from '../../api/fiscalDocuments.js'
import { listOrders } from '../../api/orders.js'
import { listProductCategories } from '../../api/productCategories.js'
import { listProductImages, listProducts } from '../../api/products.js'
import { createOrder } from '../../api/orders.js'
import { listRestaurantTables } from '../../api/restaurantTables.js'
import { createSale } from '../../api/sales.js'
import { convertQuoteToSale, createQuote, deleteQuote, listQuotes, updateQuote } from '../../api/quotes.js'
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

export default function PdvPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const [company, setCompany] = useState(null)
  const [branch, setBranch] = useState(null)
  const businessType = branch?.business_type || 'retail'
  const isRestaurant = businessType === 'restaurant'

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')

  const [categories, setCategories] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState('')

  const [imageByProductId, setImageByProductId] = useState({})

  const [cart, setCart] = useState({})

  const [saleChannel, setSaleChannel] = useState('counter')
  const [tableNumber, setTableNumber] = useState('')
  const [seatNumber, setSeatNumber] = useState('1')
  const [cartsByKey, setCartsByKey] = useState({})

  const [tables, setTables] = useState([])
  const [occupiedSeatsByTable, setOccupiedSeatsByTable] = useState({})
  const [openSeatModal, setOpenSeatModal] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [saving, setSaving] = useState(false)

  const [includeTax, setIncludeTax] = useState(true)

  const [openConfirm, setOpenConfirm] = useState(false)

  const [openProductDetails, setOpenProductDetails] = useState(false)
  const [activeProduct, setActiveProduct] = useState(null)

  const [openQuotes, setOpenQuotes] = useState(false)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotes, setQuotes] = useState([])

  const [activeQuote, setActiveQuote] = useState(null)
  const [openSaveQuote, setOpenSaveQuote] = useState(false)
  const [quoteSeries, setQuoteSeries] = useState('A')
  const [quoteCustomerName, setQuoteCustomerName] = useState('')
  const [quoteCustomerNuit, setQuoteCustomerNuit] = useState('')

  const [convertingQuote, setConvertingQuote] = useState(false)

  const openDetails = (p) => {
    setActiveProduct(p || null)
    setOpenProductDetails(true)
  }

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of items || []) map.set(p.id, p)
    return map
  }, [items])

  const filteredItems = useMemo(() => {
    const query = String(q || '').trim().toLowerCase()
    let out = items || []

    if (query) {
      out = out.filter((p) => {
        const name = String(p.name || '').toLowerCase()
        const sku = String(p.sku || '').toLowerCase()
        const barcode = String(p.barcode || '').toLowerCase()
        return name.includes(query) || sku.includes(query) || barcode.includes(query)
      })
    }

    if (activeCategoryId) {
      const cid = Number(activeCategoryId)
      out = out.filter((p) => Number(p.category_id || 0) === cid)
    }

    return out
  }, [items, activeCategoryId, q])

  const cartLines = useMemo(() => {
    const lines = []
    for (const [id, qty] of Object.entries(cart || {})) {
      const pid = Number(id)
      const qn = Number(qty || 0)
      if (!qn) continue
      const p = productById.get(pid)
      if (!p) continue
      const price = Number(p.price || 0)
      const lineTotal = price * qn
      lines.push({ product: p, qty: qn, price, lineTotal })
    }
    lines.sort((a, b) => b.product.id - a.product.id)
    return lines
  }, [cart, productById])

  const total = useMemo(() => {
    return cartLines.reduce((acc, l) => acc + Number(l.lineTotal || 0), 0)
  }, [cartLines])

  const taxTotal = useMemo(() => {
    if (!includeTax) return 0
    return cartLines.reduce((acc, l) => {
      const rate = Number(l.product?.tax_rate || 0)
      if (!rate) return acc
      const lineNet = Number(l.price || 0) * Number(l.qty || 0)
      const lineTax = lineNet * (rate / 100)
      return acc + lineTax
    }, 0)
  }, [cartLines, includeTax])

  const grossTotal = useMemo(() => {
    return includeTax ? total + taxTotal : total
  }, [includeTax, taxTotal, total])

  const cartKey = useMemo(() => {
    if (!isRestaurant) return 'counter'
    if (saleChannel !== 'table') return 'counter'
    const t = String(tableNumber || '').trim()
    const s = String(seatNumber || '').trim()
    if (!t || !s) return 'counter'
    return `table:${t}:${s}`
  }, [isRestaurant, saleChannel, tableNumber, seatNumber])

  const selectedTable = useMemo(() => {
    const n = Number(String(tableNumber || '').trim())
    if (!Number.isFinite(n)) return null
    return (tables || []).find((t) => Number(t.number) === n) || null
  }, [tableNumber, tables])

  const selectedTableCapacity = useMemo(() => {
    const cap = Number(selectedTable?.capacity || 0)
    return Number.isFinite(cap) && cap > 0 ? cap : 0
  }, [selectedTable])

  const selectedTableOccupiedCount = useMemo(() => {
    const t = String(tableNumber || '').trim()
    const list = occupiedSeatsByTable?.[t] || []
    return (list || []).length
  }, [occupiedSeatsByTable, tableNumber])

  const selectedTableIsFull = useMemo(() => {
    if (!selectedTableCapacity) return false
    return selectedTableOccupiedCount >= selectedTableCapacity
  }, [selectedTableCapacity, selectedTableOccupiedCount])

  const occupiedSeatsForSelectedTable = useMemo(() => {
    const t = String(tableNumber || '').trim()
    const list = occupiedSeatsByTable?.[t] || []
    return new Set(list.map((x) => Number(x)))
  }, [occupiedSeatsByTable, tableNumber])

  const openRestaurantTabs = useMemo(() => {
    const keys = Object.keys(cartsByKey || {})
    const nonEmpty = keys.filter((k) => {
      const c = cartsByKey?.[k]
      return c && Object.keys(c).length
    })
    nonEmpty.sort()
    if (!nonEmpty.includes(cartKey)) nonEmpty.unshift(cartKey)
    return nonEmpty.slice(0, 12)
  }, [cartsByKey, cartKey])

  const paidNum = useMemo(() => {
    const n = Number(String(paid || '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [paid])

  const effectivePaidNum = useMemo(() => {
    if (paymentMethod === 'cash') return paidNum
    return grossTotal
  }, [paymentMethod, paidNum, grossTotal])

  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    return Math.max(0, effectivePaidNum - grossTotal)
  }, [paymentMethod, effectivePaidNum, grossTotal])

  const isTableOrder = useMemo(() => {
    return isRestaurant && saleChannel === 'table'
  }, [isRestaurant, saleChannel])

  async function loadCategories(bt = businessType) {
    try {
      const rows = await listProductCategories({ businessType: bt })
      setCategories(rows || [])
    } catch {
      setCategories([])
    }
  }

  async function loadProducts(query = q) {
    const products = await listProducts({ q: query, is_active: true, in_stock: true })
    setItems(products || [])
  }

  async function loadInitial() {
    setLoading(true)
    try {
      const [companies, b] = await Promise.all([listCompanies(), getMyBranch()])
      const c = companies?.[0] || null
      setCompany(c)
      setBranch(b)
      await loadCategories(b?.business_type || 'retail')
      await loadProducts('')
    } catch {
      toast.error('Não foi possível carregar o PDV agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      ;(async () => {
        try {
          await loadProducts(q)
        } catch {
          setItems([])
        }
      })()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    const query = String(q || '').trim()
    if (!query) return
    setActiveCategoryId('')
  }, [q])

  useEffect(() => {
    if (!isRestaurant) {
      setImageByProductId({})
      return
    }

    let cancelled = false

    async function loadImages() {
      const ids = (items || []).map((p) => p?.id).filter(Boolean)
      if (!ids.length) {
        setImageByProductId({})
        return
      }
      try {
        const pairs = await Promise.all(
          ids.map(async (id) => {
            try {
              const imgs = await listProductImages(id)
              const first = imgs?.[0]?.url || null
              return [id, first]
            } catch {
              return [id, null]
            }
          })
        )
        if (cancelled) return
        const next = {}
        for (const [id, url] of pairs) next[id] = url
        setImageByProductId(next)
      } catch {
        if (!cancelled) setImageByProductId({})
      }
    }

    loadImages()
    return () => {
      cancelled = true
    }
  }, [isRestaurant, items])

  useEffect(() => {
    if (!isRestaurant) return
    let mounted = true
    ;(async () => {
      try {
        const rows = await listRestaurantTables()
        if (mounted) setTables((rows || []).filter((t) => t.is_active !== false))
      } catch {
        if (mounted) setTables([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [isRestaurant])

  useEffect(() => {
    if (!isRestaurant) return
    let mounted = true

    async function loadOccupied() {
      try {
        const open = await listOrders({ status: 'open', limit: 200, offset: 0 })
        const inProgress = await listOrders({ status: 'in_progress', limit: 200, offset: 0 })
        const combined = [...(open || []), ...(inProgress || [])]
        const map = {}
        for (const o of combined) {
          const t = String(o.table_number)
          const s = Number(o.seat_number)
          if (!map[t]) map[t] = []
          if (!map[t].includes(s)) map[t].push(s)
        }
        if (mounted) setOccupiedSeatsByTable(map)
      } catch {
        if (mounted) setOccupiedSeatsByTable({})
      }
    }

    loadOccupied()
    const id = window.setInterval(loadOccupied, 5000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [isRestaurant])

  useEffect(() => {
    if (!isRestaurant) return
    if (saleChannel !== 'table') return
    if (!tableNumber) return
    setOpenSeatModal(true)
  }, [isRestaurant, saleChannel, tableNumber])

  useEffect(() => {
    if (!isRestaurant) return

    setCartsByKey((prev) => ({ ...(prev || {}), [cartKey]: cart }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart])

  useEffect(() => {
    if (!isRestaurant) return

    const next = cartsByKey?.[cartKey] || {}
    setCart(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey])

  useEffect(() => {
    if (paymentMethod !== 'cash') {
      setPaid(grossTotal ? Number(grossTotal).toFixed(2) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, grossTotal])

  function addToCart(p) {
    setCart((prev) => {
      const next = { ...(prev || {}) }
      const cur = Number(next[p.id] || 0)
      next[p.id] = cur + 1
      return next
    })
  }

  function setQty(productId, qty) {
    setCart((prev) => {
      const next = { ...(prev || {}) }
      const qn = Number(qty || 0)
      if (!qn) {
        delete next[productId]
      } else {
        next[productId] = qn
      }
      return next
    })
  }

  function clearCart() {
    if (isRestaurant) {
      setCartsByKey((prev) => ({ ...(prev || {}), [cartKey]: {} }))
    }
    setCart({})
    setPaid('')
    setPaymentMethod('cash')
    setActiveQuote(null)
  }

  async function loadQuotes() {
    setQuotesLoading(true)
    try {
      const rows = await listQuotes({ limit: 50, offset: 0 })
      setQuotes(rows || [])
    } catch {
      setQuotes([])
      toast.error('Não foi possível carregar cotações agora.')
    } finally {
      setQuotesLoading(false)
    }
  }

  async function onSaveQuote() {
    if (!cartLines.length) {
      toast.error('Adicione produtos ao carrinho.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        series: String(quoteSeries || 'A').trim().toUpperCase() || 'A',
        customer_name: quoteCustomerName.trim() || null,
        customer_nuit: quoteCustomerNuit.trim() || null,
        currency: 'MZN',
        items: cartLines.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.name,
          qty: l.qty,
          unit_price: Number(l.price || 0),
        })),
      }

      const qres = activeQuote?.id
        ? await updateQuote(Number(activeQuote.id), payload)
        : await createQuote(payload)
      toast.success(activeQuote?.id ? `Cotação atualizada: ${qres.series}/${qres.number}` : `Cotação salva: ${qres.series}/${qres.number}`)
      setOpenSaveQuote(false)
      clearCart()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível salvar a cotação agora.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function onConvertQuoteToSaleAndIssueReceipt() {
    if (!activeQuote?.id) return
    setConvertingQuote(true)
    try {
      const paidValue = paymentMethod === 'cash' ? effectivePaidNum : grossTotal
      const conv = await convertQuoteToSale(Number(activeQuote.id), {
        payment_method: paymentMethod,
        paid: paidValue,
      })

      const saleId = conv?.sale_id
      if (!saleId) {
        toast.error('Falha ao converter cotação (sale_id vazio).')
        return
      }

      await issueFiscalDocumentFromSale({
        sale_id: Number(saleId),
        document_type: 'receipt',
        series: 'A',
        customer: activeQuote?.customer_name
          ? {
              name: activeQuote.customer_name,
              nuit: activeQuote.customer_nuit || null,
            }
          : null,
      })

      toast.success('Cotação convertida e recibo emitido.')
      setOpenConfirm(false)
      clearCart()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível converter/emitir agora.'
      toast.error(msg)
    } finally {
      setConvertingQuote(false)
    }
  }

  async function finalizeSale() {
    if (!cartLines.length) {
      toast.error('Adicione produtos ao carrinho.')
      return
    }

    setSaving(true)
    const normalizedChannel = isRestaurant && saleChannel === 'table' ? 'table' : 'counter'
    try {
      const tableNum = normalizedChannel === 'table' ? Number(tableNumber) : null
      const seatNum = normalizedChannel === 'table' ? Number(seatNumber) : null

      if (normalizedChannel === 'table' && (!Number.isFinite(tableNum) || !Number.isFinite(seatNum))) {
        toast.error('Informe a mesa e o cliente/assento.')
        return
      }

      if (isRestaurant && normalizedChannel === 'table') {
        await createOrder({
          table_number: tableNum,
          seat_number: seatNum,
          items: cartLines.map((l) => ({
            product_id: l.product.id,
            qty: l.qty,
            price_at_order: Number(l.product.price || 0),
            cost_at_order: Number(l.product.cost || 0),
          })),
        })
        toast.success('Pedido enviado com sucesso.')

        setTableNumber('')
        setSeatNumber('1')
      } else {
        await createSale({
          sale_channel: normalizedChannel,
          table_number: normalizedChannel === 'table' ? tableNum : null,
          seat_number: normalizedChannel === 'table' ? seatNum : null,
          payment_method: paymentMethod,
          include_tax: includeTax,
          paid: effectivePaidNum,
          items: cartLines.map((l) => ({
            product_id: l.product.id,
            qty: l.qty,
            price_at_sale: Number(l.product.price || 0),
            cost_at_sale: Number(l.product.cost || 0),
          })),
        })
        toast.success('Venda registrada com sucesso.')
      }
      setOpenConfirm(false)
      clearCart()
      setIncludeTax(true)
    } catch {
      toast.error(isRestaurant && normalizedChannel === 'table' ? 'Não foi possível processar o pedido agora.' : 'Não foi possível finalizar a venda agora.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="-m-6">
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] xl:items-start">
        <aside className="border-b border-slate-800 bg-slate-900 xl:border-b-0 xl:border-r">
          <div className="xl:sticky xl:top-0 xl:h-[calc(100vh-56px)] flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">Carrinho</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{company?.name || 'Empresa'} · {businessType}</div>
              </div>
              <button
                type="button"
                onClick={() => clearCart()}
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
              >
                Limpar
              </button>
            </div>

            <div className="flex flex-1 min-h-0 flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <div className="grid gap-2">
                  {cartLines.length ? (
                    cartLines.map((l) => (
                      <div key={l.product.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-100" title={l.product.name}>
                              {l.product.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {Number(l.price || 0).toFixed(2)} · {l.product.unit || 'un'}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-white">{Number(l.lineTotal || 0).toFixed(2)}</div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQty(l.product.id, Math.max(0, l.qty - 1))}
                              className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-100"
                            >
                              -
                            </button>
                            <input
                              value={String(l.qty)}
                              onChange={(e) => {
                                const n = Number(e.target.value)
                                setQty(l.product.id, Number.isFinite(n) ? n : l.qty)
                              }}
                              className="w-16 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                              inputMode="decimal"
                              type="text"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(l.product.id, l.qty + 1)}
                              className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-100"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setQty(l.product.id, 0)}
                            className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">Carrinho vazio</div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 bg-slate-950 p-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <div>Total</div>
                    <div className="font-semibold text-white">{Number(total || 0).toFixed(2)}</div>
                  </div>
                  {!isTableOrder ? (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-3">
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
                            disabled={paymentMethod !== 'cash'}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
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
                    </>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">
                      Pagamento será realizado na página <span className="font-semibold text-slate-200">Pedidos</span>.
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-end gap-3">
                  {!isTableOrder ? (
                    <button
                      type="button"
                      disabled={!cartLines.length || saving}
                      onClick={() => setOpenSaveQuote(true)}
                      className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Salvar cotação
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!cartLines.length || saving}
                    onClick={() => setOpenConfirm(true)}
                    className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Processando...' : isTableOrder ? 'Processar pedido' : activeQuote?.id ? 'Converter cotação' : 'Finalizar venda'}
                  </button>

              <div className="border-t border-slate-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-400">IVA</div>
                  <button
                    type="button"
                    onClick={() => setIncludeTax((v) => !v)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      includeTax
                        ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
                        : 'border-slate-800 bg-slate-950 text-slate-200'
                    }`}
                  >
                    {includeTax ? 'Com IVA' : 'Sem IVA'}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-300">Subtotal</div>
                  <div className="text-right text-slate-100 font-semibold">{Number(total || 0).toFixed(2)} MZN</div>
                  <div className="text-slate-300">IVA</div>
                  <div className="text-right text-slate-100 font-semibold">{Number(taxTotal || 0).toFixed(2)} MZN</div>
                  <div className="text-slate-300">Total</div>
                  <div className="text-right text-white text-lg font-semibold">{Number(grossTotal || 0).toFixed(2)} MZN</div>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="bg-slate-950 overflow-hidden xl:h-[calc(100vh-56px)] xl:flex xl:flex-col">
          <div className="border-b border-slate-800 bg-slate-900 px-4 py-3 xl:shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-white">{company?.name || 'Nome Empresa'}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-300">PDV</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setOpenQuotes(true)
                    await loadQuotes()
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white"
                >
                  Cotações
                </button>
              </div>

              <div className="relative w-full max-w-md">
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
                  placeholder="Buscar produto"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-10 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  type="text"
                />
              </div>
            </div>

            {isRestaurant ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSaleChannel('counter')}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                      saleChannel !== 'table'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    Balcão
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleChannel('table')}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                      saleChannel === 'table'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    Mesa
                  </button>

                  {saleChannel === 'table' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-48 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      >
                        <option value="">Selecionar mesa</option>
                        {(tables || []).map((t) => {
                          const occ = (occupiedSeatsByTable?.[String(t.number)] || []).length
                          const cap = Number(t.capacity || 0)
                          const full = cap > 0 && occ >= cap
                          const suffix = cap > 0 ? `· ${occ}/${cap}${full ? ' (Lotada)' : ''}` : ''
                          return (
                            <option key={t.id} value={String(t.number)}>
                              Mesa {t.number} {suffix}
                            </option>
                          )
                        })}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (!tableNumber) {
                            toast.error('Selecione a mesa primeiro.')
                            return
                          }
                          setOpenSeatModal(true)
                        }}
                        className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-100"
                      >
                        Cliente {seatNumber}
                      </button>

                      {tableNumber ? (
                        <div className={`text-xs ${selectedTableIsFull ? 'text-rose-300' : 'text-slate-400'}`}>
                          {selectedTableCapacity ? (
                            <>
                              Ocupação: <span className="font-semibold">{selectedTableOccupiedCount}/{selectedTableCapacity}</span>{' '}
                              {selectedTableIsFull ? '(Lotada)' : ''}
                            </>
                          ) : (
                            <>Ocupados: {selectedTableOccupiedCount}</>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  {openRestaurantTabs.map((k) => {
                    const active = k === cartKey
                    const label = k === 'counter' ? 'Balcão' : `Mesa ${k.split(':')[1]} · Cliente ${k.split(':')[2]}`
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (k === 'counter') {
                            setSaleChannel('counter')
                            return
                          }
                          const parts = k.split(':')
                          setSaleChannel('table')
                          setTableNumber(parts[1] || '')
                          setSeatNumber(parts[2] || '1')
                        }}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${
                          active
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
                        }`}
                        title={label}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategoryId('')}
                className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  !activeCategoryId
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
                }`}
              >
                Todas
              </button>
              {(categories || []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategoryId(String(c.id))}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                    activeCategoryId === String(c.id)
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 overflow-y-auto xl:flex-1 xl:min-h-0">
            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Carregando...</div>
            ) : filteredItems.length ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                {isRestaurant ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredItems.map((p) => {
                      const rawUrl = imageByProductId?.[p.id] || null
                      const url = rawUrl && rawUrl.startsWith('/') ? `${apiBaseUrl}${rawUrl}` : rawUrl
                      return (
                        <div
                          key={p.id}
                          onClick={() => addToCart(p)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') addToCart(p)
                          }}
                          className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left hover:border-brand-600 cursor-pointer"
                        >
                          <div className="relative aspect-[4/3] w-full bg-slate-900">
                            {url ? (
                              <img src={url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Sem imagem</div>
                            )}
                            <div className="absolute right-2 top-2 rounded-xl bg-brand-600/90 px-2.5 py-1 text-xs font-semibold text-white">
                              {Number(p.price || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="truncate text-sm font-semibold text-slate-100" title={p.name}>
                              {p.name}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <div className="text-xs text-slate-400">Clique para adicionar</div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetails(p)
                                }}
                                className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100"
                              >
                                Detalhes
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filteredItems.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') addToCart(p)
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-left hover:border-brand-600 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100" title={p.name}>
                            {p.name}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="text-xs text-slate-400">Clique para adicionar</div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDetails(p)
                              }}
                              className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100"
                            >
                              Detalhes
                            </button>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <div className="rounded-lg bg-brand-600/90 px-2.5 py-1 text-xs font-semibold text-white">
                            {Number(p.price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Nenhum produto encontrado.</div>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={openConfirm}
        title={isTableOrder ? 'Confirmar pedido' : activeQuote?.id ? 'Converter cotação' : 'Confirmar venda'}
        onClose={() => {
          if (!saving && !convertingQuote) setOpenConfirm(false)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Total: <span className="font-semibold text-white">{Number(grossTotal || 0).toFixed(2)} MZN</span>
          </div>
          <div className="text-xs text-slate-400">
            {isTableOrder
              ? 'Ao confirmar, o pedido será enviado e aparecerá na página Pedidos.'
              : activeQuote?.id
                ? 'Ao confirmar, a cotação será convertida em venda e será emitido um recibo.'
                : 'Ao confirmar, a venda será registrada e aparecerá no Dashboard.'}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving || convertingQuote}
              onClick={() => setOpenConfirm(false)}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving || convertingQuote}
              onClick={() => {
                if (activeQuote?.id) return onConvertQuoteToSaleAndIssueReceipt()
                return finalizeSale()
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving || convertingQuote ? 'Processando...' : isTableOrder ? 'Processar pedido' : activeQuote?.id ? 'Converter e emitir recibo' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openProductDetails}
        title="Detalhes do produto"
        onClose={() => {
          setOpenProductDetails(false)
          setActiveProduct(null)
        }}
      >
        <div className="grid gap-3">
          <div className="text-sm text-slate-200">
            Produto: <span className="font-semibold text-white">{activeProduct?.name || '-'}</span>
          </div>
          <div className="text-sm text-slate-200">
            Preço: <span className="font-semibold text-white">{Number(activeProduct?.price || 0).toFixed(2)} MZN</span>
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-100">Descrição</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 whitespace-pre-wrap">
              {String(activeProduct?.description || '').trim() ? activeProduct.description : 'Sem descrição.'}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenProductDetails(false)
                setActiveProduct(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeProduct) addToCart(activeProduct)
                setOpenProductDetails(false)
                setActiveProduct(null)
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Adicionar
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={openSaveQuote} title="Salvar cotação" onClose={() => (saving ? null : setOpenSaveQuote(false))}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSaveQuote()
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Série</div>
              <input
                value={quoteSeries}
                onChange={(e) => setQuoteSeries(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">NUIT (opcional)</div>
              <input
                value={quoteCustomerNuit}
                onChange={(e) => setQuoteCustomerNuit(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>
          </div>
          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Cliente (opcional)</div>
            <input
              value={quoteCustomerName}
              onChange={(e) => setQuoteCustomerName(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenSaveQuote(false)}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openQuotes} title="Cotações" onClose={() => setOpenQuotes(false)}>
        <div className="grid gap-3">
          {quotesLoading ? (
            <div className="text-sm text-slate-300">Carregando...</div>
          ) : quotes?.length ? (
            quotes.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const nextCart = {}
                      for (const it of q.items || []) {
                        if (!it.product_id) continue
                        nextCart[String(it.product_id)] = Number(it.qty || 0)
                      }
                      setCart(nextCart)
                      setActiveQuote(q)
                      setQuoteSeries(q.series || 'A')
                      setQuoteCustomerName(q.customer_name || '')
                      setQuoteCustomerNuit(q.customer_nuit || '')
                      setOpenQuotes(false)
                      toast.success(`Cotação carregada: ${q.series}/${q.number}`)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{q.series}/{q.number}</div>
                      <div className="text-xs text-slate-400">{q.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Cliente: {q.customer_name || '-'} {q.customer_nuit ? `· NUIT: ${q.customer_nuit}` : ''}
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      Total: {Number(q.gross_total || 0).toFixed(2)} {q.currency || ''}
                    </div>
                  </button>

                  {q.status === 'open' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Eliminar a cotação ${q.series}/${q.number}?`)) return
                        try {
                          await deleteQuote(Number(q.id))
                          toast.success('Cotação eliminada.')
                          await loadQuotes()
                        } catch (err) {
                          const msg = err?.response?.data?.detail || 'Não foi possível eliminar agora.'
                          toast.error(msg)
                        }
                      }}
                      className="shrink-0 rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-300">Sem cotações.</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                loadQuotes()
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setOpenQuotes(false)}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openSeatModal}
        title={tableNumber ? `Mesa ${tableNumber} · Selecionar cliente` : 'Selecionar cliente'}
        onClose={() => setOpenSeatModal(false)}
      >
        {!tableNumber ? (
          <div className="text-sm text-slate-200">Selecione a mesa para escolher o cliente.</div>
        ) : !selectedTableCapacity ? (
          <div className="text-sm text-slate-200">Capacidade da mesa não definida.</div>
        ) : (
          <div className="grid gap-4">
            <div className="text-xs text-slate-400">
              Capacidade: <span className="font-semibold text-slate-200">{selectedTableCapacity}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: selectedTableCapacity }).map((_, idx) => {
                const n = idx + 1
                const occupied = occupiedSeatsForSelectedTable.has(n) && String(seatNumber) !== String(n)
                const isCurrent = String(seatNumber) === String(n)
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={occupied}
                    onClick={() => {
                      setSeatNumber(String(n))
                      setOpenSeatModal(false)
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      occupied
                        ? 'border-rose-900/60 bg-rose-950/30 text-rose-200'
                        : isCurrent
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {occupied ? `Ocupado ${n}` : isCurrent ? `Cliente ${n} (Você)` : `Cliente ${n}`}
                  </button>
                )
              })}
            </div>

            {selectedTableIsFull ? (
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-sm text-rose-200">
                Mesa lotada. Selecione outra mesa.
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenSeatModal(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
