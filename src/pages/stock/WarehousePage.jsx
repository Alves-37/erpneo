import { useEffect, useState } from 'react'

import { createStockLocation, deleteStockLocation, listStockLocations, updateStockLocation } from '../../api/stockLocations.js'
import { listLowStock } from '../../api/productStocks.js'
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

export default function WarehousePage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [loadingLow, setLoadingLow] = useState(false)
  const [lowRows, setLowRows] = useState([])

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ type: 'store', name: '', is_default: false, is_active: true })

  async function load() {
    setLoading(true)
    try {
      const data = await listStockLocations()
      setRows(data || [])
    } catch {
      toast.error('Não foi possível carregar locais agora.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!onlyLowStock) {
      setLowRows([])
      return
    }

    let mounted = true
    ;(async () => {
      setLoadingLow(true)
      try {
        const data = await listLowStock({ scope: 'warehouse', limit: 200, offset: 0 })
        if (mounted) setLowRows(data || [])
      } catch {
        if (mounted) {
          setLowRows([])
          toast.error('Não foi possível carregar baixo estoque do armazém agora.')
        }
      } finally {
        if (mounted) setLoadingLow(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [onlyLowStock])

  function openCreate() {
    setEditing(null)
    setForm({ type: 'store', name: '', is_default: false, is_active: true })
    setOpenForm(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm({
      type: row.type,
      name: row.name,
      is_default: Boolean(row.is_default),
      is_active: Boolean(row.is_active),
    })
    setOpenForm(true)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Informe o nome do local.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        is_default: Boolean(form.is_default),
        is_active: Boolean(form.is_active),
      }

      if (editing?.id) {
        await updateStockLocation(editing.id, payload)
        toast.success('Local atualizado.')
      } else {
        await createStockLocation(payload)
        toast.success('Local criado.')
      }

      setOpenForm(false)
      await load()
    } catch {
      toast.error('Não foi possível salvar local agora.')
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
      await deleteStockLocation(confirmRow.id)
      toast.success('Local excluído.')
      setOpenConfirm(false)
      setConfirmRow(null)
      await load()
    } catch (e) {
      const msg = e?.response?.data?.detail
      toast.error(msg || 'Não foi possível excluir local agora.')
    } finally {
      setConfirmBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Armazém</div>
          <div className="mt-1 text-sm text-slate-300">Loja principal, armazém e outros locais</div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Novo local
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-5">Local</div>
          <div className="col-span-3">Tipo</div>
          <div className="col-span-2">Padrão</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-800">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-5 font-semibold text-slate-100">{r.name}</div>
                <div className="col-span-3 text-slate-300">{r.type === 'store' ? 'Loja' : 'Armazém'}</div>
                <div className="col-span-2 text-slate-300">{r.is_default ? 'Sim' : 'Não'}</div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                    onClick={() => openEdit(r)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                    onClick={() => requestDelete(r)}
                    disabled={r.is_default}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhum local encontrado.</div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Baixo estoque no armazém</div>
            <div className="mt-1 text-xs text-slate-400">Produtos cujo stock no armazém está abaixo do mínimo</div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={onlyLowStock} onChange={(e) => setOnlyLowStock(e.target.checked)} />
            Mostrar
          </label>
        </div>

        {onlyLowStock ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {loadingLow ? (
              <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
            ) : lowRows.length ? (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Local</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowRows.map((r) => (
                      <tr key={`${r.product_id}-${r.location_id}`} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{r.product_name}</td>
                        <td className="px-4 py-3 text-slate-300">{r.location_name}</td>
                        <td className="px-4 py-3 text-slate-200 text-right">{Number(r.qty_on_hand || 0).toFixed(3)}</td>
                        <td className="px-4 py-3 text-slate-200 text-right">{Number(r.min_stock || 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-slate-300">Sem produtos com baixo estoque no armazém.</div>
            )}
          </div>
        ) : null}
      </div>

      <Modal open={openForm} title={editing ? 'Editar local' : 'Novo local'} onClose={() => (!saving ? setOpenForm(false) : null)}>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-400">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="store">Loja</option>
              <option value="warehouse">Armazém</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-400">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            Definir como padrão
          </label>

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
        open={openConfirm}
        title="Excluir local"
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmRow(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja excluir o local <span className="font-semibold text-white">{confirmRow?.name}</span>?
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={confirmBusy}
              onClick={() => {
                setOpenConfirm(false)
                setConfirmRow(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmDelete}
              className="rounded-xl border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-60"
            >
              {confirmBusy ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
