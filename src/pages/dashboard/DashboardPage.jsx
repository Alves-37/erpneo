import { useEffect, useMemo, useState } from 'react'
import { getDashboardExpiryAlerts, getDashboardSalesSeries, getDashboardSummary } from '../../api/dashboard.js'
import { useAuthStore } from '../../store/authStore.js'

export default function DashboardPage() {
  const me = useAuthStore((s) => s.me)
  const isCashier = (me?.role || '').toLowerCase() === 'cashier'
  const establishment = useAuthStore((s) => s.establishment)
  const branch = useAuthStore((s) => s.branch)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isPharmacy = businessType === 'pharmacy'

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [series, setSeries] = useState([])
  const [expiryAlerts, setExpiryAlerts] = useState(null)

  async function refresh() {
    setLoading(true)
    try {
      const estId = isAdmin ? (establishment?.id || undefined) : undefined
      const expPromise = isPharmacy
        ? getDashboardExpiryAlerts({ days: 30, limit: 8, establishment_id: estId }).catch(() => null)
        : Promise.resolve(null)

      const [s, ss, exp] = await Promise.all([
        getDashboardSummary({ establishment_id: estId }),
        getDashboardSalesSeries({ days: 30, establishment_id: estId }),
        expPromise,
      ])
      setSummary(s)
      setSeries(ss || [])
      setExpiryAlerts(exp)
    } catch {
      setSummary(null)
      setSeries([])
      setExpiryAlerts(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextVersion, establishment?.id, me?.role, branch?.business_type])

  const fmtMoney = useMemo(() => {
    try {
      return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }, [])

  const points = useMemo(() => {
    const vals = (series || []).map((p) => Number(p?.total || 0))
    const max = Math.max(1, ...vals)
    const w = typeof window !== 'undefined' && window.innerWidth < 640 ? 350 : 600
    const h = typeof window !== 'undefined' && window.innerWidth < 640 ? 120 : 160
    const pad = 12
    if (!vals.length) return { d: '', w, h, max }

    const step = vals.length === 1 ? 1 : (w - pad * 2) / (vals.length - 1)
    const coords = vals.map((v, i) => {
      const x = pad + i * step
      const y = h - pad - (v / max) * (h - pad * 2)
      return [x, y]
    })
    const d = coords
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(' ')

    return { d, w, h, max }
  }, [series])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Dashboard</div>
          <div className="mt-1 text-sm text-slate-300">{isCashier ? 'Resumo do seu turno' : 'Resumo do seu negócio'}</div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="hidden sm:inline-flex rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 sm:px-4 py-2.5 text-sm text-slate-100 whitespace-nowrap"
        >
          Atualizar
        </button>
      </div>

      <div className={`mt-6 grid grid-cols-2 gap-3 sm:gap-4 ${isCashier ? 'lg:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
        {!isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <div className="text-xs font-semibold text-slate-400">Produtos</div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : summary?.products_total ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Total cadastrado</div>
          </div>
        )}

        {!isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <div className="text-xs font-semibold text-slate-400">Baixo estoque (padrão)</div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : summary?.low_stock_default_count ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Local padrão</div>
          </div>
        )}

        {!isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <div className="text-xs font-semibold text-slate-400">Baixo estoque (armazém)</div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : summary?.low_stock_warehouse_count ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Somente armazém</div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
          <div className="text-xs font-semibold text-slate-400">Vendas de hoje</div>
          <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.sales_today || 0))}</div>
          <div className="mt-2 text-xs text-slate-400">MZN</div>
        </div>

        {!isCashier && (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Valor em estoque</div>
              <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.stock_value_cost || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN (custo · local padrão)</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Valor potencial de vendas</div>
              <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.stock_value_potential || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN (preço · local padrão)</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <div className="text-xs font-semibold text-slate-400">Vendas do mês</div>
              <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.sales_month || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN</div>
            </div>

            {isPharmacy ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Alertas de validade</div>
                    <div className="mt-1 text-xs text-slate-500">Próximos {expiryAlerts?.days_window ?? 30} dias</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-xl border border-rose-900/60 bg-rose-950/30 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
                      {loading ? '-' : expiryAlerts?.expired_count ?? 0}
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-amber-900/60 bg-amber-950/25 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                      {loading ? '-' : expiryAlerts?.expiring_soon_count ?? 0}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950">
                  {(expiryAlerts?.items || []).length ? (
                    <div className="divide-y divide-slate-800">
                      {(expiryAlerts?.items || []).slice(0, 3).map((it) => {
                        const daysToExpire = Number(it?.days_to_expire || 0)
                        const isExpired = daysToExpire < 0
                        return (
                          <div key={it.product_id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div className="min-w-0 text-xs font-semibold text-slate-100 truncate" title={it.name || ''}>
                              {it.name}
                            </div>
                            <div
                              className={`shrink-0 inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-semibold ${
                                isExpired
                                  ? 'border-rose-900/60 bg-rose-950/30 text-rose-200'
                                  : daysToExpire <= 7
                                    ? 'border-amber-900/60 bg-amber-950/25 text-amber-200'
                                    : 'border-slate-800 bg-slate-900 text-slate-200'
                              }`}
                            >
                              {isExpired ? `${Math.abs(daysToExpire)}d` : `${daysToExpire}d`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-sm text-slate-300">Sem alertas.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                <div className="text-xs font-semibold text-slate-400">Lucro (mês)</div>
                <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.profit_month || 0))}</div>
                <div className="mt-2 text-xs text-slate-400">MZN</div>
              </div>
            )}
          </>
        )}

        {isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <div className="text-xs font-semibold text-slate-400">Lucro de hoje</div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.profit_today || 0))}</div>
            <div className="mt-2 text-xs text-slate-400">MZN</div>
          </div>
        )}
      </div>

      {!isCashier && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Vendas (últimos 30 dias)</div>
            <div className="mt-1 text-xs text-slate-400">Total diário</div>
          </div>
          <div className="text-xs text-slate-400">Máx: {fmtMoney.format(Number(points.max || 0))}</div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <svg viewBox={`0 0 ${points.w} ${points.h}`} className="h-32 sm:h-44 w-full" role="img" aria-label="Gráfico de vendas">
            <defs>
              <linearGradient id="salesLine" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={points.w} height={points.h} fill="transparent" />
            {points.d ? (
              <>
                <path d={points.d} fill="none" stroke="rgb(59,130,246)" strokeWidth="3" strokeLinecap="round" />
                <path
                  d={`${points.d} L ${points.w - 12} ${points.h - 12} L 12 ${points.h - 12} Z`}
                  fill="url(#salesLine)"
                  opacity="0.35"
                />
              </>
            ) : (
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="rgb(148,163,184)" fontSize="14">
                Sem dados
              </text>
            )}
          </svg>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-xs font-semibold text-slate-400">Lucro de hoje</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {loading ? '-' : fmtMoney.format(Number(summary?.profit_today || 0))} MZN
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-xs font-semibold text-slate-400">Lucro do mês</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {loading ? '-' : fmtMoney.format(Number(summary?.profit_month || 0))} MZN
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
