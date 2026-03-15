import { useEffect, useState } from 'react'

import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from '../../api/customers.js'
import { getBranch } from '../../api/branches.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from '../../services/toast.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

export default function CustomersPage() {
  const currentBranch = useAuthStore((s) => s.branch)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])

  const [actionsCustomer, setActionsCustomer] = useState(null)

  const [openForm, setOpenForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  const [openDelete, setOpenDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)

  const [openScope, setOpenScope] = useState(false)
  const [scopeRow, setScopeRow] = useState(null)
  const [scopeBranch, setScopeBranch] = useState(null)

  const [form, setForm] = useState({ name: '', nuit: '', email: '', phone: '', address: '' })

  async function openScopeModal(row) {
    setScopeRow(row)
    setScopeBranch(null)
    setOpenScope(true)
    const bid = Number(row?.branch_id)
    if (!Number.isFinite(bid) || bid <= 0) return
    try {
      const b = await getBranch(bid)
      setScopeBranch(b)
    } catch {
      // ignore
    }
  }

  function isCrossBranch(row) {
    const cb = Number(currentBranch?.id)
    const rb = Number(row?.branch_id)
    if (!Number.isFinite(cb) || cb <= 0) return false
    if (!Number.isFinite(rb) || rb <= 0) return false
    return cb !== rb
  }

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      const data = await listCustomers({ q })
      setRows(data || [])
    } catch {
      toast.error('Não foi possível carregar clientes agora.')
      setRows([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      load({ silent: true })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', nuit: '', email: '', phone: '', address: '' })
    setOpenForm(true)
  }

  function openEdit(row) {
    if (isCrossBranch(row)) {
      openScopeModal(row)
      return
    }
    setEditing(row)
    setForm({
      name: row.name || '',
      nuit: row.nuit || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
    })
    setOpenForm(true)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        nuit: form.nuit.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      }

      if (editing?.id) {
        await updateCustomer(editing.id, payload)
        toast.success('Cliente atualizado.')
      } else {
        await createCustomer(payload)
        toast.success('Cliente criado.')
      }

      setOpenForm(false)
      await load()
    } catch {
      toast.error('Não foi possível salvar cliente agora.')
    } finally {
      setSaving(false)
    }
  }

  function openDeleteModal(row) {
    if (isCrossBranch(row)) {
      openScopeModal(row)
      return
    }
    setDeleteRow(row)
    setOpenDelete(true)
  }

  async function confirmDelete() {
    if (!deleteRow?.id) return
    setDeleting(true)
    try {
      await deleteCustomer(deleteRow.id)
      toast.success('Cliente excluído.')
      setOpenDelete(false)
      setDeleteRow(null)
      await load()
    } catch (e) {
      const msg = e?.response?.data?.detail
      toast.error(msg || 'Não foi possível excluir cliente agora.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Finanças · Clientes</div>
          <div className="mt-1 text-sm text-slate-300">Cadastre clientes e organize a carteira</div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Novo cliente
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:w-72 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="Pesquisar cliente..."
        />
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-300">Carregando...</div>
      ) : rows.length ? (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-3"
              onClick={() => {
                if (isCrossBranch(r)) openScopeModal(r)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-white truncate" title={r.name || ''}>
                      {r.name}
                    </div>
                    {isCrossBranch(r) ? (
                      <span className="inline-flex rounded-full border border-amber-900/60 bg-amber-950/30 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                        Outra filial
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                    <div className="truncate" title={r.nuit || ''}>
                      <span className="text-slate-500">NUIT:</span> {r.nuit || '-'}
                    </div>
                    <div className="truncate" title={r.phone || r.email || ''}>
                      <span className="text-slate-500">Contacto:</span> {r.phone || r.email || '-'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActionsCustomer(r)
                  }}
                >
                  Ações
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-300">Nenhum cliente encontrado.</div>
      )}

      <Modal
        open={Boolean(actionsCustomer)}
        title={actionsCustomer?.name ? `Ações · ${actionsCustomer.name}` : 'Ações'}
        onClose={() => setActionsCustomer(null)}
      >
        <div className="grid gap-2">
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => {
              const c = actionsCustomer
              setActionsCustomer(null)
              if (!c) return
              openEdit(c)
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-4 py-3 text-sm font-semibold text-rose-200"
            onClick={() => {
              const c = actionsCustomer
              setActionsCustomer(null)
              if (!c) return
              openDeleteModal(c)
            }}
          >
            Excluir
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => setActionsCustomer(null)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal
        open={openForm}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        onClose={() => {
          if (!saving) setOpenForm(false)
        }}
      >
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-400">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              required
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">NUIT</label>
              <input
                value={form.nuit}
                onChange={(e) => setForm((f) => ({ ...f, nuit: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="email"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Endereço</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenForm(false)}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openScope}
        title="Cliente de outra filial"
        onClose={() => {
          setOpenScope(false)
          setScopeRow(null)
          setScopeBranch(null)
        }}
      >
        <div className="grid gap-3">
          <div className="text-sm text-slate-200">
            Este cliente pertence a outra filial/empresa e não pode ser alterado a partir da filial atual.
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
            <div className="grid gap-1">
              <div className="text-slate-400 text-xs font-semibold">Cliente</div>
              <div className="text-slate-100 font-semibold">{scopeRow?.name}</div>
            </div>
            <div className="mt-3 grid gap-1">
              <div className="text-slate-400 text-xs font-semibold">Empresa (company_id)</div>
              <div className="text-slate-200">{scopeRow?.company_id ?? '-'}</div>
            </div>
            <div className="mt-3 grid gap-1">
              <div className="text-slate-400 text-xs font-semibold">Filial (branch)</div>
              <div className="text-slate-200">
                {scopeBranch?.name ? `${scopeBranch.name} (#${scopeBranch.id})` : scopeRow?.branch_id ? `#${scopeRow.branch_id}` : '-'}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setOpenScope(false)
                setScopeRow(null)
                setScopeBranch(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Entendi
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openDelete}
        title="Excluir cliente"
        onClose={() => {
          if (!deleting) {
            setOpenDelete(false)
            setDeleteRow(null)
          }
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja excluir o cliente <span className="font-semibold text-white">{deleteRow?.name}</span>?
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpenDelete(false)
                setDeleteRow(null)
              }}
              disabled={deleting}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-xl border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-60"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
