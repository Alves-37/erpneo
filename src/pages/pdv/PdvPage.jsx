import { useEffect, useMemo, useRef, useState } from 'react'

import { listCompanies } from '../../api/companies.js'
import { getMyBranch } from '../../api/branches.js'
import { issueFiscalDocumentFromSale } from '../../api/fiscalDocuments.js'
import { listOrders, updateOrder } from '../../api/orders.js'
import { listProductCategories } from '../../api/productCategories.js'
import { listProductImages, listProducts } from '../../api/products.js'
import { createOrder } from '../../api/orders.js'
import { listRestaurantTables } from '../../api/restaurantTables.js'
import { createSale } from '../../api/sales.js'
import { createDebt } from '../../api/debts.js'
import { convertQuoteToSale, createQuote, deleteQuote, listQuotes, updateQuote } from '../../api/quotes.js'
import { closeCashSession, getCurrentCashSession, getCashSessionSummary, openCashSession } from '../../api/cashSessions.js'
import { thermalPrinter } from '../../utils/thermalPrinter.js'
import { printOrderReceipt } from '../../services/qzService.js'
import { createCustomer, listCustomers } from '../../api/customers.js'
import { downloadQuotePdf } from '../../api/quotes.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'
import { makeProductsCacheKey, useProductStore } from '../../store/productStore.js'

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

function parseDecimal(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return NaN
  const normalized = raw.replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

export default function PdvPage() {
  useEffect(() => {
  }, [])

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neoerp-production.up.railway.app'

  const me = useAuthStore((s) => s.me)
  const setBranchGlobal = useAuthStore((s) => s.setBranch)
  const bumpContext = useAuthStore((s) => s.bumpContext)
  const contextVersion = useAuthStore((s) => s.contextVersion)
  const establishment = useAuthStore((s) => s.establishment)
  const branchGlobal = useAuthStore((s) => s.branch)
  const token = useAuthStore((s) => s.token)

  const productCache = useProductStore((s) => s.cache)
  const setProductCache = useProductStore((s) => s.setCache)

  const [company, setCompany] = useState(null)
  const [companies, setCompanies] = useState([])
  const [branch, setBranch] = useState(branchGlobal || null)
  const businessType = branch?.business_type || 'retail'
  const isRestaurant = businessType === 'restaurant'
  const isPharmacy = businessType === 'pharmacy'

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')

  const scanBufferRef = useRef('')
  const scanLastAtRef = useRef(0)

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
  const [seatProduct, setSeatProduct] = useState(null)

  const [openPrintConfirm, setOpenPrintConfirm] = useState(false)
  const [printConfirmType, setPrintConfirmType] = useState('') // 'venda', 'pedido', 'divida'
  const [printConfirmCallback, setPrintConfirmCallback] = useState(null)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [discount, setDiscount] = useState('')
  const [saving, setSaving] = useState(false)

  const [debtCustomerId, setDebtCustomerId] = useState('')
  const [debtCustomerName, setDebtCustomerName] = useState('')
  const [debtCustomerNuit, setDebtCustomerNuit] = useState('')

  const [cashSession, setCashSession] = useState(null)
  const [cashLoading, setCashLoading] = useState(false)
  const [openCashOpen, setOpenCashOpen] = useState(false)
  const [cashOpeningBalance, setCashOpeningBalance] = useState('')
  const [openCashClose, setOpenCashClose] = useState(false)
  const [cashClosingCounted, setCashClosingCounted] = useState('')
  const [cashClosingNotes, setCashClosingNotes] = useState('')
  const [cashSummary, setCashSummary] = useState(null)

  const [includeTax, setIncludeTax] = useState(true)

  // Estado para modal de produtos vendidos por peso
  const [weightProduct, setWeightProduct] = useState(null)
  const [weightInput, setWeightInput] = useState('')
  const [valueInput, setValueInput] = useState('')

  const [openConfirm, setOpenConfirm] = useState(false)

  const [openProductDetails, setOpenProductDetails] = useState(false)
  const [activeProduct, setActiveProduct] = useState(null)

  const [openCartModal, setOpenCartModal] = useState(false)

  const [openQuotes, setOpenQuotes] = useState(false)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotes, setQuotes] = useState([])

  const [openQuoteDelete, setOpenQuoteDelete] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState(null)
  const [deletingQuote, setDeletingQuote] = useState(false)

  const [activeQuote, setActiveQuote] = useState(null)
  const [openSaveQuote, setOpenSaveQuote] = useState(false)
  const [quoteSeries, setQuoteSeries] = useState('A')
  const [quoteCustomerName, setQuoteCustomerName] = useState('')
  const [quoteCustomerNuit, setQuoteCustomerNuit] = useState('')

  const [customersLoading, setCustomersLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  const userLabel = useMemo(() => {
    const username = String(me?.username || '').trim()
    if (username) return username
    const nm = String(me?.name || '').trim()
    if (!nm) return 'Usuário'
    return nm.split(' ')[0]
  }, [me])

  async function confirmDeleteQuote() {
    if (!quoteToDelete?.id) return
    setDeletingQuote(true)
    try {
      await deleteQuote(Number(quoteToDelete.id))
      toast.success('Cotação eliminada.')
      setOpenQuoteDelete(false)
      setQuoteToDelete(null)
      await loadQuotes()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível eliminar agora.'
      toast.error(msg)
    } finally {
      setDeletingQuote(false)
    }
  }

  async function loadCustomers(query = '') {
    setCustomersLoading(true)
    try {
      const rows = await listCustomers({ q: String(query || '').trim() || undefined, limit: 80, offset: 0 })
      setCustomers(rows || [])
    } catch {
      setCustomers([])
    } finally {
      setCustomersLoading(false)
    }
  }

  async function ensureCustomerForQuote({ name, nuit }) {
    const nName = String(name || '').trim()
    const nNuit = String(nuit || '').trim()

    if (!nName && !nNuit) return null

    try {
      const q = nName || nNuit
      const rows = await listCustomers({ q, limit: 80, offset: 0 })
      const exact = (rows || []).find((c) => {
        const cn = String(c?.name || '').trim().toLowerCase()
        const nn = String(c?.nuit || '').trim().toLowerCase()
        if (nNuit && nn && nn === nNuit.toLowerCase()) return true
        if (nName && cn && cn === nName.toLowerCase()) return true
        return false
      })
      if (exact?.id) return exact
    } catch {
      // ignore
    }

    try {
      if (!nName) return null
      const created = await createCustomer({ name: nName, nuit: nNuit || null })
      return created || null
    } catch {
      return null
    }
  }

  const [convertingQuote, setConvertingQuote] = useState(false)

  useEffect(() => {
    if (!openSaveQuote) return
    setCustomerQuery('')
    setSelectedCustomerId('')
    loadCustomers('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSaveQuote])

  useEffect(() => {
    if (!openSaveQuote) return
    const t = setTimeout(() => {
      loadCustomers(customerQuery)
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerQuery, openSaveQuote])

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

    // Filtro por categoria
    if (activeCategoryId) {
      out = out.filter((p) => String(p.category_id) === activeCategoryId)
    }

    if (query) {
      out = out.filter((p) => {
        const name = String(p.name || '').toLowerCase()
        const sku = String(p.sku || '').toLowerCase()
        const barcode = String(p.barcode || '').toLowerCase()
        return name.includes(query) || sku.includes(query) || barcode.includes(query)
      })
    }

    // Filtro de estoque para todos os tipos de negócio
    out = out.filter((p) => {
      const sku = String(p?.sku || '').trim().toUpperCase()
      if (sku === 'SERVICO_IMPRESSAO') return false

      const isService = Boolean(p?.is_service)
      const trackStock = Boolean(p?.track_stock)
      
      // Se não controla estoque ou é serviço, sempre mostra
      if (!trackStock || isService) return true

      // Se controla estoque, verifica quantidade
      const stockQty = Number(p?.stock_qty ?? 0)
      if (!Number.isFinite(stockQty)) return true
      return stockQty > 0
    })

    return out
  }, [items, activeCategoryId, q, isRestaurant])

  const cartKey = useMemo(() => {
    if (!isRestaurant) return 'counter'
    if (saleChannel !== 'table') return 'counter'
    const t = String(tableNumber || '').trim()
    const s = String(seatNumber || '').trim()
    if (!t || !s) return 'counter'
    return `table:${t}:${s}`
  }, [isRestaurant, saleChannel, tableNumber, seatNumber])

  const cartLines = useMemo(() => {
    const lines = []
    const currentCartData = cartsByKey?.[cartKey] || cart || {}
    
    for (const [id, data] of Object.entries(currentCartData)) {
      const pid = Number(id)
      // data can be a number (qty) or an object {qty, order_id}
      const qn = typeof data === 'object' ? Number(data.qty || 0) : Number(data || 0)
      const orderId = typeof data === 'object' ? data.order_id : null
      
      if (!qn) continue
      const p = productById.get(pid)
      
      if (p) {
        const price = Number(p.price || 0)
        const lineTotal = price * qn
        lines.push({ product: p, qty: qn, price, lineTotal, order_id: orderId })
      } else {
        const basicProduct = {
          id: pid,
          name: `Produto #${pid}`,
          price: 0,
        }
        lines.push({ product: basicProduct, qty: qn, price: 0, lineTotal: 0, order_id: orderId })
      }
    }
    
    lines.sort((a, b) => b.product.id - a.product.id)
    return lines
  }, [cart, productById, cartsByKey, cartKey])

  const cartItemsCount = useMemo(() => {
    return cartLines.reduce((acc, l) => acc + Number(l.qty || 0), 0)
  }, [cartLines])

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

  const discountNum = useMemo(() => {
    const n = Number(String(discount || '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [discount])

  const appliedDiscount = useMemo(() => {
    const d = Math.max(0, discountNum)
    return Math.min(d, Math.max(0, grossTotal))
  }, [discountNum, grossTotal])

  const finalTotal = useMemo(() => {
    return Math.max(0, grossTotal - appliedDiscount)
  }, [grossTotal, appliedDiscount])


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
    if (paymentMethod === 'debt') return 0
    return finalTotal
  }, [paymentMethod, paidNum, finalTotal])

  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    return Math.max(0, effectivePaidNum - finalTotal)
  }, [paymentMethod, effectivePaidNum, finalTotal])

  const isTableOrder = useMemo(() => {
    return isRestaurant && saleChannel === 'table'
  }, [isRestaurant, saleChannel])

  async function loadCategories(bt = businessType) {
    try {
      const rows = await listProductCategories()
      setCategories(rows || [])
    } catch {
      setCategories([])
    }
  }

  async function loadProducts(query = q, { force = false, branchId, businessType } = {}) {
    const role = (me?.role || '').toString().trim().toLowerCase()
    const isAdmin = role === 'admin' || role === 'owner'
    const currentBusinessType = businessType || branch?.business_type || 'retail'

    const cacheKey = makeProductsCacheKey({
      companyId: me?.company_id,
      branchId: branchId != null ? branchId : branch?.id,
      establishmentId: isAdmin ? establishment?.id : null,
      scope: 'pdv',
    })

    const cached = productCache?.[cacheKey]
    if (!force && cached?.items && cached?.query === String(query || '')) {
      setItems(cached.items || [])
      return
    }

    const pageSize = 500
    const all = []
    for (let offset = 0; offset < 20000; offset += pageSize) {
      const rows = await listProducts({
        q: query,
        limit: pageSize,
        offset,
        is_active: true,
        show_in_menu: currentBusinessType.trim().toLowerCase() === 'restaurant' ? true : undefined,
        in_stock: false,
        establishment_id: isAdmin ? (establishment?.id || undefined) : undefined,
      })
      const batch = Array.isArray(rows) ? rows : []
      all.push(...batch)
      if (batch.length < pageSize) break
    }
    
    const next = all
    setItems(next)
    setProductCache(cacheKey, { items: next, query: String(query || ''), savedAt: Date.now() })
  }

async function loadInitial() {
    setLoading(true)
    try {
      const [companies, b] = await Promise.all([listCompanies(), getMyBranch()])
      setCompanies(companies || [])
      setBranch(b)
      await loadCategories(b?.business_type || 'retail')
      await loadProducts('', { force: true, branchId: b?.id, businessType: b?.business_type })
    } catch {
      toast.error('Não foi possível carregar o PDV agora.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshCashSession() {
    if (!branch?.id) {
      setCashSession(null)
      return
    }
    if (isTableOrder) {
      setCashSession(null)
      setOpenCashOpen(false)
      return
    }
    try {
      setCashLoading(true)
      const row = await getCurrentCashSession()
      setCashSession(row || null)
      setOpenCashOpen(!row)
    } catch {
      setCashSession(null)
      setOpenCashOpen(true)
    } finally {
      setCashLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }

    const b = branchGlobal || branch
    if (b?.id) {
      const key = makeProductsCacheKey({
        companyId: me?.company_id,
        branchId: b.id,
        establishmentId: null,
        scope: 'pdv',
      })
      const cached = productCache?.[key]
      if (cached?.items) {
        loadCategories(b?.business_type || 'retail')
        setBranch(b)
        setItems(cached.items || [])
        setLoading(false)
        return
      }
    }

    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, contextVersion, branchGlobal?.id])

  useEffect(() => {
    refreshCashSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?.id, isTableOrder, contextVersion])

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
        // Carregar imagens em lotes para evitar sobrecarga e muitos erros de CORS simultâneos
        const batchSize = 5;
        const results = [];
        
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (id) => {
              try {
                const imgs = await listProductImages(id)
                const first = imgs?.[0]?.url || null
                return [id, first]
              } catch (err) {
                // Log silencioso para evitar poluição do console com erros de CORS/rede
                console.debug(`Erro ao carregar imagem para produto ${id}:`, err.message);
                return [id, null]
              }
            })
          )
          results.push(...batchResults);
        }

        if (cancelled) return
        const next = {}
        for (const [id, url] of results) next[id] = url
        setImageByProductId(next)
      } catch (err) {
        console.error("Erro crítico ao carregar imagens no PDV:", err);
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
    // modal is opened explicitly from UI interactions in mobile
  }, [isRestaurant, saleChannel, tableNumber])

  useEffect(() => {
    if (!isRestaurant) return

    setCartsByKey((prev) => ({ ...(prev || {}), [cartKey]: cart }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart])

  // 🛒 CARREGAR ITENS DO PEDIDO (VINDO DA PÁGINA DE PEDIDOS)
  useEffect(() => {
    const orderItems = sessionStorage.getItem('pdv_order_items')
    const orderInfo = sessionStorage.getItem('pdv_order_info')
    
    if (orderItems && orderInfo) {
      try {
        const info = JSON.parse(orderInfo)
        const items = JSON.parse(orderItems)
        
        // 1. Definir mesa e cliente primeiro
        if (info.table_number) {
          setTableNumber(String(info.table_number))
        }
        if (info.seat_number) {
          setSeatNumber(String(info.seat_number))
        }

        // 2. Mudar canal de venda IMEDIATAMENTE se houver mesa
        if (info.table_number || info.order_type === 'table') {
          setSaleChannel('table')
        }
        
        // 3. Delay para o React atualizar os estados acima e o cartKey mudar
        setTimeout(() => {
          const t = String(info.table_number || '').trim()
          const s = String(info.seat_number || '').trim()
          
          // LÓGICA DE KEY: Se tem mesa, o destino É uma mesa
          const isTable = info.order_type === 'table' || (t !== '')
          const targetKey = isTable ? `table:${t}:${s || '1'}` : 'counter'
          
          const newCartWithOrder = {}
          items.forEach(item => {
            newCartWithOrder[String(item.product_id)] = {
              qty: Number(item.quantity || item.qty || 1),
              order_id: info.order_id
            }
          })
          
          // Injeta no dicionário global usando o formato complexo
          setCartsByKey(prev => ({ ...prev, [targetKey]: newCartWithOrder }))
          
          // O cart local também deve refletir a mudança
          setCart(newCartWithOrder)
          
          // Limpa a sessão
          sessionStorage.removeItem('pdv_order_items')
          sessionStorage.removeItem('pdv_order_info')
          
          toast.success(`Pedido #${info.order_id} carregado na Mesa ${info.table_number}`)
        }, 1500)

      } catch (error) {
        console.error('Falha na carga do pedido:', error)
      }
    }
  }, [productCache])

  useEffect(() => {
    if (!isRestaurant) return

    const next = cartsByKey?.[cartKey] || {}
    setCart(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey])

  useEffect(() => {
    if (paymentMethod === 'debt') {
      setPaid('')
      // Load customers list on-demand for debt flow.
      if (!(customers || []).length) {
        loadCustomers(customerQuery || '')
      }
      return
    }
    if (paymentMethod !== 'cash') {
      setPaid(finalTotal ? Number(finalTotal).toFixed(2) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, finalTotal])

  function addToCart(p) {
    // Se produto é vendido por peso OU tem unidade kg, abrir modal para inserir peso
    if (p.sold_by_weight || (p.unit && p.unit.toLowerCase() === 'kg')) {
      setWeightProduct(p)
      setWeightInput('')
      setValueInput('')
      return
    }
    
    // 🔍 RECUPERAR order_id EXISTENTE NO CARRINHO
    const existingOrderId = cartLines.find(l => l.order_id)?.order_id

    setCart((prev) => {
      const next = { ...(prev || {}) }
      const currentEntry = next[p.id]
      
      if (typeof currentEntry === 'object') {
        next[p.id] = { ...currentEntry, qty: (currentEntry.qty || 0) + 1 }
      } else {
        const curQty = Number(currentEntry || 0)
        if (existingOrderId) {
          next[p.id] = { qty: curQty + 1, order_id: existingOrderId }
        } else {
          next[p.id] = curQty + 1
        }
      }
      return next
    })
  }

  // Funções para cálculo bidirecional
  function handleWeightChange(weight) {
    setWeightInput(weight)
    if (weightProduct && weight) {
      const w = parseDecimal(weight)
      if (Number.isFinite(w) && w > 0) {
        const value = w * Number(weightProduct.price || 0)
        setValueInput(value.toFixed(2))
      } else {
        setValueInput('')
      }
    } else {
      setValueInput('')
    }
  }

  function handleValueChange(value) {
    setValueInput(value)
    if (weightProduct && value) {
      const v = parseDecimal(value)
      const price = Number(weightProduct.price || 0)
      if (Number.isFinite(v) && v > 0 && price > 0) {
        const weight = v / price
        setWeightInput(weight.toFixed(3))
      } else {
        setWeightInput('')
      }
    } else {
      setWeightInput('')
    }
  }

  function addWeightToCart() {
    if (!weightProduct || !weightInput) return
    
    const weight = parseDecimal(weightInput)
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error('Peso inválido')
      return
    }
    
    setCart((prev) => {
      const next = { ...(prev || {}) }
      const cur = Number(next[weightProduct.id] || 0)
      next[weightProduct.id] = cur + weight
      return next
    })
    
    setWeightProduct(null)
    setWeightInput('')
    setValueInput('')
    toast.success(`${weightProduct.name} adicionado: ${weight} kg`)
  }

  function findProductByCode(codeRaw) {
    const code = String(codeRaw || '').trim()
    if (!code) return null
    const lower = code.toLowerCase()
    for (const p of items || []) {
      const bc = String(p?.barcode || '').trim()
      if (bc && bc === code) return p
      const sku = String(p?.sku || '').trim()
      if (sku && sku.toLowerCase() === lower) return p
    }
    return null
  }

  useEffect(() => {
    if (!isPharmacy) return

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Shift' || e.key === 'CapsLock' || e.key === 'Tab') return

      const tag = String(e.target?.tagName || '').toLowerCase()
      const isTypingField = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
      if (isTypingField) return

      const now = Date.now()
      const gap = now - (scanLastAtRef.current || 0)

      if (e.key === 'Enter') {
        const code = String(scanBufferRef.current || '').trim()
        if (code) {
          const p = findProductByCode(code)
          if (p) {
            addToCart(p)
          } else {
            toast.error('Produto não encontrado para o código lido.')
          }
        }
        scanBufferRef.current = ''
        scanLastAtRef.current = now
        return
      }

      if (e.key.length === 1) {
        const next = gap > 120 ? e.key : `${scanBufferRef.current || ''}${e.key}`
        scanBufferRef.current = next
        scanLastAtRef.current = now
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPharmacy, items])

  function setQty(productId, qty) {
    // 🔍 RECUPERAR order_id EXISTENTE NO CARRINHO
    const existingOrderId = cartLines.find(l => l.order_id)?.order_id

    setCart((prev) => {
      const next = { ...(prev || {}) }
      const qn = typeof qty === 'number' ? qty : parseDecimal(qty)
      
      if (!Number.isFinite(qn) || qn <= 0) {
        delete next[productId]
        return next
      }

      const currentEntry = next[productId]
      if (typeof currentEntry === 'object') {
        next[productId] = { ...currentEntry, qty: qn }
      } else {
        if (existingOrderId) {
          next[productId] = { qty: qn, order_id: existingOrderId }
        } else {
          next[productId] = qn
        }
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
    setDiscount('')
    setDebtCustomerId('')
    setDebtCustomerName('')
    setDebtCustomerNuit('')
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
      let customerName = quoteCustomerName.trim() || null
      let customerNuit = quoteCustomerNuit.trim() || null

      if (!selectedCustomerId && (customerName || customerNuit)) {
        const ensured = await ensureCustomerForQuote({ name: customerName, nuit: customerNuit })
        if (ensured?.id) {
          customerName = String(ensured?.name || customerName || '').trim() || null
          customerNuit = String(ensured?.nuit || customerNuit || '').trim() || null
          setSelectedCustomerId(String(ensured.id))
        }
      }

      const payload = {
        series: String(quoteSeries || 'A').trim().toUpperCase() || 'A',
        customer_name: customerName,
        customer_nuit: customerNuit,
        currency: 'MZN',
        include_tax: includeTax,
        discount_value: Number(discount || 0),
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
      const paidValue = paymentMethod === 'cash' ? effectivePaidNum : finalTotal
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

      // 🛒 VERIFICAR SE HÁ UM PEDIDO EXISTENTE ASSOCIADO
      const firstCartItem = cartLines[0]
      const existingOrderId = firstCartItem?.order_id

      if (isRestaurant && normalizedChannel === 'table') {
        if (existingOrderId) {
          // 🔄 ATUALIZAR PEDIDO EXISTENTE em vez de criar novo
          console.log('🔄 Atualizando pedido existente:', existingOrderId)
          
          await updateOrder(existingOrderId, {
            table_number: tableNum,
            seat_number: seatNum,
            items: cartLines.map((l) => ({
              product_id: l.product.id,
              qty: l.qty,
              price_at_order: Number(l.product.price || 0),
              cost_at_order: Number(l.product.cost || 0),
            })),
          })
          
          toast.success('Pedido atualizado com sucesso!')
          
          // Perguntar se deseja imprimir o comprovante do pedido atualizado (Cozinha)
          setTimeout(async () => {
            try {
              const orderData = {
                id: existingOrderId,
                table_number: tableNum,
                seat_number: seatNum,
                items: cartLines.map(l => ({
                  product_id: l.product.id,
                  product_name: l.product.name,
                  qty: l.qty,
                  price_at_order: Number(l.product.price || 0)
                }))
              };
              await printOrderReceipt(orderData, branch);
              toast.success('Comprovante enviado para a impressora.');
            } catch (err) {
              console.error('Erro na impressão direta:', err);
              // Fallback para o comportamento original se a impressão direta falhar
              showPrintConfirm('pedido', () => printReceiptAfterSale({
                table_number: tableNum,
                seat_number: seatNum,
                items: cartLines.map(l => ({
                  product_id: l.product.id,
                  product_name: l.product.name,
                  qty: l.qty,
                  notes: l.notes || ''
                })),
                order_id: existingOrderId
              }))
            }
          }, 500)
          
          // 🔄 Limpar carrinho após atualizar pedido
          clearCart()
          
        } else {
          // 🆕 CRIAR NOVO PEDIDO (comportamento original)
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
          toast.success('Pedido criado com sucesso.')
          
          // Perguntar se deseja imprimir o comprovante do pedido (Cozinha)
          setTimeout(async () => {
            try {
              const orderData = {
                table_number: tableNum,
                seat_number: seatNum,
                items: cartLines.map(l => ({
                  product_id: l.product.id,
                  product_name: l.product.name,
                  qty: l.qty,
                  price_at_order: Number(l.product.price || 0)
                }))
              };
              await printOrderReceipt(orderData, branch);
              toast.success('Comprovante enviado para a impressora.');
            } catch (err) {
              console.error('Erro na impressão direta:', err);
              showPrintConfirm('pedido', () => printReceiptAfterSale({
                table_number: tableNum,
                seat_number: seatNum,
                items: cartLines.map(l => ({
                  product_id: l.product.id,
                  product_name: l.product.name,
                  qty: l.qty,
                  notes: l.notes || ''
                }))
              }))
            }
          }, 500)
        }

        setTableNumber('')
        setSeatNumber('1')
      } else {
        if (paymentMethod === 'debt') {
          const hasDebtCustomer = Boolean(String(debtCustomerId || '').trim()) || Boolean(String(debtCustomerName || '').trim())
          if (!hasDebtCustomer) {
            toast.error('Selecione o cliente para registrar a dívida.')
            return
          }
          await createDebt({
            customer_id: debtCustomerId ? Number(debtCustomerId) : null,
            customer_name: debtCustomerId ? null : String(debtCustomerName || '').trim() || null,
            customer_nuit: debtCustomerId ? null : String(debtCustomerNuit || '').trim() || null,
            include_tax: includeTax,
            items: cartLines.map((l) => ({
              product_id: l.product.id,
              qty: l.qty,
              price_at_debt: Number(l.product.price || 0),
              cost_at_debt: Number(l.product.cost || 0),
            })),
          })
          toast.success('Dívida registrada com sucesso.')
          
          // Perguntar se deseja imprimir o comprovante da dívida
          setTimeout(() => {
            showPrintConfirm('divida', printReceiptAfterSale)
          }, 500)
        } else {
          await createSale({
            sale_channel: normalizedChannel,
            table_number: normalizedChannel === 'table' ? tableNum : null,
            seat_number: normalizedChannel === 'table' ? seatNum : null,
            payment_method: paymentMethod,
            include_tax: includeTax,
            discount_value: Number(discount || 0),
            paid: effectivePaidNum,
            items: cartLines.map((l) => ({
              product_id: l.product.id,
              qty: l.qty,
              price_at_sale: Number(l.product.price || 0),
              cost_at_sale: Number(l.product.cost || 0),
            })),
          })
          toast.success('Venda registrada com sucesso.')
          
          // Perguntar se deseja imprimir o recibo
          setTimeout(() => {
            showPrintConfirm('venda', printReceiptAfterSale)
          }, 500)
        }
      }
      setOpenConfirm(false)
      clearCart()
      setIncludeTax(true)
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.detail
      if (status === 409 && String(msg || '').toLowerCase().includes('caixa')) {
        setOpenConfirm(false)
        await refreshCashSession()
        setOpenCashOpen(true)
        toast.error('Caixa fechado. Abra o caixa para registrar vendas.')
        return
      }
      toast.error(isRestaurant && normalizedChannel === 'table' ? 'Não foi possível processar o pedido agora.' : 'Não foi possível finalizar a venda agora.')
    } finally {
      setSaving(false)
    }
  }

  // Função para mostrar modal de confirmação de impressão
  function showPrintConfirm(type, callback) {
    setPrintConfirmType(type)
    setPrintConfirmCallback(() => callback)
    setOpenPrintConfirm(true)
  }

  // Função para imprimir recibo após venda no PDV
  async function printReceiptAfterSale(directData = null) {
    try {
      const orderToPrint = directData || {
        id: 'REC-' + Date.now(),
        table_number: tableNumber,
        seat_number: seatNumber,
        items: cartLines.map(line => ({
          product_id: line.product.id,
          product_name: line.product.name,
          qty: line.qty,
          price_at_order: Number(line.product.price || 0)
        }))
      };

      await printOrderReceipt(orderToPrint, branch);
      toast.success('Comprovante enviado para a impressora!');
    } catch (error) {
      console.error('Erro na impressão QZ Tray:', error);
      
      // Fallback para o método antigo se o QZ Tray estiver offline
      if (error.message === 'QZ_OFFLINE') {
        toast.info('QZ Tray não detectado. Abra o software para impressão direta.', { duration: 5000 });
        
        const orderData = {
          order: {
            table_number: directData?.table_number || tableNumber,
            seat_number: directData?.seat_number || seatNumber,
          },
          items: directData?.items || cartLines.map(line => ({
            product_id: line.product.id,
            product_name: line.product.name,
            qty: line.qty,
            notes: line.notes || ''
          })),
          company: { name: companies?.[0]?.name || 'ERPCRM' }
        };
        await thermalPrinter.printKitchenTicket(orderData);
      } else {
        toast.error(`Falha na impressão: ${error.message}`);
      }
    }
  }

  return (
    <div className="-m-6">
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] xl:items-start">
        <section className="bg-slate-950 overflow-hidden h-[calc(100vh-56px)] flex flex-col xl:order-2 xl:h-[calc(100vh-56px)]">
          <div className="border-b border-slate-800 bg-slate-900 px-4 pt-5 pb-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-white truncate">{userLabel}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-300">PDV</div>
              </div>

              <div className="flex items-center gap-2">
                {!isTableOrder ? (
                  <button
                    type="button"
                    disabled={cashLoading}
                    onClick={async () => {
                      await refreshCashSession()
                      if (cashSession?.id) {
                        try {
                          const s = await getCashSessionSummary(Number(cashSession.id))
                          setCashSummary(s || null)
                        } catch {
                          setCashSummary(null)
                        }
                        setCashClosingCounted('')
                        setCashClosingNotes('')
                        setOpenCashClose(true)
                      } else {
                        setOpenCashOpen(true)
                      }
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border ${cashSession?.id ? 'border-emerald-900/60 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-200' : 'border-amber-900/60 bg-amber-950/30 hover:bg-amber-950/50 text-amber-200'} px-3 py-2 text-white disabled:opacity-60`}
                    title={cashSession?.id ? 'Caixa aberto' : 'Caixa fechado'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mb-0.5" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[10px] font-bold leading-none uppercase tracking-tighter">
                      {cashSession?.id ? 'Caixa' : 'Abrir'}
                    </span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={async () => {
                    setOpenQuotes(true)
                    await loadQuotes()
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-white"
                  title="Cotações"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mb-0.5" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[10px] font-bold leading-none uppercase tracking-tighter">Cotações</span>
                </button>

                {!isTableOrder ? (
                  <button
                    type="button"
                    disabled={!cartLines.length || saving}
                    onClick={() => setOpenSaveQuote(true)}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-white disabled:opacity-60"
                    title="Salvar cotação"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mb-0.5" aria-hidden="true">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[10px] font-bold leading-none uppercase tracking-tighter">Salvar</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setOpenCartModal(true)}
                  className="relative rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white"
                  aria-label="Carrinho"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M6 6h15l-2 9H7L6 6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 6 5 3H2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      fill="currentColor"
                    />
                  </svg>
                  {cartItemsCount ? (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {cartItemsCount}
                    </span>
                  ) : null}
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
                <div className="flex flex-wrap items-center gap-2 w-full">
                  {/* Seleção de canal - visível em todas as telas */}
                  <div className="flex flex-wrap items-center gap-2 w-full">
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
                  </div>

                  {/* Seleção de mesa e cliente - visível quando canal é mesa */}
                  {saleChannel === 'table' ? (
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      <select
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full sm:w-48 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
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
                        <div className={`text-xs ${selectedTableIsFull ? 'text-rose-300' : 'text-slate-400'} w-full sm:w-auto`}>
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
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
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
                  className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
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

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-6">
            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Carregando...</div>
            ) : filteredItems.length ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                {isRestaurant ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

        <aside className="hidden xl:block border-b border-slate-800 bg-slate-900 xl:order-1 xl:border-b-0 xl:border-r">
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
                              {Number(l.price || 0).toFixed(2)} · {(l.product.sold_by_weight || (l.product.unit && l.product.unit.toLowerCase() === 'kg')) ? 'kg' : (l.product.unit || 'un')}
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
                                const n = parseDecimal(e.target.value)
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
                            onChange={(e) => {
                              const v = e.target.value
                              setPaymentMethod(v)
                              if (v !== 'debt') {
                                setDebtCustomerId('')
                                setDebtCustomerName('')
                                setDebtCustomerNuit('')
                              }
                            }}
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
                            <option value="debt">Dívida (Fiado)</option>
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
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="grid gap-2">
                          <div className="text-xs font-semibold text-slate-400">Desconto</div>
                          <input
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            disabled={!cartLines.length || paymentMethod === 'debt'}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
                            inputMode="decimal"
                            placeholder="0.00"
                            type="text"
                          />
                        </label>
                        <div className="grid gap-2">
                          <div className="text-xs font-semibold text-slate-400">Total a pagar</div>
                          <div className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 flex items-center text-sm font-semibold text-white">
                            {Number(finalTotal || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      {paymentMethod === 'debt' ? (
                        <div className="mt-3 grid gap-3">
                          <label className="grid gap-2">
                            <div className="text-xs font-semibold text-slate-400">Cliente</div>
                            <select
                              value={debtCustomerId}
                              onChange={(e) => {
                                const v = e.target.value
                                setDebtCustomerId(v)
                                if (!v) return
                                const c = (customers || []).find((x) => String(x.id) === String(v))
                                if (!c) return
                                setDebtCustomerName(String(c.name || ''))
                                setDebtCustomerNuit(String(c.nuit || ''))
                              }}
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                            >
                              <option value="">Selecionar cliente</option>
                              {(customers || []).map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          {!debtCustomerId ? (
                            <div className="grid grid-cols-2 gap-3">
                              <label className="grid gap-2">
                                <div className="text-xs font-semibold text-slate-400">Nome do cliente</div>
                                <input
                                  value={debtCustomerName}
                                  onChange={(e) => setDebtCustomerName(e.target.value)}
                                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                                  type="text"
                                />
                              </label>
                              <label className="grid gap-2">
                                <div className="text-xs font-semibold text-slate-400">NUIT</div>
                                <input
                                  value={debtCustomerNuit}
                                  onChange={(e) => setDebtCustomerNuit(e.target.value)}
                                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                                  type="text"
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
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
                    {saving
                      ? 'Processando...'
                      : isTableOrder
                        ? 'Processar pedido'
                        : activeQuote?.id
                          ? 'Converter cotação'
                          : paymentMethod === 'debt'
                            ? 'Processar dívida'
                            : 'Finalizar venda'}
                  </button>
                </div>

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
                    <div className="text-slate-300">Desconto</div>
                    <div className="text-right text-slate-100 font-semibold">{Number(appliedDiscount || 0).toFixed(2)} MZN</div>
                    <div className="text-slate-300">Total</div>
                    <div className="text-right text-white text-lg font-semibold">{Number(finalTotal || 0).toFixed(2)} MZN</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={openCartModal}
        title="Carrinho"
        onClose={() => {
          setOpenCartModal(false)
        }}
      >
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-200">
              Itens: <span className="font-semibold text-white">{cartItemsCount}</span>
            </div>
            <button
              type="button"
              onClick={() => clearCart()}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
            >
              Limpar
            </button>
          </div>

          <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3">
            {cartLines.length ? (
              <div className="grid gap-2">
                {cartLines.map((l) => (
                  <div key={l.product.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100" title={l.product.name}>
                          {l.product.name}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {Number(l.price || 0).toFixed(2)} · {(l.product.sold_by_weight || (l.product.unit && l.product.unit.toLowerCase() === 'kg')) ? 'kg' : (l.product.unit || 'un')}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-white">{Number(l.lineTotal || 0).toFixed(2)}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQty(l.product.id, Math.max(0, l.qty - 1))}
                          className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-100"
                        >
                          -
                        </button>
                        <input
                          value={String(l.qty)}
                          onChange={(e) => {
                            const n = parseDecimal(e.target.value)
                            setQty(l.product.id, Number.isFinite(n) ? n : l.qty)
                          }}
                          className="w-16 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                          inputMode="decimal"
                          type="text"
                        />
                        <button
                          type="button"
                          onClick={() => setQty(l.product.id, l.qty + 1)}
                          className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-100"
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
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-300">Carrinho vazio</div>
            )}
          </div>

          {!isTableOrder ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <div className="grid grid-cols-2 gap-3">
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
                    <option value="debt">Dívida (Fiado)</option>
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
              <div className="mt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeTax}
                    onChange={(e) => setIncludeTax(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-600 focus:ring-offset-0"
                  />
                  <div className="text-xs font-semibold text-slate-400">
                    Incluir IVA ({includeTax ? 'Com IVA' : 'Sem IVA'})
                  </div>
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <div className="text-xs font-semibold text-slate-400">Desconto</div>
                  <input
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    disabled={!cartLines.length || paymentMethod === 'debt'}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
                    inputMode="decimal"
                    placeholder="0.00"
                    type="text"
                  />
                </label>
                <div className="grid gap-2">
                  <div className="text-xs font-semibold text-slate-400">Total a pagar</div>
                  <div className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 flex items-center text-sm font-semibold text-white">
                    {Number(finalTotal || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <div>Troco</div>
                <div className="text-slate-200">{Number(change || 0).toFixed(2)}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
              Pagamento será realizado na página <span className="font-semibold text-slate-200">Pedidos</span>.
            </div>
          )}

          {paymentMethod === 'debt' ? (
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Cliente</div>
                <select
                  value={debtCustomerId}
                  onChange={(e) => {
                    const v = e.target.value
                    setDebtCustomerId(v)
                    if (!v) return
                    const c = (customers || []).find((x) => String(x.id) === String(v))
                    if (!c) return
                    setDebtCustomerName(String(c.name || ''))
                    setDebtCustomerNuit(String(c.nuit || ''))
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">Selecionar cliente</option>
                  {(customers || []).map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              
              {debtCustomerId ? (
                <div className="mt-2 text-xs text-slate-400">
                  Cliente: <span className="font-semibold text-slate-200">{debtCustomerName}</span>
                  {debtCustomerNuit ? (
                    <> · NUIT: <span className="font-semibold text-slate-200">{debtCustomerNuit}</span></>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm">
            <div className="text-slate-300">Subtotal</div>
            <div className="text-right text-slate-100 font-semibold">{Number(total || 0).toFixed(2)} MZN</div>
            <div className="text-slate-300">IVA</div>
            <div className="text-right text-slate-100 font-semibold">{Number(taxTotal || 0).toFixed(2)} MZN</div>
            <div className="text-slate-300">Desconto</div>
            <div className="text-right text-slate-100 font-semibold">{Number(appliedDiscount || 0).toFixed(2)} MZN</div>
            <div className="text-slate-300">Total</div>
            <div className="text-right text-white text-lg font-semibold">{Number(finalTotal || 0).toFixed(2)} MZN</div>
          </div>

          <button
            type="button"
            disabled={!cartLines.length || saving}
            onClick={() => {
              setOpenCartModal(false)
              setOpenConfirm(true)
            }}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Processando...' : isTableOrder ? 'Processar pedido' : activeQuote?.id ? 'Converter cotação' : paymentMethod === 'debt' ? 'Processar dívida' : 'Finalizar venda'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openConfirm}
        title={isTableOrder ? 'Confirmar pedido' : activeQuote?.id ? 'Converter cotação' : 'Confirmar venda'}
        onClose={() => {
          if (!saving && !convertingQuote) setOpenConfirm(false)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Total: <span className="font-semibold text-white">{Number(finalTotal || 0).toFixed(2)} MZN</span>
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
        open={openCashOpen && !isTableOrder}
        title="Abrir caixa"
        onClose={() => {
          if (cashSession?.id) {
            setOpenCashOpen(false)
          }
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">Informe o fundo de caixa (troco inicial).</div>
          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Valor de abertura</div>
            <input
              value={cashOpeningBalance}
              onChange={(e) => setCashOpeningBalance(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="decimal"
              placeholder="0.00"
              type="text"
            />
          </label>

          <button
            type="button"
            disabled={cashLoading}
            onClick={async () => {
              const n = Number(String(cashOpeningBalance || '').replace(',', '.'))
              if (!Number.isFinite(n) || n < 0) {
                toast.error('Valor de abertura inválido.')
                return
              }
              try {
                setCashLoading(true)
                const row = await openCashSession({ opening_balance: n })
                setCashSession(row || null)
                setOpenCashOpen(false)
                toast.success('Caixa aberto.')
              } catch (err) {
                const msg = err?.response?.data?.detail || 'Não foi possível abrir o caixa agora.'
                toast.error(msg)
              } finally {
                setCashLoading(false)
              }
            }}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {cashLoading ? 'Abrindo...' : 'Abrir caixa'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openCashClose && !isTableOrder}
        title="Fechar caixa"
        onClose={() => {
          if (!cashLoading) setOpenCashClose(false)
        }}
      >
        <div className="grid gap-4">
          {cashSummary ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <div>Esperado (dinheiro)</div>
                <div className="font-semibold text-white">{Number(cashSummary.expected_cash || 0).toFixed(2)} MZN</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">Vendas</div>
                <div className="text-right text-slate-200">{Number(cashSummary.gross_total || 0).toFixed(2)} MZN</div>
              </div>
            </div>
          ) : null}

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Valor contado</div>
            <input
              value={cashClosingCounted}
              onChange={(e) => setCashClosingCounted(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="decimal"
              placeholder="0.00"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Observações (opcional)</div>
            <input
              value={cashClosingNotes}
              onChange={(e) => setCashClosingNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: sangria, diferença, etc."
              type="text"
            />
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={cashLoading}
              onClick={() => setOpenCashClose(false)}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={cashLoading || !cashSession?.id}
              onClick={async () => {
                const n = Number(String(cashClosingCounted || '').replace(',', '.'))
                if (!Number.isFinite(n) || n < 0) {
                  toast.error('Valor contado inválido.')
                  return
                }
                try {
                  setCashLoading(true)
                  await closeCashSession(Number(cashSession.id), {
                    closing_balance_counted: n,
                    notes: String(cashClosingNotes || '').trim() || null,
                  })
                  toast.success('Caixa fechado.')
                  setOpenCashClose(false)
                  setCashSession(null)
                  setCashSummary(null)
                  setOpenCashOpen(true)
                } catch (err) {
                  const msg = err?.response?.data?.detail || 'Não foi possível fechar o caixa agora.'
                  toast.error(msg)
                } finally {
                  setCashLoading(false)
                }
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cashLoading ? 'Fechando...' : 'Fechar caixa'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openQuoteDelete}
        title="Eliminar cotação"
        onClose={() => {
          if (deletingQuote) return
          setOpenQuoteDelete(false)
          setQuoteToDelete(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja eliminar a cotação{' '}
            <span className="font-semibold text-white">
              {quoteToDelete?.series}/{quoteToDelete?.number}
            </span>
            ?
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={deletingQuote}
              onClick={() => {
                setOpenQuoteDelete(false)
                setQuoteToDelete(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={deletingQuote}
              onClick={confirmDeleteQuote}
              className="rounded-xl border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 px-4 py-2.5 text-sm font-semibold text-rose-100 disabled:opacity-60"
            >
              {deletingQuote ? 'Eliminando...' : 'Eliminar'}
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-200">Cliente</div>
                <button
                  type="button"
                  disabled={customersLoading}
                  onClick={async () => loadCustomers(customerQuery)}
                  className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {customersLoading ? 'Carregando...' : 'Atualizar'}
                </button>
              </div>
              <input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Pesquisar cliente"
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedCustomerId(v)
                  if (!v) return
                  const c = (customers || []).find((x) => String(x.id) === String(v))
                  if (!c) return
                  setQuoteCustomerName(String(c.name || ''))
                  setQuoteCustomerNuit(String(c.nuit || ''))
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Selecionar cliente (opcional)</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} {c.nuit ? `· NUIT: ${c.nuit}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Nome do cliente (opcional)</div>
              <input
                value={quoteCustomerName}
                onChange={(e) => {
                  setSelectedCustomerId('')
                  setQuoteCustomerName(e.target.value)
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">NUIT (opcional)</div>
              <input
                value={quoteCustomerNuit}
                onChange={(e) => {
                  setSelectedCustomerId('')
                  setQuoteCustomerNuit(e.target.value)
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>
          </div>

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
                      setSelectedCustomerId('')
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

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const blob = await downloadQuotePdf(Number(q.id))
                        const url = window.URL.createObjectURL(blob)
                        window.open(url, '_blank', 'noopener,noreferrer')
                        window.setTimeout(() => window.URL.revokeObjectURL(url), 20000)
                      } catch {
                        toast.error('Não foi possível gerar o PDF agora.')
                      }
                    }}
                    className="shrink-0 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                  >
                    PDF
                  </button>

                  {q.status === 'open' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setQuoteToDelete(q)
                        setOpenQuoteDelete(true)
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
        {!selectedTableCapacity ? (
          <div className="text-sm text-slate-200">Capacidade da mesa não definida.</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Mesa</div>
              <select
                value={tableNumber}
                onChange={(e) => {
                  setTableNumber(e.target.value)
                  setSeatNumber('1')
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
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
            </div>

            {!tableNumber ? <div className="text-sm text-slate-200">Selecione a mesa para escolher o cliente.</div> : null}

            <div className="text-xs text-slate-400">
              Capacidade: <span className="font-semibold text-slate-200">{selectedTableCapacity}</span>
            </div>
            {tableNumber ? (
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
            ) : null}

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

      {/* Modal para produtos vendidos por peso */}
      <Modal open={!!weightProduct} title="Informar Peso ou Valor" onClose={() => setWeightProduct(null)}>
        {weightProduct && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Produto
              </label>
              <div className="text-slate-100">{weightProduct.name}</div>
              <div className="text-xs text-slate-400 mt-1">
                Preço por kg: {Number(weightProduct.price || 0).toFixed(2)} MZN
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Quilos (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={weightInput}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Ex: 1.250"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Valor (MZN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valueInput}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Ex: 25.00"
                />
              </div>
            </div>
            
            <div className="text-xs text-slate-400 bg-slate-800 rounded-lg p-3">
              💡 <strong>Dica:</strong> Digite o peso para calcular o valor automaticamente, ou digite o valor para calcular o peso automaticamente.
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setWeightProduct(null)
                  setWeightInput('')
                  setValueInput('')
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addWeightToCart}
                disabled={!weightInput || parseDecimal(weightInput) <= 0}
                className="rounded-xl border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Impressão */}
      <Modal 
        open={openPrintConfirm} 
        title={printConfirmType === 'pedido' ? 'Imprimir para Cozinha?' : 'Confirmação de Impressão'} 
        onClose={() => setOpenPrintConfirm(false)}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-200">
            {printConfirmType === 'venda' && 'Deseja imprimir o recibo da venda para o cliente?'}
            {printConfirmType === 'pedido' && 'Deseja imprimir o ticket de preparo para a COZINHA?'}
            {printConfirmType === 'divida' && 'Deseja imprimir o comprovante da dívida?'}
          </div>
          
          <div className="text-xs text-slate-400">
            {printConfirmType === 'pedido' 
              ? 'O ticket conterá apenas os itens e a mesa para os cozinheiros.' 
              : 'O recibo será impresso na impressora térmica configurada.'}
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenPrintConfirm(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700"
            >
              Não
            </button>
            <button
              type="button"
              onClick={() => {
                if (printConfirmCallback) {
                  // Passar os dados capturados se existirem
                  printConfirmCallback()
                }
                setOpenPrintConfirm(false)
              }}
              className="rounded-xl border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Sim, imprimir {printConfirmType === 'pedido' ? 'Ticket Cozinha' : 'Recibo'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
