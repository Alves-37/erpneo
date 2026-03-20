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
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Despesas</div>
          <div className="mt-1 text-sm text-slate-300">Contas a pagar e saídas de caixa</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreateCategory}
            className="rounded-xl px-4 py-2 text-sm font-semibold border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800"
          >
            + Categoria
          </button>
          <button
            type="button"
            onClick={openCreateExpense}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700"
          >
            + Despesa
          </button>
        </div>
      </div>

      <div className="mt-5">
        <input
          type="text"
          placeholder="Pesquisar descrição, categoria ou status..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      {loading ? (
        <div className="mt-6 text-center text-slate-400">Carregando...</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Vencimento</th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-950">
                  <td className="px-4 py-3 text-white">{r.description}</td>
                  <td className="px-4 py-3 text-slate-300">{r.category_name || '-'}</td>
                  <td className="px-4 py-3 text-white">{money(r.amount)} MZN</td>
                  <td className="px-4 py-3 text-slate-300">{r.due_date}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditExpense(r)}
                            className="text-xs rounded px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => requestPay(r)}
                            className="text-xs rounded px-2 py-1 bg-green-800 text-green-200 hover:bg-green-700"
                          >
                            Pagar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => requestDelete(r)}
                        className="text-xs rounded px-2 py-1 bg-red-800 text-red-200 hover:bg-red-700"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma despesa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
