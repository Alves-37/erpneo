import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { getMe } from '../api/auth.js'
import { getMyBranch, listBranches, switchMyBranch } from '../api/branches.js'
import { listEstablishments, switchMyEstablishment } from '../api/establishments.js'
import { listOrders } from '../api/orders.js'
import { useAuthStore } from '../store/authStore.js'

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Produtos' },
  { to: '/raw-materials', label: 'Matérias-primas', restaurantOnly: true },
  { to: '/categories', label: 'Categorias', pharmacyOnly: true },
  { to: '/reprography/printers', label: 'Impressoras', reprographyOnly: true },
  { to: '/warehouse', label: 'Armazém' },
  { to: '/stock/transfer', label: 'Transferência de Stock' },
  { to: '/stock/adjust', label: 'Ajuste de Stock' },
  { to: '/stock/history', label: 'Histórico de Stock' },
  { to: '/sales', label: 'Vendas' },
  { to: '/debts', label: 'Dívidas', hideForRestaurant: true },
  { to: '/returns', label: 'Devoluções', hideForRestaurant: true },
  { to: '/pdv', label: 'PDV' },
  { to: '/orders', label: 'Pedidos', restaurantOnly: true },
  { to: '/tables', label: 'Mesas', restaurantOnly: true },
  { to: '/delivery-zones', label: 'Zonas de entrega', restaurantOnly: true },
  { to: '/finance', label: 'Finanças' },
  { to: '/reports', label: 'Relatórios' },
  { to: '/establishments', label: 'Pontos', adminOnly: true },
  { to: '/users', label: 'Usuários' },
  { to: '/settings', label: 'Configurações' },
]

const businessTypeLabel = {
  retail: 'Retalho',
  grocery: 'Mercearia',
  fish: 'Peixaria',
  grocery_fish: 'Mercearia e Peixaria',
  restaurant: 'Restaurante',
  bar: 'Bar',
  butcher: 'Açougue',
  services: 'Serviços',
  pharmacy: 'Farmácia',
  reprography: 'Reprografia',
}

function NavIcon({ name }) {
  const common = {
    className: 'h-5 w-5 shrink-0',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  if (name === 'dashboard') {
    return (
      <svg {...common}>
        <path d="M3 13h8V3H3v10z" />
        <path d="M13 21h8V11h-8v10z" />
        <path d="M13 3h8v6h-8V3z" />
        <path d="M3 21h8v-6H3v6z" />
      </svg>
    )
  }
  if (name === 'products') {
    return (
      <svg {...common}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.3 7l8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )
  }
  if (name === 'warehouse') {
    return (
      <svg {...common}>
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M9 21V12h6v9" />
      </svg>
    )
  }
  if (name === 'stock') {
    return (
      <svg {...common}>
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h10" />
        <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      </svg>
    )
  }
  if (name === 'stock_transfer') {
    return (
      <svg {...common}>
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M9 16l-3 3 3 3" />
        <path d="M6 19h12" />
      </svg>
    )
  }
  if (name === 'stock_adjust') {
    return (
      <svg {...common}>
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-6" />
      </svg>
    )
  }
  if (name === 'stock_history') {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 3v6h6" />
        <path d="M12 7v5l3 3" />
      </svg>
    )
  }
  if (name === 'sales') {
    return (
      <svg {...common}>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  }
  if (name === 'debts') {
    return (
      <svg {...common}>
        <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        <path d="M20 12H7" />
        <path d="M15 17l5-5-5-5" />
      </svg>
    )
  }
  if (name === 'returns') {
    return (
      <svg {...common}>
        <path d="M3 7h13a4 4 0 0 1 0 8H7" />
        <path d="M7 15l-4-4 4-4" />
      </svg>
    )
  }
  if (name === 'pdv') {
    return (
      <svg {...common}>
        <path d="M7 7h10" />
        <path d="M7 11h10" />
        <path d="M7 15h6" />
        <path d="M5 3h14a2 2 0 0 1 2 2v16H3V5a2 2 0 0 1 2-2z" />
      </svg>
    )
  }
  if (name === 'printers') {
    return (
      <svg {...common}>
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
    )
  }
  if (name === 'establishments') {
    return (
      <svg {...common}>
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21V12h6v9" />
      </svg>
    )
  }
  if (name === 'users') {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  if (name === 'orders') {
    return (
      <svg {...common}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  }
  if (name === 'tables') {
    return (
      <svg {...common}>
        <path d="M3 10h18" />
        <path d="M4 21l2-7" />
        <path d="M20 21l-2-7" />
        <path d="M8 21l1-11" />
        <path d="M16 21l-1-11" />
      </svg>
    )
  }
  if (name === 'finance') {
    return (
      <svg {...common}>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  }
  if (name === 'reports') {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 17v-5" />
        <path d="M12 17V7" />
        <path d="M16 17v-3" />
      </svg>
    )
  }
  if (name === 'settings') {
    return (
      <svg {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04a2 2 0 0 1-1.42 3.42h-.06a1.7 1.7 0 0 0-1.62 1.17 1.7 1.7 0 0 1-3.12.26 1.7 1.7 0 0 0-1.94-.73 1.7 1.7 0 0 0-1.25 1.47A2 2 0 0 1 5.52 22a2 2 0 0 1-1.42-3.42l.04-.04A1.7 1.7 0 0 0 4.5 15a1.7 1.7 0 0 0-1.17-1.62 2 2 0 0 1 0-3.76A1.7 1.7 0 0 0 4.5 8a1.7 1.7 0 0 0-.34-1.87l-.04-.04A2 2 0 0 1 5.52 2a2 2 0 0 1 1.87 1.34 1.7 1.7 0 0 0 1.94.73A1.7 1.7 0 0 0 10.58 2.6 2 2 0 0 1 14.48 2a2 2 0 0 1 1.42 3.42l-.04.04A1.7 1.7 0 0 0 19.4 9.0a1.7 1.7 0 0 0 1.17 1.62 2 2 0 0 1 0 3.76A1.7 1.7 0 0 0 19.4 15z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

function navIconKey(to) {
  if (to === '/dashboard') return 'dashboard'
  if (to === '/products') return 'products'
  if (to === '/warehouse') return 'warehouse'
  if (to === '/stock/transfer') return 'stock_transfer'
  if (to === '/stock/adjust') return 'stock_adjust'
  if (to === '/stock/history') return 'stock_history'
  if (to.startsWith('/stock/')) return 'stock'
  if (to === '/sales') return 'sales'
  if (to === '/debts') return 'debts'
  if (to === '/returns') return 'returns'
  if (to === '/pdv') return 'pdv'
  if (to === '/orders') return 'orders'
  if (to === '/tables') return 'tables'
  if (to === '/finance') return 'finance'
  if (to === '/reports') return 'reports'
  if (to === '/establishments') return 'establishments'
  if (to === '/users') return 'users'
  if (to === '/settings') return 'settings'
  if (to === '/reprography/printers') return 'printers'
  return 'menu'
}

function _filterBranchesByVisibility(visibleBranchIds, branches) {
  if (!Array.isArray(visibleBranchIds) || !visibleBranchIds.length) return branches
  const set = new Set(visibleBranchIds.map((x) => String(Number(x))))
  return (branches || []).filter((b) => b?.id != null && set.has(String(b.id)))
}

export default function DashboardLayout() {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('neoerp_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })
  const [branches, setBranches] = useState([])
  const [switchingBranch, setSwitchingBranch] = useState(false)
  const [establishments, setEstablishments] = useState([])
  const [switchingEstablishment, setSwitchingEstablishment] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const me = useAuthStore((s) => s.me)
  const setMe = useAuthStore((s) => s.setMe)
  const establishment = useAuthStore((s) => s.establishment)
  const setEstablishment = useAuthStore((s) => s.setEstablishment)
  const branch = useAuthStore((s) => s.branch)
  const setBranch = useAuthStore((s) => s.setBranch)
  const contextVersion = useAuthStore((s) => s.contextVersion)
  const bumpContext = useAuthStore((s) => s.bumpContext)
  const logout = useAuthStore((s) => s.logout)

  const [hasNewOrders, setHasNewOrders] = useState(false)
  const [latestOrderId, setLatestOrderId] = useState(null)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isCashier = role === 'cashier'
  const canSwitchBranch = role === 'admin' || role === 'owner'
  const canSwitchEstablishment = canSwitchBranch

  const bt = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isRestaurant = bt === 'restaurant'
  const isBar = bt === 'bar'
  const isPharmacy = bt === 'pharmacy'
  const isReprography = bt === 'reprography' || bt === 'reprografia'

  useEffect(() => {
    if (!token) {
      setHasNewOrders(false)
      setLatestOrderId(null)
      return
    }
    if (!isRestaurant) {
      setHasNewOrders(false)
      setLatestOrderId(null)
      return
    }

    let disposed = false
    let timer = null

    const getKey = () => {
      const bid = branch?.id != null ? String(Number(branch.id)) : '0'
      return `neoerp_last_seen_order_id_branch_${bid}`
    }

    const tick = async () => {
      try {
        const rows = await listOrders({ status: 'open', limit: 1, offset: 0 })
        const id = rows?.[0]?.id != null ? Number(rows[0].id) : null
        if (disposed) return
        setLatestOrderId(id)
        if (id == null) {
          setHasNewOrders(false)
          return
        }
        const seenRaw = window.localStorage.getItem(getKey())
        const seen = seenRaw != null ? Number(seenRaw) : 0
        setHasNewOrders(Number.isFinite(seen) ? id > seen : true)
      } catch {
        if (disposed) return
      }
    }

    tick()
    timer = window.setInterval(tick, 12000)
    return () => {
      disposed = true
      if (timer) window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isRestaurant, branch?.id])

  useEffect(() => {
    if (!isRestaurant) return
    if (!location?.pathname?.startsWith('/orders')) return
    if (latestOrderId == null) {
      setHasNewOrders(false)
      return
    }
    try {
      const bid = branch?.id != null ? String(Number(branch.id)) : '0'
      window.localStorage.setItem(`neoerp_last_seen_order_id_branch_${bid}`, String(Number(latestOrderId)))
    } catch {
      // ignore
    }
    setHasNewOrders(false)
  }, [location?.pathname, latestOrderId, isRestaurant, branch?.id])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [b, list, meRes] = await Promise.all([getMyBranch(), listBranches(), getMe()])
        if (mounted) setBranch(b, { persist: true })
        if (mounted) setMe(meRes, { persist: true })
        if (mounted) {
          const rows = Array.isArray(list) ? list : []
          setBranches(_filterBranchesByVisibility(meRes?.visible_branch_ids, rows))
        }

        if (mounted && b?.id) {
          try {
            const points = await listEstablishments({ branch_id: b.id })
            setEstablishments(Array.isArray(points) ? points : [])

            const currentId = Number(meRes?.establishment_id || 0) || null
            const current = currentId ? (points || []).find((p) => Number(p.id) === currentId) : null
            setEstablishment(current || null, { persist: true })
          } catch {
            setEstablishments([])
            setEstablishment(null, { persist: true })
          }
        }
      } catch {
        if (mounted) setBranch(null, { persist: true })
        if (mounted) setMe(null, { persist: true })
        if (mounted) setEstablishment(null, { persist: true })
        if (mounted) setBranches([])
        if (mounted) setEstablishments([])
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [setBranch, contextVersion])

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((v) => {
      const next = !v
      try {
        window.localStorage.setItem('neoerp_sidebar_collapsed', next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  useEffect(() => {
    // me já é carregado junto com as filiais no effect acima
  }, [])

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="flex h-screen overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 
          ${sidebarCollapsed ? 'lg:w-20' : 'w-72'} bg-slate-900 border-r border-slate-800 
          h-screen overflow-y-auto p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`font-semibold text-xl text-white tracking-wide ${sidebarCollapsed ? 'lg:hidden' : ''}`}>NEO ERP</div>
              <div className={`text-sm text-slate-400 mt-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Neotrix Tecnologias</div>
            </div>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className={
                'hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-xl border text-slate-200 ' +
                (sidebarCollapsed
                  ? 'border-brand-600 bg-brand-600 hover:bg-brand-700 shadow-[0_0_0_6px_rgba(37,99,235,0.16)] animate-pulse'
                  : 'border-slate-800 bg-slate-950 hover:bg-slate-800')
              }
              aria-label={sidebarCollapsed ? 'Abrir menu' : 'Fechar menu'}
              title={sidebarCollapsed ? 'Abrir menu' : 'Fechar menu'}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sidebarCollapsed ? (
                  <path d="M9 18l6-6-6-6" />
                ) : (
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
            </button>
          </div>
          <div className="mt-6 h-px w-full bg-slate-800" />
          <nav className={sidebarCollapsed ? 'mt-5 flex flex-col gap-2 items-center' : 'mt-5 flex flex-col gap-2'}>
            {nav
              .filter((item) => !item.restaurantOnly || isRestaurant)
              .filter((item) => !item.pharmacyOnly || isPharmacy)
              .filter((item) => !item.reprographyOnly || isReprography)
              .filter((item) => !(isRestaurant && item.hideForRestaurant))
              .filter((item) => !(isBar && item.to.startsWith('/stock')))
              .filter((item) => !item.adminOnly || canSwitchBranch)
              .filter((item) => {
                if (!isCashier) return true
                return (
                  item.to === '/dashboard' ||
                  item.to === '/sales' ||
                  item.to === '/debts' ||
                  item.to === '/returns' ||
                  item.to === '/pdv' ||
                  item.to === '/orders' ||
                  item.to === '/tables' ||
                  item.to === '/finance' ||
                  item.to === '/reprography/printers'
                )
              })
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `${sidebarCollapsed ? 'px-0 py-3 w-12 justify-center' : 'px-4 py-3'} rounded-xl text-base font-semibold transition-all duration-150 flex items-center ${
                      (isActive ||
                      (item.to === '/reprography/printers' && location.pathname.startsWith('/reprography/')))
                        ? 'bg-brand-600 text-white shadow-sm'
                        : item.to === '/orders' && hasNewOrders
                          ? 'bg-rose-600 text-white shadow-sm animate-pulse hover:bg-rose-500'
                          : 'text-slate-200 bg-slate-900 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <span className={sidebarCollapsed ? 'flex items-center justify-center w-full' : 'flex items-center justify-between gap-3 w-full'}>
                    <span className={sidebarCollapsed ? 'flex items-center justify-center w-full' : 'flex items-center gap-3'}>
                      <NavIcon name={navIconKey(item.to)} />
                      <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </span>
                    {item.to === '/orders' && hasNewOrders ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-200 shadow-[0_0_0_6px_rgba(244,63,94,0.14)]" />
                    ) : null}
                  </span>
                </NavLink>
              ))}
          </nav>

          <div className="mt-6 h-px w-full bg-slate-800" />
          
          {/* Mobile close button */}
          <div className="lg:hidden mt-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="w-full px-4 py-3 rounded-xl text-base font-semibold transition-all duration-150 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Fechar menu
            </button>
          </div>
        </aside>

        <main className="flex-1 h-screen overflow-hidden">
          <div className="flex h-screen flex-col overflow-hidden">
          <header className="shrink-0 px-4 lg:px-6 mx-3 mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg backdrop-blur lg:mx-0 lg:mt-0 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-slate-950 lg:shadow-none">
            <div className="h-14 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden p-2 rounded-lg text-slate-200 relative transition-all duration-150 ${
                  isRestaurant && hasNewOrders
                    ? 'bg-rose-600 text-white animate-pulse hover:bg-rose-500'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {isRestaurant && hasNewOrders ? (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-200 shadow-[0_0_0_6px_rgba(244,63,94,0.14)]" />
                ) : null}
              </button>

              <div className="min-w-0 flex-1 lg:flex-none lg:ml-0">
                <div className="text-sm lg:text-lg font-semibold text-slate-200 truncate">
                  {me?.name ? `${me.name} · ${me.role || 'user'}` : 'Online-first'}
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <div className="text-xs font-semibold text-slate-400">Filial</div>
                <select
                  value={branch?.id ? String(branch.id) : ''}
                  disabled={!canSwitchBranch || switchingBranch || !branches?.length}
                  onChange={async (e) => {
                    if (!canSwitchBranch) return
                    const nextId = e.target.value
                    if (!nextId) return
                    setSwitchingBranch(true)
                    try {
                      const b = await switchMyBranch(nextId)
                      setBranch(b, { persist: true })
                      try {
                        const data = await getMe()
                        setMe(data, { persist: true })
                        try {
                          const points = await listEstablishments({ branch_id: b.id })
                          setEstablishments(Array.isArray(points) ? points : [])
                          const currentId = Number(data?.establishment_id || 0) || null
                          const byMe = currentId ? (points || []).find((p) => Number(p.id) === currentId) : null
                          const fallback = (points || []).find((p) => p?.is_active) || (points || [])[0] || null
                          setEstablishment(byMe || fallback || null, { persist: true })
                        } catch {
                          setEstablishments([])
                          setEstablishment(null, { persist: true })
                        }
                      } catch {
                        // ignore
                      }
                      bumpContext()
                      navigate('/dashboard')
                    } finally {
                      setSwitchingBranch(false)
                    }
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
                >
                  {!branches?.length ? <option value="">Sem filiais</option> : null}
                  {(branches || []).map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name} · {businessTypeLabel[b.business_type] || b.business_type}
                    </option>
                  ))}
                </select>

                {canSwitchEstablishment ? (
                  <>
                    <div className="text-xs font-semibold text-slate-400">Ponto</div>
                    <select
                      value={establishment?.id ? String(establishment.id) : ''}
                      disabled={switchingEstablishment || !establishments?.length}
                      onChange={async (e) => {
                        const nextId = e.target.value
                        if (!nextId) return
                        setSwitchingEstablishment(true)
                        try {
                          const row = await switchMyEstablishment(nextId)
                          setEstablishment(row, { persist: true })
                          try {
                            const data = await getMe()
                            setMe(data, { persist: true })
                          } catch {
                            // ignore
                          }
                          bumpContext()
                        } finally {
                          setSwitchingEstablishment(false)
                        }
                      }}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
                    >
                      {!establishments?.length ? <option value="">Sem pontos</option> : null}
                      {(establishments || []).map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-slate-400">Ponto</div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                      {establishment?.name || '—'}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="ml-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm hover:from-rose-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/60"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="pb-3 lg:hidden">
              <select
                value={branch?.id ? String(branch.id) : ''}
                disabled={!canSwitchBranch || switchingBranch || !branches?.length}
                onChange={async (e) => {
                  if (!canSwitchBranch) return
                  const nextId = e.target.value
                  if (!nextId) return
                  setSwitchingBranch(true)
                  try {
                    const b = await switchMyBranch(nextId)
                    setBranch(b, { persist: true })
                    try {
                      const data = await getMe()
                      setMe(data, { persist: true })
                      try {
                        const points = await listEstablishments({ branch_id: b.id })
                        setEstablishments(Array.isArray(points) ? points : [])
                        const currentId = Number(data?.establishment_id || 0) || null
                        const byMe = currentId ? (points || []).find((p) => Number(p.id) === currentId) : null
                        const fallback = (points || []).find((p) => p?.is_active) || (points || [])[0] || null
                        setEstablishment(byMe || fallback || null, { persist: true })
                      } catch {
                        setEstablishments([])
                        setEstablishment(null, { persist: true })
                      }
                    } catch {
                      // ignore
                    }
                    bumpContext()
                    navigate('/dashboard')
                  } finally {
                    setSwitchingBranch(false)
                  }
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
              >
                {!branches?.length ? <option value="">Sem filiais</option> : null}
                {(branches || []).map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} · {businessTypeLabel[b.business_type] || b.business_type}
                  </option>
                ))}
              </select>

              {canSwitchEstablishment ? (
                <div className="mt-2">
                  <select
                    value={establishment?.id ? String(establishment.id) : ''}
                    disabled={switchingEstablishment || !establishments?.length}
                    onChange={async (e) => {
                      const nextId = e.target.value
                      if (!nextId) return
                      setSwitchingEstablishment(true)
                      try {
                        const row = await switchMyEstablishment(nextId)
                        setEstablishment(row, { persist: true })
                        try {
                          const data = await getMe()
                          setMe(data, { persist: true })
                        } catch {
                          // ignore
                        }
                        bumpContext()
                      } finally {
                        setSwitchingEstablishment(false)
                      }
                    }}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
                  >
                    {!establishments?.length ? <option value="">Sem pontos</option> : null}
                    {(establishments || []).map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-slate-400">Ponto</div>
                  <div className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100">
                    {establishment?.name || '—'}
                  </div>
                </div>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950 text-slate-100">
            <Outlet />
          </div>
          </div>
        </main>
      </div>

      {logoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="p-4 sm:p-5">
              <div className="text-lg font-semibold text-white">Confirmar logout</div>
              <div className="mt-2 text-sm text-slate-300">
                Ricardo, tem a certeza que quer fazer logout?
              </div>
              <div className="mt-5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setLogoutOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setLogoutOpen(false)
                    navigate('/login', { replace: true })
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500"
                >
                  Sim, sair
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
