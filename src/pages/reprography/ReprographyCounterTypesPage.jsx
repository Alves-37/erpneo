import { useEffect, useMemo, useState } from 'react'

import {
  createPrinterCounterType,
  deletePrinterCounterType,
  listPrinterCounterTypes,
  updatePrinterCounterType,
} from '../../api/printers.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

export default function ReprographyCounterTypesPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isReprography = businessType === 'reprography' || businessType === 'reprografia'

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const canSave = useMemo(() => code.trim().length > 0 && name.trim().length > 0, [code, name])

  const effectiveEstId = isAdmin ? (establishment?.id || undefined) : undefined

  function resetForm() {
    setEditing(null)
    setCode('')
    setName('')
    setIsActive(true)
  }

  async function load() {
    if (!isReprography) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await listPrinterCounterTypes({ establishment_id: effectiveEstId, include_inactive: true })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar os tipos de contador.'
      toast.error(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextVersion, branch?.id, establishment?.id])

  function openCreate() {
    resetForm()
    setOpenModal(true)
  }

  function openEdit(row) {
    setEditing(row)
    setCode(row?.code || '')
    setName(row?.name || '')
    setIsActive(row?.is_active ?? true)
    setOpenModal(true)
  }

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!isAdmin) return
    if (!canSave) return

    setSaving(true)
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        is_active: Boolean(isActive),
      }
      if (isAdmin) payload.establishment_id = effectiveEstId ?? null

      if (editing?.id) {
        await updatePrinterCounterType(editing.id, payload)
        toast.success('Tipo atualizado.')
      } else {
        await createPrinterCounterType(payload)
        toast.success('Tipo criado.')
      }
      setOpenModal(false)
      resetForm()
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível salvar agora.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function requestDelete(row) {
    setConfirmRow(row)
    setOpenConfirm(true)
  }

  async function confirmDelete() {
    if (!confirmRow?.id) return
    setConfirmBusy(true)
    try {
      await deletePrinterCounterType(confirmRow.id)
      toast.success('Tipo removido.')
      setOpenConfirm(false)
      setConfirmRow(null)
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível remover agora.'
      toast.error(msg)
    } finally {
      setConfirmBusy(false)
    }
  }

  if (!isReprography) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        Esta página está disponível apenas para filiais de reprografia.
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Reprografia · Tipos de contador</div>
          <div className="mt-1 text-sm text-slate-300">Defina os tipos (P&B, Cor, etc.).</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!isAdmin}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white"
            title={!isAdmin ? 'Sem permissão' : ''}
          >
            Novo tipo
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-3">Código</div>
          <div className="col-span-6">Nome</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-800">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 font-semibold text-slate-100">{r.code}</div>
                <div className="col-span-6 text-slate-300">{r.name}</div>
                <div className="col-span-2 text-slate-300">{r.is_active ? 'Ativo' : 'Inativo'}</div>
                <div className="col-span-1 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100 disabled:opacity-60"
                    onClick={() => openEdit(r)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200 disabled:opacity-60"
                    onClick={() => requestDelete(r)}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhum tipo cadastrado.</div>
        )}
      </div>

      <Modal
        open={openModal}
        title={editing?.id ? 'Editar tipo' : 'Novo tipo'}
        onClose={() => {
          if (saving) return
          setOpenModal(false)
          resetForm()
        }}
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          {!isAdmin ? <div className="text-sm text-amber-300">Sem permissão para gerir tipos.</div> : null}

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Código</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: BW"
              disabled={!isAdmin || saving}
              required
            />
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Nome</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Ex: Preto e Branco"
              disabled={!isAdmin || saving}
              required
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
              disabled={!isAdmin || saving}
            />
            Ativo
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpenModal(false)
                resetForm()
              }}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isAdmin || saving || !canSave}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openConfirm}
        title="Apagar tipo"
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmRow(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja apagar o tipo <span className="font-semibold text-white">{confirmRow?.code}</span>?
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={confirmBusy}
              onClick={() => {
                setOpenConfirm(false)
                setConfirmRow(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmDelete}
              className="rounded-xl border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 px-4 py-2.5 text-sm font-semibold text-rose-100 disabled:opacity-60"
            >
              {confirmBusy ? 'Apagando...' : 'Apagar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
