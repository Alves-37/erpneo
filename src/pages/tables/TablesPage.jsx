import { useEffect, useState } from 'react'

import { createRestaurantTable, deleteRestaurantTable, listRestaurantTables, updateRestaurantTable } from '../../api/restaurantTables.js'
import { toast } from '../../services/toast.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

export default function TablesPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [number, setNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const rows = await listRestaurantTables()
      setItems(rows || [])
    } catch {
      toast.error('Não foi possível carregar mesas agora.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm() {
    setEditing(null)
    setNumber('')
    setCapacity('4')
    setIsActive(true)
  }

  async function onSubmit(e) {
    e.preventDefault()
    const n = Number(number)
    const c = Number(capacity)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Informe o número da mesa.')
      return
    }
    if (!Number.isFinite(c) || c <= 0) {
      toast.error('Informe a capacidade.')
      return
    }

    setSaving(true)
    try {
      const payload = { number: n, capacity: c, is_active: Boolean(isActive) }
      if (editing?.id) {
        await updateRestaurantTable(editing.id, payload)
        toast.success('Mesa atualizada.')
      } else {
        await createRestaurantTable(payload)
        toast.success('Mesa criada.')
      }
      setOpenForm(false)
      resetForm()
      await load()
    } catch {
      toast.error('Não foi possível salvar mesa agora.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(row) {
    const ok = window.confirm(`Apagar a mesa ${row.number}?`)
    if (!ok) return
    try {
      await deleteRestaurantTable(row.id)
      toast.success('Mesa apagada.')
      await load()
    } catch {
      toast.error('Não foi possível apagar a mesa agora.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Mesas</div>
          <div className="mt-1 text-sm text-slate-300">Gerir mesas e capacidade</div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setOpenForm(true)
          }}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Nova mesa
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-3">Mesa</div>
          <div className="col-span-3">Capacidade</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-3 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : items.length ? (
          <div className="divide-y divide-slate-800">
            {items.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 font-semibold text-slate-100">{row.number}</div>
                <div className="col-span-3 text-slate-300">{row.capacity}</div>
                <div className="col-span-3 text-slate-300">{row.is_active ? 'Ativa' : 'Inativa'}</div>
                <div className="col-span-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100"
                    onClick={() => {
                      setEditing(row)
                      setNumber(String(row.number))
                      setCapacity(String(row.capacity))
                      setIsActive(Boolean(row.is_active))
                      setOpenForm(true)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200"
                    onClick={() => onDelete(row)}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhuma mesa cadastrada.</div>
        )}
      </div>

      <Modal
        open={openForm}
        title={editing?.id ? 'Editar mesa' : 'Nova mesa'}
        onClose={() => {
          if (!saving) setOpenForm(false)
        }}
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Número da mesa</div>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="numeric"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Capacidade</div>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              inputMode="numeric"
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
            Mesa ativa
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenForm(false)}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
