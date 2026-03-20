import { useState } from 'react'
import { useAuthStore } from '../../store/authStore.js'

import SuppliersPage from './SuppliersPage.jsx'
import CustomersPage from './CustomersPage.jsx'
import ExpensesPage from './ExpensesPage.jsx'

export default function FinancePage() {
  const me = useAuthStore((s) => s.me)
  const role = (me?.role || '').toString().trim().toLowerCase()
  const isCashier = role === 'cashier'

  const [tab, setTab] = useState('expenses')

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Finanças</div>
          <div className="mt-1 text-sm text-slate-300">Controlo operacional, fornecedores, clientes e despesas</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!isCashier ? (
          <button
            type="button"
            onClick={() => setTab('suppliers')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'suppliers'
                ? 'bg-brand-600 text-white'
                : 'border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
            }`}
          >
            Fornecedores
          </button>
        ) : null}
        {!isCashier ? (
          <button
            type="button"
            onClick={() => setTab('customers')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'customers'
                ? 'bg-brand-600 text-white'
                : 'border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
            }`}
          >
            Clientes
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setTab('expenses')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'expenses'
              ? 'bg-brand-600 text-white'
              : 'border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
          }`}
        >
          Despesas
        </button>
      </div>

      <div className="mt-6">
        {tab === 'suppliers' && !isCashier ? <SuppliersPage /> : null}

        {tab === 'customers' && !isCashier ? <CustomersPage /> : null}

        {tab === 'expenses' ? <ExpensesPage /> : null}
      </div>
    </div>
  )
}
