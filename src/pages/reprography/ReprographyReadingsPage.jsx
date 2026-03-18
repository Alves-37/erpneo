import { useEffect, useMemo, useState } from 'react'

import {
  createPrinterReading,
  deletePrinterReading,
  listPrinterCounterTypes,
  listPrinterReadings,
  listPrinters,
  updatePrinterReading,
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

function toIsoDatetimeLocal(d) {
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export default function ReprographyReadingsPage() {
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
  const [filterCounterTypeId, setFilterCounterTypeId] = useState('')

  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  const [printerId, setPrinterId] = useState('')
  const [counterTypeId, setCounterTypeId] = useState('')
  const [readingDate, setReadingDate] = useState(toIsoDatetimeLocal(new Date()))
  const [counterValue, setCounterValue] = useState('0')

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const canSave = useMemo(() => Number(printerId) > 0 && Number(counterTypeId) > 0 && readingDate && counterValue !== '', [
    printerId,
    counterTypeId,
    readingDate,
    counterValue,
  ])

  function resetForm() {
    setEditing(null)
    setPrinterId('')
    setCounterTypeId('')
    setReadingDate(toIsoDatetimeLocal(new Date()))
    setCounterValue('0')
  }

  async function loadRefs() {
    try {
      const [ps, cts] = await Promise.all([
        listPrinters({ establishment_id: effectiveEstId, include_inactive: false }),
        listPrinterCounterTypes({ establishment_id: effectiveEstId, include_inactive: false }),
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
      const data = await listPrinterReadings({
        establishment_id: effectiveEstId,
        printer_id: filterPrinterId ? Number(filterPrinterId) : undefined,
        counter_type_id: filterCounterTypeId ? Number(filterCounterTypeId) : undefined,
        limit: 200,
        offset: 0,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar leituras.'
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
  }, [contextVersion, branch?.id, establishment?.id, filterPrinterId, filterCounterTypeId])

  function openCreate() {
    resetForm()
    setOpenModal(true)
  }

  function openEdit(row) {
    setEditing(row)
    setPrinterId(row?.printer_id ? String(row.printer_id) : '')
    setCounterTypeId(row?.counter_type_id ? String(row.counter_type_id) : '')
    const d = row?.reading_date ? new Date(row.reading_date) : new Date()
    setReadingDate(toIsoDatetimeLocal(d))
    setCounterValue(String(row?.counter_value ?? 0))
    setOpenModal(true)
  }

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!isAdmin) return
    if (!canSave) return

    const cv = Number(counterValue)
    if (!Number.isFinite(cv) || cv < 0) {
      toast.error('Contador inválido.')
      return
    }

    const dt = new Date(readingDate)
    if (Number.isNaN(dt.getTime())) {
      toast.error('Data inválida.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        printer_id: Number(printerId),
        counter_type_id: Number(counterTypeId),
        reading_date: dt.toISOString(),
        counter_value: Math.trunc(cv),
      }
      if (isAdmin) payload.establishment_id = effectiveEstId ?? null

      if (editing?.id) {
        await updatePrinterReading(editing.id, payload)
        toast.success('Leitura atualizada.')
      } else {
        await createPrinterReading(payload)
        toast.success('Leitura criada.')
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
      await deletePrinterReading(confirmRow.id)
      toast.success('Leitura removida.')
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
          <div className="text-lg sm:text-xl font-semibold">Reprografia · Leituras</div>
          <div className="mt-1 text-sm text-slate-300">Registrar leituras por máquina e tipo.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <select
            value={filterCounterTypeId}
            onChange={(e) => setFilterCounterTypeId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          >
            <option value="">Todos os tipos</option>
            {(counterTypes || []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.code})
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
            Nova leitura
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-4">Máquina</div>
          <div className="col-span-3">Tipo</div>
          <div className="col-span-3">Data</div>
          <div className="col-span-1">Contador</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-800">
            {rows.map((r) => {
              const p = printerById.get(Number(r.printer_id))
              const c = ctypeById.get(Number(r.counter_type_id))
              const d = r.reading_date ? new Date(r.reading_date) : null
              return (
                <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-4 font-semibold text-slate-100">{p?.serial_number || `#${r.printer_id}`}</div>
                  <div className="col-span-3 text-slate-300">{c?.name || c?.code || `#${r.counter_type_id}`}</div>
                  <div className="col-span-3 text-slate-300">{d ? d.toLocaleString('pt-PT') : '-'}</div>
                  <div className="col-span-1 text-slate-300">{r.counter_value ?? 0}</div>
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
          <div className="px-4 py-6 text-sm text-slate-300">Nenhuma leitura cadastrada.</div>
        )}
      </div>

      <Modal
        open={openModal}
        title={editing?.id ? 'Editar leitura' : 'Nova leitura'}
        onClose={() => {
          if (saving) return
          setOpenModal(false)
          resetForm()
        }}
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          {!isAdmin ? <div className="text-sm text-amber-300">Sem permissão para gerir leituras.</div> : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Máquina</div>
              <select
                value={printerId}
                onChange={(e) => setPrinterId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                disabled={!isAdmin || saving}
                required
              >
                <option value="">Selecione...</option>
                {(printers || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.serial_number}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Tipo</div>
              <select
                value={counterTypeId}
                onChange={(e) => setCounterTypeId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                disabled={!isAdmin || saving}
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
              <div className="text-sm font-medium text-slate-200">Data</div>
              <input
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                type="datetime-local"
                disabled={!isAdmin || saving}
                required
              />
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Contador</div>
              <input
                value={counterValue}
                onChange={(e) => setCounterValue(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                inputMode="numeric"
                type="text"
                disabled={!isAdmin || saving}
                required
              />
            </label>
          </div>

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
        title="Apagar leitura"
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmRow(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">Tem certeza que deseja apagar esta leitura?</div>
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
