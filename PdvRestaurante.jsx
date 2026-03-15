import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, API_BASE_URL } from '../services/api'
import Modal from '../components/Modal'

export default function PdvRestaurante() {
  const navigate = useNavigate()

  const tenantTipoNegocio = (localStorage.getItem('tenant_tipo_negocio') || 'mercearia').toLowerCase()
  const isRestaurante = tenantTipoNegocio === 'restaurante'

  const [produtos, setProdutos] = useState([])
  const [mesas, setMesas] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [categoriaId, setCategoriaId] = useState('')
  const [categorias, setCategorias] = useState([])
  const [categoriasErro, setCategoriasErro] = useState(null)
  const [produtoQ, setProdutoQ] = useState('')

  const [cartOpen, setCartOpen] = useState(false)

  const [tipoVenda, setTipoVenda] = useState('balcao')
  const [mesaId, setMesaId] = useState(null)
  const [mesaModalOpen, setMesaModalOpen] = useState(false)
  const [mesaCapacidade, setMesaCapacidade] = useState(1)
  const [lugarNumero, setLugarNumero] = useState(1)
  const [clientesModalOpen, setClientesModalOpen] = useState(false)
  const [lugaresOcupados, setLugaresOcupados] = useState([])
  const [ocupacaoPorMesa, setOcupacaoPorMesa] = useState({})
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO')
  const [finalizando, setFinalizando] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!isRestaurante) return

    let mounted = true
    async function tick() {
      try {
        await api.getTurnoAtivo()
      } catch {
        // noop
      }
    }

    tick()
    const id = setInterval(() => {
      if (!mounted) return
      tick()
    }, 60_000)

    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [isRestaurante])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!isRestaurante) {
      setError('Esta página está disponível apenas para o modo Restaurante.')
      return
    }

    let mounted = true

    async function load() {
      if (mesaModalOpen || clientesModalOpen || finalizando) return
      setLoading(true)
      setError(null)
      try {
        const [m, pr, cats] = await Promise.all([
          api.getMesas(),
          api.getProdutos('', { incluir_inativos: false }),
          api.getCategorias(),
        ])
        if (!mounted) return
        setMesas(Array.isArray(m) ? m : [])
        const arr = Array.isArray(pr) ? pr : (pr?.items || [])
        setProdutos(Array.isArray(arr) ? arr : [])

        const catsArr = Array.isArray(cats) ? cats : (cats?.items || cats?.results || [])
        setCategorias(Array.isArray(catsArr) ? catsArr : [])
        setCategoriasErro(null)

        try {
          const pedidos = await api.getPedidos({ limit: 500 })
          if (!mounted) return
          const arrP = Array.isArray(pedidos) ? pedidos : []
          const occ = {}
          for (const p of arrP) {
            const mid = Number(p?.mesa_id || 0)
            if (!mid) continue
            const st = String(p?.status || '').toLowerCase()
            if (st === 'pago' || st === 'cancelado') continue
            const lugar = Number(p?.lugar_numero || 0)
            if (!lugar) continue
            if (!occ[mid]) occ[mid] = new Set()
            occ[mid].add(lugar)
          }
          const out = {}
          for (const [k, set] of Object.entries(occ)) out[Number(k)] = Array.from(set)
          setOcupacaoPorMesa(out)
        } catch {
          if (mounted) setOcupacaoPorMesa({})
        }
      } catch (e) {
        if (mounted) {
          setError(e.message)
          setCategoriasErro(e.message)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    const onFocus = () => load()
    const onVisibility = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isRestaurante, mesaModalOpen, clientesModalOpen, finalizando])

  useEffect(() => {
    if (!clientesModalOpen) return
    if (!mesaId) {
      setLugaresOcupados([])
      return
    }
    let mounted = true
    async function loadOcupados() {
      try {
        const data = await api.getPedidos({ mesaId: Number(mesaId), limit: 200 })
        const arr = Array.isArray(data) ? data : []
        const ocupados = new Set()
        for (const p of arr) {
          const st = String(p?.status || '').toLowerCase()
          if (st === 'pago' || st === 'cancelado') continue
          const lugar = Number(p?.lugar_numero || 0)
          if (lugar > 0) ocupados.add(lugar)
        }
        if (mounted) setLugaresOcupados(Array.from(ocupados))
      } catch {
        if (mounted) setLugaresOcupados([])
      }
    }
    loadOcupados()
    return () => { mounted = false }
  }, [clientesModalOpen, mesaId])

  const fmtMT = (v) => {
    if (v === null || v === undefined) return '—'
    try {
      const num = new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
      return `MT ${num}`
    } catch { return `${v}` }
  }

  const getProdutoImageUrl = (p) => {
    const path = String(p?.imagem_path || '')
    if (!path) return ''
    if (path.startsWith('/media/')) {
      const v = p?.updated_at ? encodeURIComponent(String(p.updated_at)) : String(Date.now())
      const sep = path.includes('?') ? '&' : '?'
      return `${API_BASE_URL}${path}${sep}v=${v}`
    }
    return path
  }

  const cartTotal = useMemo(() => {
    return (cart || []).reduce((acc, it) => acc + Number(it?.subtotal || 0), 0)
  }, [cart])

  const produtosFiltrados = useMemo(() => {
    const base = Array.isArray(produtos) ? produtos : []
    const id = String(categoriaId || '').trim()
    const q = String(produtoQ || '').trim().toLowerCase()
    const byCat = id ? base.filter((p) => String(p?.categoria_id ?? '') === id) : base
    if (!q) return byCat
    return byCat.filter((p) => {
      const nome = String(p?.nome || p?.descricao || '').toLowerCase()
      const codigo = String(p?.codigo || '').toLowerCase()
      return nome.includes(q) || codigo.includes(q)
    })
  }, [produtos, categoriaId, produtoQ])

  const cartCount = useMemo(() => {
    return (cart || []).reduce((acc, it) => acc + Number(it?.quantidade || 0), 0)
  }, [cart])

  function addToCart(prod) {
    if (!prod?.id) return
    const preco = Number(prod.preco_venda ?? prod.preco ?? 0)
    if (!(preco > 0)) return
    setCart((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : []
      const idx = arr.findIndex(x => String(x.produto_id) === String(prod.id))
      if (idx >= 0) {
        const cur = arr[idx]
        const qtd = Number(cur.quantidade || 0) + 1
        const subtotal = preco * qtd
        arr[idx] = { ...cur, quantidade: qtd, subtotal }
        return arr
      }
      return [...arr, { produto_id: String(prod.id), produto_nome: prod.nome || 'Produto', preco_unitario: preco, quantidade: 1, subtotal: preco }]
    })
  }

  function changeQty(produtoId, delta) {
    setCart((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : []
      const idx = arr.findIndex(x => String(x.produto_id) === String(produtoId))
      if (idx < 0) return arr
      const cur = arr[idx]
      const qtd = Number(cur.quantidade || 0) + Number(delta || 0)
      if (qtd <= 0) {
        arr.splice(idx, 1)
        return arr
      }
      const subtotal = Number(cur.preco_unitario || 0) * qtd
      arr[idx] = { ...cur, quantidade: qtd, subtotal }
      return arr
    })
  }

  function removeItem(produtoId) {
    setCart((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : []
      const idx = arr.findIndex(x => String(x.produto_id) === String(produtoId))
      if (idx < 0) return arr
      arr.splice(idx, 1)
      return arr
    })
  }

  async function finalizar() {
    if (finalizando) return
    if (!cart || cart.length === 0) {
      setError('Adicione pelo menos um produto')
      return
    }
    if (tipoVenda === 'mesa' && (mesaId == null || mesaId === '')) {
      setError('Selecione a mesa')
      return
    }

    setFinalizando(true)
    setError(null)
    try {
      if (tipoVenda === 'mesa') {
        const pedidoPayload = {
          mesa_id: Number(mesaId),
          lugar_numero: Number(lugarNumero || 1),
          observacoes: null,
          itens: cart.map(it => ({
            produto_id: String(it.produto_id),
            quantidade: Number(it.quantidade || 0),
          })),
        }
        await api.createPedido(pedidoPayload)
        setToast({ type: 'success', message: 'Pedido criado com sucesso' })
      } else {
        const vendaPayload = {
          total: Number(cartTotal || 0),
          desconto: 0,
          forma_pagamento: String(formaPagamento || 'DINHEIRO'),
          tipo_pedido: 'local',
          status_pedido: 'pago',
          mesa_id: 0,
          lugar_numero: 1,
          itens: cart.map(it => ({
            produto_id: String(it.produto_id),
            quantidade: Number(it.quantidade || 0),
            preco_unitario: Number(it.preco_unitario || 0),
            subtotal: Number(it.subtotal || 0),
          })),
        }
        await api.createVenda(vendaPayload)
        setToast({ type: 'success', message: 'Venda finalizada com sucesso' })
      }
      setCart([])
      setCartOpen(false)
      setMesaId(null)
      setMesaCapacidade(1)
      setLugarNumero(1)
      setTipoVenda('balcao')
      setFormaPagamento('DINHEIRO')
    } catch (e) {
      setError(e.message)
    } finally {
      setFinalizando(false)
    }
  }

  if (!isRestaurante) {
    return (
      <div className="space-y-3">
        {error && <p className="text-red-600">{error}</p>}
        <button className="btn-outline" onClick={() => navigate('/dashboard', { replace: true })}>Voltar</button>
      </div>
    )
  }

  let isAdmin = false
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    isAdmin = !!u?.is_admin
  } catch {}

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
          <div className="px-3 py-2 rounded shadow bg-green-600 text-white text-sm">
            {toast.message}
          </div>
        </div>
      )}
      <div className="px-1 sm:px-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h1 className="text-2xl font-bold">PDV</h1>
          <div className="flex items-center gap-2">
            {isAdmin && <button className="btn-outline" onClick={() => navigate('/produtos')}>Gerir produtos</button>}
          </div>
        </div>

        <div className="mb-3">
          <input
            className="input w-full"
            value={produtoQ}
            onChange={(e) => setProdutoQ(e.target.value)}
            placeholder="Buscar produto..."
          />
        </div>

        <div className="mb-3">
          {categoriasErro ? (
            <input
              className="input w-full"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              placeholder="Filtrar por categoria (ID)"
            />
          ) : (
            <select className="input w-full" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id || c.uuid || c.nome} value={String(c.id || c.uuid || '')}>
                  {c.nome || c.descricao || c.id}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-24 bg-gray-200 rounded" />
                <div className="mt-3 h-4 w-24 bg-gray-200 rounded" />
                <div className="mt-2 h-4 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && produtosFiltrados.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-gray-600">Nenhum produto encontrado.</p>
          </div>
        )}

        {!loading && produtosFiltrados.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-6">
            {produtosFiltrados.filter(p => p?.ativo !== false).map((p) => {
              const imgUrl = getProdutoImageUrl(p)
              const preco = Number(p.preco_venda ?? p.preco ?? 0)
              const inCart = cart.find(x => String(x.produto_id) === String(p.id))
              const qtd = inCart ? Number(inCart.quantidade || 0) : 0
              return (
                <button
                  key={p.id || p.uuid || p.codigo}
                  type="button"
                  className="card card-hover text-left"
                  onClick={() => addToCart(p)}
                >
                  <div className="-mx-4 -mt-4 mb-3">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={p.nome || 'Produto'}
                        className="w-full h-28 object-cover rounded-t-xl border-b"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-28 bg-gray-100 rounded-t-xl border-b flex items-center justify-center text-gray-400">
                        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate" title={p.nome}>{p.nome}</div>
                      <div className="text-sm text-green-700 font-semibold">{fmtMT(preco)}</div>
                    </div>
                    {qtd > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800">{qtd}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-40 border-t bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3 space-y-1.5 sm:space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="relative inline-flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              onClick={() => setCartOpen(v => !v)}
              aria-expanded={cartOpen}
              aria-label="Abrir carrinho"
            >
              <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Carrinho</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="text-right">
              <div className="text-xs text-gray-600 hidden sm:block">Total</div>
              <div className="text-base sm:text-lg font-semibold text-green-700">{fmtMT(cartTotal)}</div>
            </div>
          </div>

          {cartOpen && cart.length > 0 && (
            <div className="max-h-32 sm:max-h-40 overflow-y-auto border rounded-lg">
              {cart.map((it) => (
                <div key={it.produto_id} className="px-3 py-2 flex items-center justify-between gap-2 border-b last:border-b-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{it.produto_nome}</div>
                    <div className="text-xs text-gray-500">{fmtMT(it.preco_unitario)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="btn-outline" type="button" onClick={() => changeQty(it.produto_id, -1)}>-</button>
                    <div className="w-10 text-center font-semibold">{it.quantidade}</div>
                    <button className="btn-outline" type="button" onClick={() => changeQty(it.produto_id, 1)}>+</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 text-right font-semibold">{fmtMT(it.subtotal)}</div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                      title="Excluir"
                      aria-label="Excluir item"
                      onClick={() => removeItem(it.produto_id)}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
            <div>
              <label className="text-xs text-gray-600 hidden sm:block">Tipo</label>
              <select className="input w-full" value={tipoVenda} onChange={(e) => {
                const v = e.target.value
                setTipoVenda(v)
                if (v !== 'mesa') setMesaId(null)
              }}>
                <option value="balcao">Balcão</option>
                <option value="mesa">Mesa</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 hidden sm:block">Mesa</label>
              <button
                type="button"
                className="btn-outline w-full"
                disabled={tipoVenda !== 'mesa'}
                onClick={() => setMesaModalOpen(true)}
              >
                {mesaId ? `Mesa ${mesaId}` : 'Selecionar mesa'}
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-600 hidden sm:block">Lugar</label>
              <button
                type="button"
                className="btn-outline w-full"
                disabled={tipoVenda !== 'mesa' || !mesaId || Number(mesaCapacidade || 1) < 2}
                onClick={() => setClientesModalOpen(true)}
                title={Number(mesaCapacidade || 1) < 2 ? 'A mesa não exige seleção de cliente/lugar' : undefined}
              >
                {Number(mesaCapacidade || 1) >= 2 ? `Selecionar lugar (${lugarNumero})` : '—'}
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-600 hidden sm:block">Pagamento</label>
              <select className="input w-full" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="M_PESA">M-Pesa</option>
                <option value="EMOLA">eMola</option>
                <option value="MKESH">mKesh</option>
                <option value="CARTAO">Cartão / POS</option>
                <option value="TRANSFERENCIA">Transferência bancária</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div className="flex items-end col-span-2 sm:col-span-1">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={finalizando || cart.length === 0 || (tipoVenda === 'mesa' && !mesaId)}
                onClick={finalizar}
              >
                {finalizando
                  ? (tipoVenda === 'mesa' ? 'Processando...' : 'Finalizando...')
                  : (tipoVenda === 'mesa' ? 'Processar pedido' : 'Finalizar')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={mesaModalOpen}
        title="Selecionar mesa"
        onClose={() => setMesaModalOpen(false)}
        actions={<button className="btn-outline" onClick={() => setMesaModalOpen(false)}>Fechar</button>}
      >
        {mesas.length === 0 ? (
          <div className="text-sm text-gray-600">Nenhuma mesa disponível.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {mesas.map((m, idx) => {
              const n = Number(m?.numero ?? idx)
              const cap = Number(m?.capacidade ?? 1)
              const ocupados = (ocupacaoPorMesa && ocupacaoPorMesa[n]) ? ocupacaoPorMesa[n] : []
              const ocupadosCount = Array.isArray(ocupados) ? ocupados.length : 0
              const cheia = cap > 0 && ocupadosCount >= cap
              const statusLabel = cheia ? 'Cheia' : (ocupadosCount > 0 ? 'Ocupada' : 'Livre')
              const statusClass = cheia
                ? 'bg-red-50 text-red-700 border-red-200'
                : (ocupadosCount > 0 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200')
              return (
                <button
                  key={m?.id ?? m?.numero ?? idx}
                  type="button"
                  disabled={cheia}
                  className={`btn-outline relative ${mesaId === n ? 'ring-2 ring-primary-500/40' : ''} ${cheia ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (cheia) return
                    setMesaId(n)
                    setMesaCapacidade(cap > 0 ? cap : 1)
                    setLugarNumero(1)
                    setMesaModalOpen(false)
                    if (cap >= 2) setClientesModalOpen(true)
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <div>Mesa {n}{cap ? ` (${cap})` : ''}</div>
                    <div className={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass}`}>
                      {statusLabel}{cap >= 2 ? ` (${ocupadosCount}/${cap})` : ''}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Modal>

      <Modal
        open={clientesModalOpen}
        title={mesaId ? `Lugares da Mesa ${mesaId}` : 'Lugares'}
        onClose={() => setClientesModalOpen(false)}
        actions={<button className="btn-outline" onClick={() => setClientesModalOpen(false)}>Fechar</button>}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600">Lugar</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: Math.max(1, Number(mesaCapacidade || 1)) }).map((_, i) => {
                const n = i + 1
                const ocupado = (lugaresOcupados || []).includes(n)
                const selected = Number(lugarNumero || 1) === n
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={ocupado}
                    className={`btn-outline ${selected ? 'ring-2 ring-primary-500/40 bg-primary-50' : ''} ${ocupado ? 'opacity-70 cursor-not-allowed bg-red-50 border-red-200 text-red-700 line-through' : 'bg-green-50 border-green-200 text-green-800'}`}
                    onClick={() => {
                      if (ocupado) return
                      setLugarNumero(n)
                      setClientesModalOpen(false)
                    }}
                  >
                    <div className="flex flex-col items-center leading-tight">
                      <div className="text-sm font-semibold">{n}</div>
                      <div className="text-[10px]">{ocupado ? 'Ocupado' : 'Livre'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            {lugaresOcupados && lugaresOcupados.length > 0 ? (
              <div className="text-xs text-gray-500 mt-2">
                Ocupados: {lugaresOcupados.sort((a, b) => a - b).join(', ')}
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}
