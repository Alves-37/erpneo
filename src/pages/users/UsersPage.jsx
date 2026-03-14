import { useEffect, useState } from 'react'

import { createUser, deleteUser, listUsers, updateUser } from '../../api/users.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'admin',
    is_active: true,
  })

  function resetForm() {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'admin',
      is_active: true,
    })
    setEditing(null)
    setOpenModal(false)
  }

  async function load() {
    setLoading(true)
    try {
      const data = await listUsers()
      setRows(data || [])
    } catch {
      toast.error('Não foi possível carregar agora.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [contextVersion])

  function openCreate() {
    resetForm()
    setOpenModal(true)
  }

  function openEdit(row) {
    setFormData({
      name: row.name || '',
      username: row.username || '',
      email: row.email || '',
      password: '',
      role: row.role || 'admin',
      is_active: row.is_active ?? true,
    })
    setEditing(row)
    setOpenModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      toast.error('Preencha nome, username e e-mail.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password.trim() || undefined,
        role: formData.role,
      }
      if (editing) {
        await updateUser(editing.id, payload)
        toast.success('Usuário atualizado.')
      } else {
        if (!payload.password) {
          toast.error('Informe a senha para criar um usuário.')
          return
        }
        await createUser(payload)
        toast.success('Usuário criado.')
      }
      resetForm()
      await load()
    } catch {
      toast.error('Não foi possível salvar agora.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    const ok = window.confirm(`Excluir o usuário "${row.name}"?`)
    if (!ok) return
    try {
      await deleteUser(row.id)
      toast.success('Usuário excluído.')
      await load()
    } catch {
      toast.error('Não foi possível excluir agora.')
    }
  }

  async function toggleActive(row) {
    try {
      await updateUser(row.id, { is_active: !row.is_active })
      toast.success(row.is_active ? 'Usuário desativado.' : 'Usuário ativado.')
      await load()
    } catch {
      toast.error('Não foi possível alterar o status agora.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Usuários</div>
          <div className="mt-1 text-sm text-slate-300">Gerencie os funcionários da empresa</div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Novo Usuário
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <>
            <div className="col-span-3">Nome</div>
            <div className="col-span-3">Username</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-3 text-right">Ações</div>
          </>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-800">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <>
                  <div className="col-span-3 font-semibold text-slate-100">{r.name}</div>
                  <div className="col-span-3 text-slate-300">{r.username}</div>
                  <div className="col-span-3">
                    <span
                      className={`inline-flex rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${
                        r.is_active
                          ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
                          : 'border-rose-900/60 bg-rose-950/30 text-rose-200'
                      }`}
                    >
                      {r.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                      onClick={() => toggleActive(r)}
                    >
                      {r.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                      onClick={() => openEdit(r)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                      onClick={() => handleDelete(r)}
                    >
                      Excluir
                    </button>
                  </div>
                </>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>

      <Modal
        open={openModal}
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}
        onClose={resetForm}
      >
        <form onSubmit={handleSave} className="grid gap-4">
          <>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Nome</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Username</label>
              <input
                value={formData.username}
                onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="usuario"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">E-mail</label>
              <input
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="email@exemplo.com"
                type="email"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Senha</label>
              <input
                value={formData.password}
                onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder={editing ? 'Nova senha (opcional)' : 'Senha'}
                type="password"
                required={!editing}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Papel (role)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="admin">Admin</option>
                <option value="manager">Gerente</option>
                <option value="cashier">Caixa</option>
                <option value="waiter">Garçom</option>
              </select>
            </div>
          </>

          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-brand-600 focus:ring-2 focus:ring-brand-600"
            />
            <label htmlFor="is_active" className="text-sm text-slate-200">
              Ativo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
