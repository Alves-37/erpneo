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
  { to: '/pdv', label: 'PDV' },
  { to: '/orders', label: 'Pedidos', restaurantOnly: true },
  { to: '/tables', label: 'Mesas', restaurantOnly: true },
  { to: '/finance', label: 'Finanças' },
  { to: '/reports', label: 'Relatórios' },
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
}

export default function DashboardLayout() {
  const [logoutOpen, setLogoutOpen] = useState(false)
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
      <div className="flex h-screen overflow-hidden">
        <aside className="w-72 bg-slate-900 border-r border-slate-800 h-screen overflow-y-auto p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]">
          <div>
            <div className="font-semibold text-xl text-white tracking-wide">NEO ERP</div>
            <div className="text-sm text-slate-400 mt-1">Neotrix Tecnologias</div>
          </div>
          <div className="mt-6 h-px w-full bg-slate-800" />
          <nav className="mt-5 flex flex-col gap-2">
            {nav
              .filter((item) => !item.restaurantOnly || isRestaurant)
              .filter((item) => !(isBar && item.to.startsWith('/stock')))
              .filter((item) => {
                if (!isCashier) return true
                return (
                  item.to === '/dashboard' ||
                  item.to === '/sales' ||
                  item.to === '/pdv' ||
                  item.to === '/orders' ||
                  item.to === '/tables'
                )
              })
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
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
              ))}
          </nav>

          <div className="mt-6 h-px w-full bg-slate-800" />
        </aside>

        <main className="flex-1 h-screen overflow-hidden">
          <div className="flex h-screen flex-col overflow-hidden">
          <header className="h-14 shrink-0 bg-slate-950 border-b border-slate-800 flex items-center px-6 gap-4">
            <div className="text-lg font-semibold text-slate-200">
              {me?.name ? `${me.name} · ${me.role || 'user'}` : 'Online-first'}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm hover:from-rose-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/60"
              >
                Logout
              </button>
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
          </header>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
            <Outlet />
          </div>
          </div>
        </main>
      </div>

      {logoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="p-5">
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
