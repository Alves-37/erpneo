import { useEffect, useMemo, useState } from 'react'

import {
  createPrinterContract,
  deletePrinterContract,
  listPrinterContracts,
  listPrinterCounterTypes,
  listPrinters,
  updatePrinterContract,
} from '../../api/printers.js'
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

function money(v) {
  const n = Number(v || 0)
  try {
    return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return String(n.toFixed(2))
  }
}

export default function ReprographyContractsPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isReprography = businessType === 'reprography' || businessType === 'reprografia'

  const effectiveEstId = isAdmin ? (establishment?.id || undefined) : undefined

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [printers, setPrinters] = useState([])
  const [counterTypes, setCounterTypes] = useState([])

  const printerById = useState(() => new Map())[0]
  const ctypeById = useState(() => new Map())[0]

  const [filterPrinterId, setFilterPrinterId] = useState('')

  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  const [printerId, setPrinterId] = useState('')
  const [counterTypeId, setCounterTypeId] = useState('')
  const [monthlyAllowance, setMonthlyAllowance] = useState('0')
  const [pricePerPage, setPricePerPage] = useState('0')
  const [isActive, setIsActive] = useState(true)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const canSave = useMemo(() => Number(printerId) > 0 && Number(counterTypeId) > 0, [printerId, counterTypeId])

  function resetForm() {
    setEditing(null)
    setPrinterId('')
    setCounterTypeId('')
    setMonthlyAllowance('0')
    setPricePerPage('0')
    setIsActive(true)
  }

  async function loadRefs() {
    try {
      const [ps, cts] = await Promise.all([
        listPrinters({ establishment_id: effectiveEstId, include_inactive: true }),
        listPrinterCounterTypes({ establishment_id: effectiveEstId, include_inactive: true }),
      ])
      const prs = Array.isArray(ps) ? ps : []
      const ctr = Array.isArray(cts) ? cts : []
      setPrinters(prs)
      setCounterTypes(ctr)

      printerById.clear()
      for (const p of prs) printerById.set(Number(p.id), p)

      ctypeById.clear()
      for (const c of ctr) ctypeById.set(Number(c.id), c)
    } catch {
      setPrinters([])
      setCounterTypes([])
      printerById.clear()
      ctypeById.clear()
    }
  }

  async function load() {
    if (!isReprography) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await listPrinterContracts({
        establishment_id: effectiveEstId,
        printer_id: filterPrinterId ? Number(filterPrinterId) : undefined,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar contratos.'
      toast.error(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRefs()
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextVersion, branch?.id, establishment?.id, filterPrinterId])

  function openCreate() {
    resetForm()
    setOpenModal(true)
  }

  function openEdit(row) {
    setEditing(row)
    setPrinterId(row?.printer_id ? String(row.printer_id) : '')
    setCounterTypeId(row?.counter_type_id ? String(row.counter_type_id) : '')
    setMonthlyAllowance(String(row?.monthly_allowance ?? 0))
    setPricePerPage(String(row?.price_per_page ?? 0))
    setIsActive(row?.is_active ?? true)
    setOpenModal(true)
  }

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!isAdmin) return
    if (!canSave) return

    const allowance = Number(monthlyAllowance)
    const price = Number(pricePerPage)
    if (!Number.isFinite(allowance) || allowance < 0) {
      toast.error('Franquia inválida.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Preço inválido.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        printer_id: Number(printerId),
        counter_type_id: Number(counterTypeId),
        monthly_allowance: Math.trunc(allowance),
        price_per_page: price,
        is_active: Boolean(isActive),
      }
      if (isAdmin) payload.establishment_id = effectiveEstId ?? null

      if (editing?.id) {
        await updatePrinterContract(editing.id, payload)
        toast.success('Contrato atualizado.')
      } else {
        await createPrinterContract(payload)
        toast.success('Contrato criado.')
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
      await deletePrinterContract(confirmRow.id)
      toast.success('Contrato removido.')
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
          <div className="text-lg sm:text-xl font-semibold">Reprografia · Contratos</div>
          <div className="mt-1 text-sm text-slate-300">Franquia e preço por página excedente.</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPrinterId}
            onChange={(e) => setFilterPrinterId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          >
            <option value="">Todas as máquinas</option>
            {(printers || []).map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.serial_number}
              </option>
            ))}
          </select>

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
          >
            Novo contrato
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-4">Máquina</div>
          <div className="col-span-3">Tipo</div>
          <div className="col-span-2">Franquia</div>
          <div className="col-span-2">Preço</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-800">
            {rows.map((r) => {
              const p = printerById.get(Number(r.printer_id))
              const c = ctypeById.get(Number(r.counter_type_id))
              return (
                <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-4 font-semibold text-slate-100">{p?.serial_number || `#${r.printer_id}`}</div>
                  <div className="col-span-3 text-slate-300">{c?.name || c?.code || `#${r.counter_type_id}`}</div>
                  <div className="col-span-2 text-slate-300">{r.monthly_allowance ?? 0}</div>
                  <div className="col-span-2 text-slate-300">{money(r.price_per_page ?? 0)}</div>
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
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhum contrato cadastrado.</div>
        )}
      </div>

      <Modal
        open={openModal}
        title={editing?.id ? 'Editar contrato' : 'Novo contrato'}
        onClose={() => {
          if (saving) return
          setOpenModal(false)
          resetForm()
        }}
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          {!isAdmin ? <div className="text-sm text-amber-300">Sem permissão para gerir contratos.</div> : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Máquina</div>
              <select
                value={printerId}
                onChange={(e) => setPrinterId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                disabled={!isAdmin || saving || Boolean(editing?.id)}
                required
              >
                <option value="">Selecione...</option>
                {(printers || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.serial_number}
                  </option>
                ))}
              </select>
              {editing?.id ? <div className="text-xs text-slate-400">Para mudar impressora/tipo, apague e crie novamente.</div> : null}
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Tipo</div>
              <select
                value={counterTypeId}
                onChange={(e) => setCounterTypeId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                disabled={!isAdmin || saving || Boolean(editing?.id)}
                required
              >
                <option value="">Selecione...</option>
                {(counterTypes || []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Franquia mensal</div>
              <input
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                inputMode="numeric"
                type="text"
                disabled={!isAdmin || saving}
              />
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Preço por página</div>
              <input
                value={pricePerPage}
                onChange={(e) => setPricePerPage(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                inputMode="decimal"
                type="text"
                disabled={!isAdmin || saving}
              />
            </label>
          </div>

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
        title="Apagar contrato"
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmRow(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">Tem certeza que deseja apagar este contrato?</div>
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
