import { useEffect, useMemo, useState } from 'react'

import { createEstablishment, deleteEstablishment, listEstablishments, updateEstablishment } from '../../api/establishments.js'
import { getMyBranch } from '../../api/branches.js'
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

export default function EstablishmentsPage() {
  const contextVersion = useAuthStore((s) => s.contextVersion)
  const bumpContext = useAuthStore((s) => s.bumpContext)
  const branch = useAuthStore((s) => s.branch)
  const me = useAuthStore((s) => s.me)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  const title = useMemo(() => (editing ? 'Editar ponto' : 'Novo ponto'), [editing])

  function resetForm() {
    setEditing(null)
    setName('')
    setIsActive(true)
    setOpenModal(false)
  }

  async function makeDefault(row) {
    if (!row?.id) return
    if (!isAdmin) return
    try {
      await updateEstablishment(row.id, { is_default: true })
      toast.success('Ponto principal atualizado.')
      await load()
      bumpContext()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível definir como principal agora.')
    }
  }

  function requestDelete(row) {
    setDeleteRow(row)
    setOpenDelete(true)
  }

  async function confirmDelete() {
    if (!deleteRow?.id) return
    if (!isAdmin) return

    setDeleting(true)
    try {
      await deleteEstablishment(deleteRow.id)
      toast.success('Ponto excluído.')
      setOpenDelete(false)
      setDeleteRow(null)
      await load()
      bumpContext()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível excluir agora.')
    } finally {
      setDeleting(false)
    }
  }

  function openCreate() {
    resetForm()
    setOpenModal(true)
  }

  function openEdit(row) {
    setEditing(row)
    setName(row?.name || '')
    setIsActive(Boolean(row?.is_active))
    setOpenModal(true)
  }

  async function load() {
    setLoading(true)
    try {
      const b = branch?.id ? branch : await getMyBranch()
      const list = await listEstablishments({ branch_id: b?.id })
      setRows(Array.isArray(list) ? list : [])
    } catch {
      setRows([])
      toast.error('Não foi possível carregar os pontos agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextVersion, branch?.id])

  async function onSave(e) {
    e.preventDefault()

    if (!isAdmin) {
      toast.error('Sem permissão.')
      return
    }

    if (!String(name || '').trim()) {
      toast.error('Informe o nome do ponto.')
      return
    }

    setSaving(true)
    try {
      if (editing?.id) {
        await updateEstablishment(editing.id, { name: String(name).trim(), is_active: Boolean(isActive) })
        toast.success('Ponto atualizado.')
      } else {
        const b = branch?.id ? branch : await getMyBranch()
        await createEstablishment({ branch_id: Number(b?.id), name: String(name).trim(), is_active: Boolean(isActive) })
        toast.success('Ponto criado.')
      }
      resetForm()
      await load()
      bumpContext()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível salvar agora.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    if (!row?.id) return
    try {
      await updateEstablishment(row.id, { is_active: !row.is_active })
      toast.success(row.is_active ? 'Ponto desativado.' : 'Ponto ativado.')
      await load()
      bumpContext()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível alterar o status agora.')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Pontos de venda</div>
          <div className="mt-1 text-sm text-slate-300">Gerencie os pontos (estabelecimentos) da filial atual</div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={!isAdmin}
          className="w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Novo ponto
        </button>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-300">Carregando...</div>
      ) : rows.length ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-white truncate" title={r.name || ''}>
                        {r.name}
                      </div>
                      <div className="flex gap-1.5">
                        {r.is_default ? (
                          <span className="inline-flex rounded-full border border-brand-900/60 bg-brand-950/30 px-2 py-0.5 text-[10px] font-semibold text-brand-200 whitespace-nowrap">
                            Principal
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                            r.is_active
                              ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
                              : 'border-rose-900/60 bg-rose-950/30 text-rose-200'
                          }`}
                        >
                          {r.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">ID: {r.id}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-60"
                    disabled={!isAdmin || r.is_default}
                    onClick={() => makeDefault(r)}
                  >
                    Principal
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-60"
                    disabled={!isAdmin}
                    onClick={() => openEdit(r)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-60"
                    disabled={!isAdmin}
                    onClick={() => toggleActive(r)}
                  >
                    {r.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-60"
                    disabled={!isAdmin || r.is_default}
                    onClick={() => requestDelete(r)}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-300">Nenhum ponto encontrado.</div>
      )}

      <Modal
        open={openModal}
        title={title}
        onClose={() => {
          if (!saving) resetForm()
        }}
      >
        <form className="grid gap-4" onSubmit={onSave}>
          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Nome</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: Ponto Principal"
              type="text"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
            />
            Ativo
          </label>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openDelete}
        title="Confirmar exclusão"
        onClose={() => {
          if (!deleting) {
            setOpenDelete(false)
            setDeleteRow(null)
          }
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Deseja apagar o ponto <span className="font-semibold text-white">{deleteRow?.name}</span>?
          </div>
          <div className="text-xs text-slate-400">
            Nota: se existirem registros vinculados (ex: caixas, vendas, impressoras), o sistema vai bloquear a exclusão.
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setOpenDelete(false)
                setDeleteRow(null)
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting || !isAdmin}
              onClick={confirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {deleting ? 'Apagando...' : 'Apagar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
