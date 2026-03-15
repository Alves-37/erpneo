import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { getMe } from '../api/auth.js'
import { getMyBranch, listBranches, switchMyBranch } from '../api/branches.js'
import { useAuthStore } from '../store/authStore.js'

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Produtos' },
  { to: '/warehouse', label: 'Armazém' },
  { to: '/stock/transfer', label: 'Transferência de Stock' },
  { to: '/stock/adjust', label: 'Ajuste de Stock' },
  { to: '/stock/history', label: 'Histórico de Stock' },
  { to: '/sales', label: 'Vendas' },
  { to: '/debts', label: 'Dívidas', hideForRestaurant: true },
  { to: '/pdv', label: 'PDV' },
  { to: '/orders', label: 'Pedidos', restaurantOnly: true },
  { to: '/tables', label: 'Mesas', restaurantOnly: true },
  { to: '/finance', label: 'Finanças' },
  { to: '/reports', label: 'Relatórios' },
  { to: '/users', label: 'Usuários' },
  { to: '/settings', label: 'Configurações' },
  { to: '/logout', label: 'Logout', isLogout: true },
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
}

export default function DashboardLayout() {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [branches, setBranches] = useState([])
  const [switchingBranch, setSwitchingBranch] = useState(false)
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const me = useAuthStore((s) => s.me)
  const setMe = useAuthStore((s) => s.setMe)
  const branch = useAuthStore((s) => s.branch)
  const setBranch = useAuthStore((s) => s.setBranch)
  const contextVersion = useAuthStore((s) => s.contextVersion)
  const bumpContext = useAuthStore((s) => s.bumpContext)
  const logout = useAuthStore((s) => s.logout)

  const isCashier = (me?.role || '').toLowerCase() === 'cashier'

  const bt = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isRestaurant = bt === 'restaurant'
  const isBar = bt === 'bar'

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [b, list] = await Promise.all([getMyBranch(), listBranches()])
        if (mounted) setBranch(b, { persist: true })
        if (mounted) setBranches(Array.isArray(list) ? list : [])
      } catch {
        if (mounted) setBranch(null, { persist: true })
        if (mounted) setBranches([])
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [setBranch, contextVersion])

  useEffect(() => {
    let mounted = true
    if (!token) return

    ;(async () => {
      try {
        const data = await getMe()
        if (mounted) setMe(data, { persist: true })
      } catch {
        if (mounted) setMe(null, { persist: true })
      }
    })()

    return () => {
      mounted = false
    }
  }, [token, setMe])

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
          w-72 bg-slate-900 border-r border-slate-800 
          h-screen overflow-y-auto p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div>
            <div className="font-semibold text-xl text-white tracking-wide">NEO ERP</div>
            <div className="text-sm text-slate-400 mt-1">Neotrix Tecnologias</div>
          </div>
          <div className="mt-6 h-px w-full bg-slate-800" />
          <nav className="mt-5 flex flex-col gap-2">
            {nav
              .filter((item) => !item.restaurantOnly || isRestaurant)
              .filter((item) => !(isRestaurant && item.hideForRestaurant))
              .filter((item) => !(isBar && item.to.startsWith('/stock')))
              .filter((item) => {
                if (!isCashier) return true
                return (
                  item.to === '/dashboard' ||
                  item.to === '/sales' ||
                  item.to === '/debts' ||
                  item.to === '/pdv' ||
                  item.to === '/orders' ||
                  item.to === '/tables' ||
                  item.to === '/logout'
                )
              })
              .map((item) => (
                item.isLogout ? (
                  <button
                    key={item.to}
                    onClick={() => {
                      setSidebarOpen(false)
                      setLogoutOpen(true)
                    }}
                    className="px-4 py-3 rounded-xl text-base font-semibold transition-all duration-150 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm hover:from-rose-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/60"
                  >
                    {item.label}
                  </button>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-xl text-base font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-slate-200 bg-slate-900 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                )
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
                className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
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
                  disabled={switchingBranch || !branches?.length}
                  onChange={async (e) => {
                    const nextId = e.target.value
                    if (!nextId) return
                    setSwitchingBranch(true)
                    try {
                      const b = await switchMyBranch(nextId)
                      setBranch(b, { persist: true })
                      try {
                        const data = await getMe()
                        setMe(data, { persist: true })
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
              </div>
            </div>

            <div className="pb-3 lg:hidden">
              <select
                value={branch?.id ? String(branch.id) : ''}
                disabled={switchingBranch || !branches?.length}
                onChange={async (e) => {
                  const nextId = e.target.value
                  if (!nextId) return
                  setSwitchingBranch(true)
                  try {
                    const b = await switchMyBranch(nextId)
                    setBranch(b, { persist: true })
                    try {
                      const data = await getMe()
                      setMe(data, { persist: true })
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
