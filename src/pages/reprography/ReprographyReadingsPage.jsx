import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createPdv3PrinterReading, listPdv3PrinterReadings, listPrinters } from '../../api/printers.js'
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

export default function ReprographyReadingsPage() {
  const me = useAuthStore((s) => s.me)
  const branch = useAuthStore((s) => s.branch)
  const establishment = useAuthStore((s) => s.establishment)
  const contextVersion = useAuthStore((s) => s.contextVersion)
  const navigate = useNavigate()

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'
  const canRegister = isAdmin || role === 'cashier'

  const businessType = (branch?.business_type || 'retail').toString().trim().toLowerCase()
  const isReprography = businessType === 'reprography' || businessType === 'reprografia'

  const effectiveEstId = isAdmin ? (establishment?.id || undefined) : undefined

  const [loading, setLoading] = useState(true)
  const [printers, setPrinters] = useState([])
  const [printerId, setPrinterId] = useState('')

  const [counterValue, setCounterValue] = useState('')
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [lastReadingDate, setLastReadingDate] = useState('')
  const [previousCounter, setPreviousCounter] = useState('')
  const [baselineCounter, setBaselineCounter] = useState('0')
  const [copies, setCopies] = useState('0')

  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])

  const printerById = useState(() => new Map())[0]

  const canSave = useMemo(() => Number(printerId) > 0 && counterValue.trim() && readingDate, [printerId, counterValue, readingDate])

  async function loadPrinters() {
    try {
      const data = await listPrinters({ establishment_id: effectiveEstId, include_inactive: false })
      const rows = Array.isArray(data) ? data : []
      setPrinters(rows)
      printerById.clear()
      for (const p of rows) printerById.set(Number(p.id), p)
    } catch {
      setPrinters([])
      printerById.clear()
    }
  }

  async function loadHistory(selectedPrinterId) {
    if (!selectedPrinterId) {
      setHistory([])
      return []
    }
    try {
      const data = await listPdv3PrinterReadings({ establishment_id: effectiveEstId, printer_id: Number(selectedPrinterId), limit: 20, offset: 0 })
      const rows = Array.isArray(data) ? data : []
      setHistory(rows)
      return rows
    } catch {
      setHistory([])
      return []
    }
  }

  function recomputeCopies(nextCounterValue, prevCounterValue) {
    try {
      const a = Number(nextCounterValue)
      const b = Number(prevCounterValue)
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        setCopies('0')
        return
      }
      setCopies(String(Math.max(0, Math.trunc(a) - Math.trunc(b))))
    } catch {
      setCopies('0')
    }
  }

  async function onSelectPrinter(nextPrinterId) {
    setPrinterId(nextPrinterId)
    setCounterValue('')
    setCopies('0')

    if (!nextPrinterId) {
      setLastReadingDate('')
      setPreviousCounter('')
      setBaselineCounter('0')
      setHistory([])
      return
    }

    const p = printerById.get(Number(nextPrinterId))
    const base = String(p?.initial_counter ?? 0)
    setBaselineCounter(base)

    const rows = await loadHistory(nextPrinterId)
    const last = rows?.[0]
    if (last?.reading_date) {
      setLastReadingDate(fmtDate(last.reading_date))
      setPreviousCounter(String(last.counter_value ?? '0'))
      return
    }

    setLastReadingDate('Nenhuma')
    setPreviousCounter(base)
  }

  useEffect(() => {
    ;(async () => {
      if (!isReprography) return
      setLoading(true)
      await loadPrinters()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextVersion, branch?.id, establishment?.id])

  useEffect(() => {
    recomputeCopies(counterValue, previousCounter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterValue, previousCounter])

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!canRegister) return
    if (!canSave) return

    const cv = Number(counterValue)
    const prev = Number(previousCounter)
    if (!Number.isFinite(cv) || cv < 0) {
      toast.error('Informe o contador atual!')
      return
    }
    if (Number.isFinite(prev) && cv < prev) {
      toast.error('Contador atual não pode ser menor que o contador anterior!')
      return
    }
    if (!readingDate) {
      toast.error('Informe a data da leitura!')
      return
    }

    setSaving(true)
    try {
      const dt = new Date(`${readingDate}T00:00:00`)
      const payload = {
        printer_id: Number(printerId),
        reading_date: dt.toISOString(),
        counter_value: Math.trunc(cv),
        establishment_id: effectiveEstId ?? null,
      }
      await createPdv3PrinterReading(payload)
      toast.success('Leitura registrada com sucesso!')

      // reload history and update previous counter
      const rows = await loadHistory(printerId)
      const last = rows?.[0]
      setLastReadingDate(last?.reading_date ? fmtDate(last.reading_date) : '')
      setPreviousCounter(String(last?.counter_value ?? cv))
      setCounterValue('')
      setCopies('0')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Erro ao salvar leitura.'
      toast.error(msg)
    } finally {
      setSaving(false)
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
          <div className="text-lg sm:text-xl font-semibold">Registrar Leituras</div>
          <div className="mt-1 text-sm text-slate-300">Registro de leituras de impressoras.</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="text-xl font-semibold">Registro de Leituras de Impressoras</div>
        <div className="mt-1 text-sm text-slate-300">Nova Leitura</div>

        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          {!canRegister ? <div className="text-sm text-amber-300">Sem permissão para registrar leituras.</div> : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6">
              <div className="text-xs font-semibold text-slate-400">Impressora *</div>
              <select
                value={printerId}
                onChange={async (e) => {
                  await onSelectPrinter(e.target.value)
                }}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                disabled={loading}
              >
                <option value="">Selecione...</option>
                {(printers || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.serial_number} - {p.brand || ''} {p.model || ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <div className="text-xs font-semibold text-slate-400">Contador Atual *</div>
              <input
                value={counterValue}
                onChange={(e) => setCounterValue(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                inputMode="numeric"
                type="text"
                disabled={!canRegister || saving || !printerId}
              />
            </div>

            <div className="lg:col-span-3">
              <div className="text-xs font-semibold text-slate-400">Data da Leitura *</div>
              <input
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                type="date"
                disabled={!canRegister || saving}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold">Informações da Última Leitura:</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">Última: {lastReadingDate || '-'}</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">Anterior: {previousCounter || '-'}</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">Cópias: {copies || '0'}</div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={!canRegister || saving || !canSave}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPrinterId('')
                setCounterValue('')
                setReadingDate(new Date().toISOString().slice(0, 10))
                setLastReadingDate('')
                setPreviousCounter('')
                setCopies('0')
                setHistory([])
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => navigate('/reprography/billing')}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Faturamento
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">Histórico de Leituras</div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="py-2 px-4">Data</th>
                <th className="py-2 px-4">Contador Anterior</th>
                <th className="py-2 px-4">Contador Atual</th>
                <th className="py-2 px-4">Cópias</th>
                <th className="py-2 px-4">Registrado em</th>
              </tr>
            </thead>
            <tbody>
              {!printerId ? (
                <tr>
                  <td className="py-3 px-4 text-slate-300" colSpan={5}>
                    Selecione uma impressora.
                  </td>
                </tr>
              ) : !history.length ? (
                <tr>
                  <td className="py-3 px-4 text-slate-300" colSpan={5}>
                    Sem leituras.
                  </td>
                </tr>
              ) : (
                history.map((r, idx) => {
                  const prev = idx + 1 < history.length ? history[idx + 1] : null
                  const prevVal = prev ? Number(prev.counter_value || 0) : Number(baselineCounter || 0)
                  const currVal = Number(r.counter_value || 0)
                  const cps = Math.max(0, Math.trunc(currVal) - Math.trunc(prevVal))
                  return (
                    <tr key={r.id} className="border-t border-slate-800">
                      <td className="py-2 px-4 text-slate-200">{fmtDate(r.reading_date) || '-'}</td>
                      <td className="py-2 px-4 text-slate-200">{prevVal}</td>
                      <td className="py-2 px-4 text-slate-200">{currVal}</td>
                      <td className="py-2 px-4 text-slate-200">{cps}</td>
                      <td className="py-2 px-4 text-slate-200">{r.created_at ? String(r.created_at).slice(0, 19) : ''}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
