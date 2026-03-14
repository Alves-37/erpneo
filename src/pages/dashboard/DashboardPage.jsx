import { useEffect, useMemo, useState } from 'react'
import { getDashboardSalesSeries, getDashboardSummary } from '../../api/dashboard.js'
import { useAuthStore } from '../../store/authStore.js'

export default function DashboardPage() {
  const me = useAuthStore((s) => s.me)
  const isCashier = (me?.role || '').toLowerCase() === 'cashier'

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [series, setSeries] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [s, ss] = await Promise.all([getDashboardSummary(), getDashboardSalesSeries({ days: 30 })])
        if (!mounted) return
        setSummary(s)
        setSeries(ss || [])
      } catch {
        if (!mounted) return
        setSummary(null)
        setSeries([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

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
    const w = 600
    const h = 160
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Dashboard</div>
          <div className="mt-1 text-sm text-slate-300">{isCashier ? 'Resumo do seu turno' : 'Resumo do seu negócio'}</div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
        >
          Atualizar
        </button>
      </div>

      <div className={`mt-6 grid grid-cols-1 gap-4 ${isCashier ? 'md:grid-cols-1 xl:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
        {!isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-semibold text-slate-400">Produtos</div>
            <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : summary?.products_total ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Total cadastrado</div>
          </div>
        )}

        {!isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-semibold text-slate-400">Baixo estoque (padrão)</div>
            <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : summary?.low_stock_default_count ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Local padrão</div>
          </div>
        )}

        {!isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-semibold text-slate-400">Baixo estoque (armazém)</div>
            <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : summary?.low_stock_warehouse_count ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Somente armazém</div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs font-semibold text-slate-400">Vendas de hoje</div>
          <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.sales_today || 0))}</div>
          <div className="mt-2 text-xs text-slate-400">MZN</div>
        </div>

        {!isCashier && (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-400">Valor em estoque</div>
              <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.stock_value_cost || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN (custo · local padrão)</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-400">Valor potencial de vendas</div>
              <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.stock_value_potential || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN (preço · local padrão)</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-400">Vendas do mês</div>
              <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.sales_month || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-400">Lucro (mês)</div>
              <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.profit_month || 0))}</div>
              <div className="mt-2 text-xs text-slate-400">MZN</div>
            </div>
          </>
        )}

        {isCashier && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-semibold text-slate-400">Lucro de hoje</div>
            <div className="mt-2 text-3xl font-semibold text-white">{loading ? '-' : fmtMoney.format(Number(summary?.profit_today || 0))}</div>
            <div className="mt-2 text-xs text-slate-400">MZN</div>
          </div>
        )}
      </div>

      {!isCashier && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Vendas (últimos 30 dias)</div>
            <div className="mt-1 text-xs text-slate-400">Total diário</div>
          </div>
          <div className="text-xs text-slate-400">Máx: {fmtMoney.format(Number(points.max || 0))}</div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <svg viewBox={`0 0 ${points.w} ${points.h}`} className="h-44 w-full" role="img" aria-label="Gráfico de vendas">
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

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
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
