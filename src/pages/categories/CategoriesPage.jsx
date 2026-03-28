import { useEffect, useMemo, useState } from 'react'

import { createProductCategory, deleteProductCategory, listProductCategories, updateProductCategory } from '../../api/productCategories.js'
import { getMyBranch } from '../../api/branches.js'
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

export default function CategoriesPage() {
  const me = useAuthStore((s) => s.me)
  const token = useAuthStore((s) => s.token)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const [branch, setBranch] = useState(null)
  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
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
      const rows = await listProductCategories()
      setItems(rows || [])
    } catch {
      setItems([])
      toast.error('Não foi possível carregar categorias agora.')
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
    setColor('')
  }

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!isAdmin) return
    if (!canSave) return

    setSaving(true)
    try {
      if (editing?.id) {
        await updateProductCategory(editing.id, { name: name.trim(), color: color || null })
        toast.success('Categoria atualizada.')
      } else {
        await createProductCategory({ name: name.trim(), color: color || null })
        toast.success('Categoria criada.')
      }
      setOpenModal(false)
      resetForm()
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível salvar a categoria agora.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(item) {
    if (!isAdmin) return
    if (!item?.id) return

    const ok = window.confirm(`Remover a categoria "${item?.name}"?`)
    if (!ok) return

    try {
      await deleteProductCategory(item.id)
      toast.success('Categoria removida.')
      await load()
    } catch (err) {
      const msg = err?.response?.data?.detail
      toast.error(msg || 'Não foi possível remover a categoria agora.')
    }
  }

  return (
    <div className="h-full overflow-hidden flex flex-col p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Categorias</div>
          <div className="mt-1 text-sm text-slate-300">Organize os seus produtos por categoria</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="flex-1 sm:flex-none rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 font-semibold"
          >
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm()
              setOpenModal(true)
            }}
            disabled={!isAdmin}
            className="flex-1 sm:flex-none rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/20"
          >
            Nova categoria
          </button>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-900">
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
              <div className="text-sm text-slate-400">Carregando categorias...</div>
            </div>
          ) : !items?.length ? (
            <div className="text-center py-12 text-sm text-slate-400">Sem categorias registadas</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(items || []).map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full border border-slate-700 shrink-0 shadow-sm"
                      style={{ backgroundColor: c?.color || '#0f172a' }}
                      title={c?.color || ''}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate" title={c.name}>
                        {c.name}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {c.business_type}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => {
                        setEditing(c)
                        setName(c.name || '')
                        setColor(c?.color || '')
                        setOpenModal(true)
                      }}
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 px-3 py-2 text-xs font-bold text-slate-100 transition-all active:scale-95"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => onDelete(c)}
                      className="flex-1 rounded-xl border border-rose-900/30 bg-rose-950/10 hover:bg-rose-950/30 disabled:opacity-60 px-3 py-2 text-xs font-bold text-rose-200 transition-all active:scale-95"
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
        open={openModal}
        title={editing?.id ? 'Editar categoria' : 'Nova categoria'}
        onClose={() => {
          setOpenModal(false)
          resetForm()
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {!isAdmin ? (
            <div className="text-sm text-amber-300">Sem permissão para gerir categorias.</div>
          ) : null}

          <div>
            <div className="text-xs font-semibold text-slate-400">Nome</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Ex: Medicamentos"
              disabled={!isAdmin || saving}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400">Cor</div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={color || '#0f172a'}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 rounded-lg border border-slate-800 bg-slate-950 p-1"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpenModal(false)
                resetForm()
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
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
