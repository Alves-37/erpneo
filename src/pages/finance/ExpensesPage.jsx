import { useEffect, useState } from 'react'

import {
  createExpense,
  deleteExpense,
  listExpenses,
  payExpense,
  updateExpense,
} from '../../api/expenses.js'
import {
  createExpenseCategory,
  deleteExpenseCategory,
  listExpenseCategories,
  updateExpenseCategory,
} from '../../api/expenseCategories.js'
import { toast } from '../../services/toast.js'

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

function money(n) {
  const v = Number(n || 0)
  return v.toFixed(2)
}

function parseAmount(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  const normalized = s.replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function statusBadge(status) {
  if (status === 'paid')
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
        Pago
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
      Pendente
    </span>
  )
}

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])

  const [openExpenseForm, setOpenExpenseForm] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    due_date: '',
    category_id: '',
  })

  const [openCategoryForm, setOpenCategoryForm] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [categoryForm, setCategoryForm] = useState({ name: '' })

  const [openDelete, setOpenDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)

  const [openPay, setOpenPay] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payRow, setPayRow] = useState(null)

  function addAmount(delta) {
    const current = parseAmount(expenseForm.amount)
    const next = Math.max(0, Math.round((current + delta) * 100) / 100)
    setExpenseForm({ ...expenseForm, amount: next ? String(next) : '' })
  }

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      const [data, cats] = await Promise.all([
        listExpenses({ status: '', limit: 200 }),
        listExpenseCategories(),
      ])
      setRows(data || [])
      setCategories(cats || [])
    } catch {
      toast.error('Não foi possível carregar despesas agora.')
      setRows([])
      setCategories([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      load({ silent: true })
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  function openCreateExpense() {
    setEditingExpense(null)
    setExpenseForm({
      description: '',
      amount: '',
      due_date: '',
      category_id: '',
    })
    setOpenExpenseForm(true)
  }

  function openEditExpense(row) {
    setEditingExpense(row)
    setExpenseForm({
      description: row.description || '',
      amount: row.amount ? String(row.amount) : '',
      due_date: row.due_date || '',
      category_id: row.category_id ? String(row.category_id) : '',
    })
    setOpenExpenseForm(true)
  }

  async function saveExpense() {
    const description = expenseForm.description?.trim()
    const amount = parseFloat(expenseForm.amount || '0')
    const due_date = expenseForm.due_date
    const category_id = expenseForm.category_id ? Number(expenseForm.category_id) : null

    if (!description) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (!amount || amount <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }
    if (!due_date) {
      toast.error('Data de vencimento é obrigatória')
      return
    }

    setSavingExpense(true)
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description,
          amount,
          due_date,
          category_id,
        })
        toast.success('Despesa atualizada')
      } else {
        await createExpense({
          description,
          amount,
          due_date,
          category_id,
        })
        toast.success('Despesa criada')
      }
      setOpenExpenseForm(false)
      load({ silent: true })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar despesa')
    } finally {
      setSavingExpense(false)
    }
  }

  async function requestDelete(row) {
    setDeleteRow(row)
    setOpenDelete(true)
  }

  async function confirmDelete() {
    if (!deleteRow) return
    setDeleting(true)
    try {
      await deleteExpense(deleteRow.id)
      toast.success('Despesa removida')
      setOpenDelete(false)
      setDeleteRow(null)
      load({ silent: true })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao remover despesa')
    } finally {
      setDeleting(false)
    }
  }

  async function requestPay(row) {
    setPayRow(row)
    setOpenPay(true)
  }

  async function confirmPay() {
    if (!payRow) return
    setPaying(true)
    try {
      await payExpense(payRow.id, {})
      toast.success('Despesa marcada como paga')
      setOpenPay(false)
      setPayRow(null)
      load({ silent: true })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao pagar despesa')
    } finally {
      setPaying(false)
    }
  }

  function openCreateCategory() {
    setEditingCategory(null)
    setCategoryForm({ name: '' })
    setOpenCategoryForm(true)
  }

  function openEditCategory(row) {
    setEditingCategory(row)
    setCategoryForm({ name: row.name || '' })
    setOpenCategoryForm(true)
  }

  async function saveCategory() {
    const name = categoryForm.name?.trim()
    if (!name) {
      toast.error('Nome da categoria é obrigatório')
      return
    }
    setSavingCategory(true)
    try {
      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, { name })
        toast.success('Categoria atualizada')
      } else {
        await createExpenseCategory({ name })
        toast.success('Categoria criada')
      }
      setOpenCategoryForm(false)
      load({ silent: true })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar categoria')
    } finally {
      setSavingCategory(false)
    }
  }

  async function requestDeleteCategory(row) {
    if (!window.confirm('Remover esta categoria? Despesas associadas ficarão sem categoria.')) return
    try {
      await deleteExpenseCategory(row.id)
      toast.success('Categoria removida')
      load({ silent: true })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao remover categoria')
    }
  }

  const filtered = rows.filter((r) => {
    const term = (q || '').toLowerCase()
    return (
      (r.description || '').toLowerCase().includes(term) ||
      (r.category_name || '').toLowerCase().includes(term) ||
      (r.status || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="h-full overflow-hidden flex flex-col p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Despesas</div>
          <div className="mt-1 text-sm text-slate-300">Contas a pagar e saídas de caixa</div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openCreateCategory}
            className="flex-1 sm:flex-none rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            + Categoria
          </button>
          <button
            type="button"
            onClick={openCreateExpense}
            className="flex-1 sm:flex-none rounded-xl px-4 py-2.5 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-900/20 transition-all active:scale-95"
          >
            + Despesa
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Pesquisar despesas..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-all"
          />
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-900">
        {/* Mobile: Card view */}
        <div className="md:hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
              <div className="text-sm text-slate-400">Carregando despesas...</div>
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-slate-800">
              {filtered.map((r) => (
                <div key={r.id} className="p-4 bg-slate-950/20 active:bg-slate-900 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white leading-tight mb-1 truncate">
                        {r.description}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {r.category_name || 'Sem categoria'}
                        </span>
                        <span className="text-slate-700">•</span>
                        <span className="text-[10px] text-slate-400">
                          Venc: {r.due_date}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-black text-white tabular-nums">
                        {money(r.amount)}
                      </div>
                      <div className="mt-1">{statusBadge(r.status)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {r.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditExpense(r)}
                          className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-100 transition-all active:scale-95"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => requestPay(r)}
                          className="flex-1 rounded-xl border border-emerald-900/30 bg-emerald-950/10 px-3 py-2 text-xs font-bold text-emerald-200 transition-all active:scale-95"
                        >
                          Pagar
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => requestDelete(r)}
                      className="flex-1 rounded-xl border border-rose-900/30 bg-rose-950/10 px-3 py-2 text-xs font-bold text-rose-200 transition-all active:scale-95"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-slate-500">Nenhuma despesa encontrada.</div>
          )}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block">
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">Carregando despesas...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/50 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Descrição</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Categoria</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Valor</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Vencimento</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase tracking-wider text-[10px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-950/40 transition-colors group">
                    <td className="px-4 py-3 text-white font-medium">{r.description}</td>
                    <td className="px-4 py-3 text-slate-400">{r.category_name || '-'}</td>
                    <td className="px-4 py-3 text-white font-bold tabular-nums">{money(r.amount)} MZN</td>
                    <td className="px-4 py-3 text-slate-400">{r.due_date}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditExpense(r)}
                              className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all"
                            >
                              EDITAR
                            </button>
                            <button
                              type="button"
                              onClick={() => requestPay(r)}
                              className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60 transition-all"
                            >
                              PAGAR
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => requestDelete(r)}
                          className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 bg-rose-900/40 text-rose-200 hover:bg-rose-900/60 transition-all"
                        >
                          REMOVER
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 font-medium italic">
                      Nenhuma despesa encontrada para esta pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      <Modal open={openExpenseForm} title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'} onClose={() => setOpenExpenseForm(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Descrição</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Valor (MZN)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addAmount(50)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => addAmount(100)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +100
              </button>
              <button
                type="button"
                onClick={() => addAmount(500)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => addAmount(1000)}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                +1000
              </button>
              <button
                type="button"
                onClick={() => setExpenseForm({ ...expenseForm, amount: '' })}
                className="rounded-lg px-3 py-1.5 text-xs border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                Limpar
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Data de vencimento</label>
            <input
              type="date"
              value={expenseForm.due_date}
              onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Categoria (opcional)</label>
            <select
              value={expenseForm.category_id}
              onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenExpenseForm(false)}
              className="rounded-lg px-4 py-2 text-sm border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveExpense}
              disabled={savingExpense}
              className="rounded-lg px-4 py-2 text-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {savingExpense ? 'Salvando...' : editingExpense ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Form Modal */}
      <Modal open={openCategoryForm} title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setOpenCategoryForm(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Nome</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenCategoryForm(false)}
              className="rounded-lg px-4 py-2 text-sm border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveCategory}
              disabled={savingCategory}
              className="rounded-lg px-4 py-2 text-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {savingCategory ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={openDelete} title="Remover Despesa" onClose={() => setOpenDelete(false)}>
        <div className="space-y-4">
          <p className="text-slate-300">
            Tem certeza que deseja remover a despesa <strong>{deleteRow?.description}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenDelete(false)}
              className="rounded-lg px-4 py-2 text-sm border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-lg px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pay Confirmation Modal */}
      <Modal open={openPay} title="Pagar Despesa" onClose={() => setOpenPay(false)}>
        <div className="space-y-4">
          <p className="text-slate-300">
            Confirmar pagamento da despesa <strong>{payRow?.description}</strong> no valor de{' '}
            <strong>{money(payRow?.amount)} MZN</strong>?
          </p>
          <p className="text-xs text-slate-400">Isso deduzirá o valor do caixa atualmente aberto.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenPay(false)}
              className="rounded-lg px-4 py-2 text-sm border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmPay}
              disabled={paying}
              className="rounded-lg px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {paying ? 'Pagando...' : 'Pagar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
