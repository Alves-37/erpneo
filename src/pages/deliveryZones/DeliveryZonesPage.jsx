import { useEffect, useMemo, useState } from 'react'

import { getMyBranch } from '../../api/branches.js'
import { createDeliveryZone, deleteDeliveryZone, listDeliveryZones, updateDeliveryZone } from '../../api/deliveryZones.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

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

function parseKeywordsText(text) {
  return (text || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function DeliveryZonesPage() {
  const me = useAuthStore((s) => s.me)
  const token = useAuthStore((s) => s.token)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const [branch, setBranch] = useState(null)
  const branchId = branch?.id || null

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [fee, setFee] = useState('0')
  const [keywordsText, setKeywordsText] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const canSave = useMemo(() => name.trim().length > 0, [name])

  async function load() {
    setLoading(true)
    try {
      if (!token) {
        setItems([])
        return
      }
      const b = await getMyBranch()
      setBranch(b)
      const rows = await listDeliveryZones({ branchId: b?.id })
      setItems(Array.isArray(rows) ? rows : [])
    } catch {
      setItems([])
      toast.error('Não foi possível carregar zonas agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, contextVersion])

  function resetForm() {
    setEditing(null)
    setName('')
    setFee('0')
    setKeywordsText('')
    setIsActive(true)
  }

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!isAdmin) return
    if (!branchId) {
      toast.error('Filial inválida.')
      return
    }
    if (!canSave) {
      toast.error('Informe o nome do bairro/zona.')
      return
    }

    const feeValue = Number(String(fee).replace(',', '.'))
    if (!Number.isFinite(feeValue) || feeValue < 0) {
      toast.error('Informe uma taxa válida.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        branch_id: Number(branchId),
        name: name.trim(),
        fee: feeValue,
        keywords: parseKeywordsText(keywordsText),
        is_active: Boolean(isActive),
      }

      if (editing?.id) {
        await updateDeliveryZone(editing.id, payload)
        toast.success('Zona atualizada.')
      } else {
        await createDeliveryZone(payload)
        toast.success('Zona criada.')
      }
      setOpenForm(false)
      resetForm()
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível salvar a zona agora.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(row) {
    if (!isAdmin) return
    if (!row?.id) return
    const ok = window.confirm(`Remover a zona "${row?.name}"?`)
    if (!ok) return

    try {
      await deleteDeliveryZone(row.id)
      toast.success('Zona removida.')
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível remover a zona agora.')
    }
  }

  return (
    <div className="h-[calc(100vh-56px-48px)] overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Zonas de entrega</div>
          <div className="mt-1 text-sm text-slate-300">Cadastre bairros e taxa de entrega por filial</div>
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
            onClick={() => {
              resetForm()
              setOpenForm(true)
            }}
            disabled={!isAdmin}
            className="rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-4 py-2.5 text-sm text-white"
          >
            Nova zona
          </button>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-900">
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-slate-300">Carregando...</div>
          ) : !items?.length ? (
            <div className="text-sm text-slate-300">Sem zonas cadastradas.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(items || []).map((z) => (
                <div key={z.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-sm font-semibold text-white truncate" title={z.name}>
                    {z.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Taxa: {Number(z.fee || 0).toFixed(2)} MT</div>
                  <div className="mt-1 text-xs text-slate-400">Status: {z.is_active ? 'Ativa' : 'Inativa'}</div>

                  <div className="mt-2 text-xs text-slate-400">
                    Keywords:{' '}
                    {Array.isArray(z.keywords) && z.keywords.length ? z.keywords.join(', ') : '-'}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => {
                        setEditing(z)
                        setName(z.name || '')
                        setFee(String(z.fee ?? 0))
                        setKeywordsText(Array.isArray(z.keywords) ? z.keywords.join(', ') : '')
                        setIsActive(Boolean(z.is_active))
                        setOpenForm(true)
                      }}
                      className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 px-3 py-2 text-xs text-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => onDelete(z)}
                      className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 px-3 py-2 text-xs text-slate-100"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={openForm}
        title={editing?.id ? 'Editar zona' : 'Nova zona'}
        onClose={() => {
          if (!saving) {
            setOpenForm(false)
            resetForm()
          }
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {!isAdmin ? <div className="text-sm text-amber-300">Sem permissão para gerir zonas.</div> : null}

          <div>
            <div className="text-xs font-semibold text-slate-400">Bairro/Zona</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Ex: Matola Rio"
              disabled={!isAdmin || saving}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400">Taxa (MT)</div>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              inputMode="decimal"
              type="text"
              disabled={!isAdmin || saving}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400">Keywords (separadas por vírgula)</div>
            <input
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Ex: matola, rio, matola rio"
              disabled={!isAdmin || saving}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
            />
            Zona ativa
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpenForm(false)
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
              className="rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-4 py-2.5 text-sm text-white"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
