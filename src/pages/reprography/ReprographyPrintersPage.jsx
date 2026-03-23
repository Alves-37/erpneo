import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createPrinter, deletePrinter, listPrinters, updatePrinter } from '../../api/printers.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function fmtDate(v) {
  if (!v) return ''
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toISOString().slice(0, 10)
  } catch {
    return String(v)
  }
}

export default function ReprographyPrintersPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)
  const navigate = useNavigate()

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'

  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isReprography = businessType === 'reprography' || businessType === 'reprografia'

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  const [serialNumber, setSerialNumber] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [initialCounter, setInitialCounter] = useState('0')
  const [installationDate, setInstallationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isActive, setIsActive] = useState(true)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const canSave = useMemo(() => serialNumber.trim().length > 0, [serialNumber])

  const effectiveEstId = isAdmin ? (establishment?.id || undefined) : undefined

  function resetForm() {
    setEditing(null)
    setSerialNumber('')
    setBrand('')
    setModel('')
    setInitialCounter('0')
    setInstallationDate(new Date().toISOString().slice(0, 10))
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
      const data = await listPrinters({ establishment_id: effectiveEstId, include_inactive: true })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível carregar as impressoras.'
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

  function openEdit(row) {
    setEditing(row)
    setSerialNumber(row?.serial_number || '')
    setBrand(row?.brand || '')
    setModel(row?.model || '')
    setInitialCounter(String(row?.initial_counter ?? 0))
    setInstallationDate(fmtDate(row?.installation_date) || new Date().toISOString().slice(0, 10))
    setIsActive(row?.is_active ?? true)
  }

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!isAdmin) return
    if (!canSave) return

    setSaving(true)
    try {
      const payload = {
        serial_number: serialNumber.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        initial_counter: Math.trunc(Number(initialCounter) || 0),
        installation_date: installationDate || null,
        is_active: Boolean(isActive),
      }
      if (isAdmin) payload.establishment_id = effectiveEstId ?? null

      if (editing?.id) {
        await updatePrinter(editing.id, payload)
        toast.success('Impressora atualizada.')
      } else {
        await createPrinter(payload)
        toast.success('Impressora criada.')
      }
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
      if (confirmRow?.is_active) {
        await deletePrinter(confirmRow.id)
        toast.success('Impressora inativada.')
      } else {
        await updatePrinter(confirmRow.id, { is_active: true })
        toast.success('Impressora ativada.')
      }
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
          <div className="text-lg sm:text-xl font-semibold">Cadastro de Impressoras</div>
          <div className="mt-1 text-sm text-slate-300">Cadastre e gerencie as impressoras.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        {!isAdmin ? <div className="text-sm text-amber-300">Sem permissão para cadastrar impressoras.</div> : null}

        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4">
              <div className="text-xs font-semibold text-slate-400">Número de Série *</div>
              <input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                disabled={!isAdmin || saving}
                placeholder="Número de Série"
                required
              />
            </div>
            <div className="lg:col-span-3">
              <div className="text-xs font-semibold text-slate-400">Marca</div>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                disabled={!isAdmin || saving}
              />
            </div>
            <div className="lg:col-span-3">
              <div className="text-xs font-semibold text-slate-400">Modelo</div>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                disabled={!isAdmin || saving}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="text-xs font-semibold text-slate-400">Contador Inicial</div>
              <input
                value={initialCounter}
                onChange={(e) => setInitialCounter(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                inputMode="numeric"
                type="text"
                disabled={!isAdmin || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <div className="text-xs font-semibold text-slate-400">Data Instalação *</div>
              <input
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                type="date"
                disabled={!isAdmin || saving}
                required
              />
            </div>
            <div className="lg:col-span-3">
              <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
                  disabled={!isAdmin || saving}
                />
                Ativa
              </label>
            </div>
            <div className="lg:col-span-6 flex flex-wrap gap-2 justify-end">
              <button
                type="submit"
                disabled={!isAdmin || saving || !canSave}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => navigate('/reprography/readings')}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Registrar Leitura
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-3">Número de Série</div>
          <div className="col-span-3">Marca/Modelo</div>
          <div className="col-span-2">Contador</div>
          <div className="col-span-2">Instalação</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-800">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 font-semibold text-slate-100">{r.serial_number}</div>
                <div className="col-span-3 text-slate-300">{`${r.brand || ''} ${r.model || ''}`.trim() || '-'}</div>
                <div className="col-span-2 text-slate-300">{r.initial_counter ?? 0}</div>
                <div className="col-span-2 text-slate-300">{fmtDate(r.installation_date) || '-'}</div>
                <div className="col-span-1 text-slate-300">{r.is_active ? 'Ativa' : 'Inativa'}</div>
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
                    {r.is_active ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-slate-300">Nenhuma impressora cadastrada.</div>
        )}
      </div>

      {openConfirm ? (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70" onClick={() => !confirmBusy && setOpenConfirm(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="text-sm font-semibold text-white">Confirmar</div>
                <button
                  onClick={() => !confirmBusy && setOpenConfirm(false)}
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
              <div className="p-5">
                <div className="text-sm text-slate-200">
                  {confirmRow?.is_active ? (
                    <>
                      Deseja inativar a impressora <span className="font-semibold text-white">{confirmRow?.serial_number}</span>?
                    </>
                  ) : (
                    <>
                      Deseja ativar a impressora <span className="font-semibold text-white">{confirmRow?.serial_number}</span>?
                    </>
                  )}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={() => {
                      setOpenConfirm(false)
                      setConfirmRow(null)
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={confirmDelete}
                    className="rounded-xl bg-rose-700 hover:bg-rose-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {confirmBusy ? (confirmRow?.is_active ? 'Inativando...' : 'Ativando...') : 'Sim'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
