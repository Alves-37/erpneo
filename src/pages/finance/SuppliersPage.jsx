import { useEffect, useMemo, useState } from 'react'

import {
  createSupplier,
  createSupplierPayment,
  createSupplierPurchase,
  deleteSupplier,
  deleteSupplierPayment,
  deleteSupplierPurchase,
  listSupplierPayments,
  listSupplierPurchases,
  listSuppliers,
  updateSupplier,
  updateSupplierPayment,
  updateSupplierPurchase,
} from '../../api/suppliers.js'
import { toast } from '../../services/toast.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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

function money(n) {
  const v = Number(n || 0)
  return v.toFixed(2)
}

function Tabs({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            value === it.value
              ? 'bg-brand-600 text-white'
              : 'border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export default function SuppliersPage() {
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])

  const [actionsSupplier, setActionsSupplier] = useState(null)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmKind, setConfirmKind] = useState(null)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const [openSupplierForm, setOpenSupplierForm] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    nuit: '',
    email: '',
    phone: '',
    address: '',
  })

  const [openDetails, setOpenDetails] = useState(false)
  const [activeSupplier, setActiveSupplier] = useState(null)
  const [detailsTab, setDetailsTab] = useState('purchases')

  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [purchases, setPurchases] = useState([])

  const [loadingPayments, setLoadingPayments] = useState(false)
  const [payments, setPayments] = useState([])

  const [openPurchaseForm, setOpenPurchaseForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [purchaseForm, setPurchaseForm] = useState({
    doc_ref: '',
    purchase_date: '',
    currency: 'MZN',
    total: '',
    status: 'open',
    notes: '',
  })
  const [savingPurchase, setSavingPurchase] = useState(false)

  const [openPaymentForm, setOpenPaymentForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    purchase_id: '',
    payment_date: '',
    method: 'cash',
    amount: '',
    reference: '',
    notes: '',
  })
  const [savingPayment, setSavingPayment] = useState(false)

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      const data = await listSuppliers({ q })
      setRows(data || [])
    } catch {
      toast.error('Não foi possível carregar fornecedores agora.')
      setRows([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function loadPurchases(supplierId) {
    setLoadingPurchases(true)
    try {
      const data = await listSupplierPurchases({ supplier_id: supplierId, limit: 200 })
      setPurchases(data || [])
    } catch {
      toast.error('Não foi possível carregar compras do fornecedor.')
      setPurchases([])
    } finally {
      setLoadingPurchases(false)
    }
  }

  async function loadPayments(supplierId) {
    setLoadingPayments(true)
    try {
      const data = await listSupplierPayments({ supplier_id: supplierId, limit: 200 })
      setPayments(data || [])
    } catch {
      toast.error('Não foi possível carregar pagamentos do fornecedor.')
      setPayments([])
    } finally {
      setLoadingPayments(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      load({ silent: true })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const selectedTotals = useMemo(() => {
    const totalPurchases = (purchases || []).reduce((acc, p) => acc + Number(p.total || 0), 0)
    const totalPayments = (payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0)
    const balance = totalPurchases - totalPayments
    return { totalPurchases, totalPayments, balance }
  }, [purchases, payments])

  function openCreateSupplier() {
    setEditingSupplier(null)
    setSupplierForm({ name: '', nuit: '', email: '', phone: '', address: '' })
    setOpenSupplierForm(true)
  }

  function openEditSupplier(row) {
    setEditingSupplier(row)
    setSupplierForm({
      name: row.name || '',
      nuit: row.nuit || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
    })
    setOpenSupplierForm(true)
  }

  async function saveSupplier(e) {
    e.preventDefault()
    if (!supplierForm.name.trim()) {
      toast.error('Informe o nome do fornecedor.')
      return
    }

    setSavingSupplier(true)
    try {
      const payload = {
        name: supplierForm.name.trim(),
        nuit: supplierForm.nuit.trim() || null,
        email: supplierForm.email.trim() || null,
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
      }

      if (editingSupplier?.id) {
        await updateSupplier(editingSupplier.id, payload)
        toast.success('Fornecedor atualizado.')
      } else {
        await createSupplier(payload)
        toast.success('Fornecedor criado.')
      }

      setOpenSupplierForm(false)
      await load()
    } catch {
      toast.error('Não foi possível salvar fornecedor agora.')
    } finally {
      setSavingSupplier(false)
    }
  }

  function requestDeleteSupplier(row) {
    setConfirmKind('supplier')
    setConfirmRow(row)
    setOpenConfirm(true)
  }

  function requestDeletePurchase(row) {
    setConfirmKind('purchase')
    setConfirmRow(row)
    setOpenConfirm(true)
  }

  function requestDeletePayment(row) {
    setConfirmKind('payment')
    setConfirmRow(row)
    setOpenConfirm(true)
  }

  async function confirmAction() {
    if (!confirmKind || !confirmRow) return
    setConfirmBusy(true)
    try {
      if (confirmKind === 'supplier') {
        await deleteSupplier(confirmRow.id)
        toast.success('Fornecedor excluído.')
        await load()
      }

      if (confirmKind === 'purchase') {
        if (!activeSupplier?.id) return
        await deleteSupplierPurchase(confirmRow.id)
        toast.success('Compra excluída.')
        await loadPurchases(activeSupplier.id)
      }

      if (confirmKind === 'payment') {
        if (!activeSupplier?.id) return
        await deleteSupplierPayment(confirmRow.id)
        toast.success('Pagamento excluído.')
        await loadPayments(activeSupplier.id)
      }

      setOpenConfirm(false)
      setConfirmKind(null)
      setConfirmRow(null)
    } catch {
      toast.error(
        confirmKind === 'supplier'
          ? 'Não foi possível excluir fornecedor agora.'
          : confirmKind === 'purchase'
            ? 'Não foi possível excluir compra agora.'
            : 'Não foi possível excluir pagamento agora.'
      )
    } finally {
      setConfirmBusy(false)
    }
  }

  function openSupplierDetails(row) {
    setActiveSupplier(row)
    setOpenDetails(true)
    setDetailsTab('purchases')
    loadPurchases(row.id)
    loadPayments(row.id)
  }

  function openCreatePurchase() {
    setEditingPurchase(null)
    setPurchaseForm({ doc_ref: '', purchase_date: '', currency: 'MZN', total: '', status: 'open', notes: '' })
    setOpenPurchaseForm(true)
  }

  function openEditPurchase(row) {
    setEditingPurchase(row)
    setPurchaseForm({
      doc_ref: row.doc_ref || '',
      purchase_date: row.purchase_date || '',
      currency: row.currency || 'MZN',
      total: String(row.total ?? ''),
      status: row.status || 'open',
      notes: row.notes || '',
    })
    setOpenPurchaseForm(true)
  }

  async function savePurchase(e) {
    e.preventDefault()
    if (!activeSupplier?.id) return

    const total = Number(purchaseForm.total)
    if (!Number.isFinite(total) || total < 0) {
      toast.error('Total inválido.')
      return
    }

    setSavingPurchase(true)
    try {
      const payload = {
        supplier_id: activeSupplier.id,
        doc_ref: purchaseForm.doc_ref.trim() || null,
        purchase_date: purchaseForm.purchase_date || null,
        currency: (purchaseForm.currency || 'MZN').trim(),
        total,
        status: purchaseForm.status,
        notes: purchaseForm.notes.trim() || null,
      }

      if (editingPurchase?.id) {
        await updateSupplierPurchase(editingPurchase.id, payload)
        toast.success('Compra atualizada.')
      } else {
        await createSupplierPurchase(payload)
        toast.success('Compra criada.')
      }

      setOpenPurchaseForm(false)
      await loadPurchases(activeSupplier.id)
    } catch {
      toast.error('Não foi possível salvar compra agora.')
    } finally {
      setSavingPurchase(false)
    }
  }

  async function onDeletePurchase(row) {
    requestDeletePurchase(row)
  }

  function openCreatePayment() {
    setEditingPayment(null)
    setPaymentForm({ purchase_id: '', payment_date: '', method: 'cash', amount: '', reference: '', notes: '' })
    setOpenPaymentForm(true)
  }

  function openEditPayment(row) {
    setEditingPayment(row)
    setPaymentForm({
      purchase_id: row.purchase_id ? String(row.purchase_id) : '',
      payment_date: row.payment_date || '',
      method: row.method || 'cash',
      amount: String(row.amount ?? ''),
      reference: row.reference || '',
      notes: row.notes || '',
    })
    setOpenPaymentForm(true)
  }

  async function savePayment(e) {
    e.preventDefault()
    if (!activeSupplier?.id) return

    const amount = Number(paymentForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Valor inválido.')
      return
    }

    const purchaseId = paymentForm.purchase_id ? Number(paymentForm.purchase_id) : null

    setSavingPayment(true)
    try {
      const payload = {
        supplier_id: activeSupplier.id,
        purchase_id: purchaseId,
        payment_date: paymentForm.payment_date || null,
        method: (paymentForm.method || 'cash').trim(),
        amount,
        reference: paymentForm.reference.trim() || null,
        notes: paymentForm.notes.trim() || null,
      }

      if (editingPayment?.id) {
        await updateSupplierPayment(editingPayment.id, payload)
        toast.success('Pagamento atualizado.')
      } else {
        await createSupplierPayment(payload)
        toast.success('Pagamento registado.')
      }

      setOpenPaymentForm(false)
      await loadPayments(activeSupplier.id)
    } catch {
      toast.error('Não foi possível salvar pagamento agora.')
    } finally {
      setSavingPayment(false)
    }
  }

  async function onDeletePayment(row) {
    requestDeletePayment(row)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Finanças · Fornecedores</div>
          <div className="mt-1 text-sm text-slate-300">Cadastre fornecedores, compras e pagamentos</div>
        </div>
        <button
          type="button"
          onClick={openCreateSupplier}
          className="w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Novo fornecedor
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:w-72 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="Pesquisar fornecedor..."
        />
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-300">Carregando...</div>
      ) : rows.length ? (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate" title={r.name || ''}>
                    {r.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                    <div className="truncate" title={r.nuit || ''}>
                      <span className="text-slate-500">NUIT:</span> {r.nuit || '-'}
                    </div>
                    <div className="truncate" title={r.phone || r.email || ''}>
                      <span className="text-slate-500">Contacto:</span> {r.phone || r.email || '-'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                  onClick={() => setActionsSupplier(r)}
                >
                  Ações
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-300">Nenhum fornecedor encontrado.</div>
      )}

      <Modal
        open={Boolean(actionsSupplier)}
        title={actionsSupplier?.name ? `Ações · ${actionsSupplier.name}` : 'Ações'}
        onClose={() => setActionsSupplier(null)}
      >
        <div className="grid gap-2">
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => {
              const s = actionsSupplier
              setActionsSupplier(null)
              if (!s) return
              openSupplierDetails(s)
            }}
          >
            Abrir
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => {
              const s = actionsSupplier
              setActionsSupplier(null)
              if (!s) return
              openEditSupplier(s)
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-4 py-3 text-sm font-semibold text-rose-200"
            onClick={() => {
              const s = actionsSupplier
              setActionsSupplier(null)
              if (!s) return
              requestDeleteSupplier(s)
            }}
          >
            Excluir
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
            onClick={() => setActionsSupplier(null)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal
        open={openConfirm}
        title={
          confirmKind === 'supplier'
            ? 'Excluir fornecedor'
            : confirmKind === 'purchase'
              ? 'Excluir compra'
              : confirmKind === 'payment'
                ? 'Excluir pagamento'
                : 'Confirmar'
        }
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmKind(null)
          setConfirmRow(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            {confirmKind === 'supplier' ? (
              <>
                Tem certeza que deseja excluir o fornecedor <span className="font-semibold text-white">{confirmRow?.name}</span>?
              </>
            ) : confirmKind === 'purchase' ? (
              <>Tem certeza que deseja excluir esta compra?</>
            ) : (
              <>Tem certeza que deseja excluir este pagamento?</>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={confirmBusy}
              onClick={() => {
                setOpenConfirm(false)
                setConfirmKind(null)
                setConfirmRow(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmAction}
              className="rounded-xl border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-60"
            >
              {confirmBusy ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openSupplierForm}
        title={editingSupplier ? 'Editar fornecedor' : 'Novo fornecedor'}
        onClose={() => {
          if (!savingSupplier) setOpenSupplierForm(false)
        }}
      >
        <form onSubmit={saveSupplier} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-400">Nome</label>
            <input
              value={supplierForm.name}
              onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              required
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">NUIT</label>
              <input
                value={supplierForm.nuit}
                onChange={(e) => setSupplierForm((f) => ({ ...f, nuit: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Telefone</label>
              <input
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Email</label>
              <input
                value={supplierForm.email}
                onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="email"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Endereço</label>
              <input
                value={supplierForm.address}
                onChange={(e) => setSupplierForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenSupplierForm(false)}
              disabled={savingSupplier}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingSupplier}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingSupplier ? 'Salvando...' : editingSupplier ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openDetails}
        title={activeSupplier?.name ? `Fornecedor: ${activeSupplier.name}` : 'Fornecedor'}
        onClose={() => {
          setOpenDetails(false)
          setActiveSupplier(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-300">
            Registe aqui as <span className="font-semibold text-slate-100">compras</span> feitas ao fornecedor e os
            <span className="font-semibold text-slate-100"> pagamentos</span> que você efetuou. O saldo é
            <span className="font-semibold text-slate-100"> Compras − Pagamentos</span>.
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-semibold text-slate-400">Compras</div>
              <div className="mt-1 text-lg font-semibold text-white">{money(selectedTotals.totalPurchases)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-semibold text-slate-400">Pagamentos</div>
              <div className="mt-1 text-lg font-semibold text-white">{money(selectedTotals.totalPayments)}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-semibold text-slate-400">Saldo</div>
              <div className={`mt-1 text-lg font-semibold ${selectedTotals.balance > 0 ? 'text-rose-200' : 'text-emerald-200'}`}>
                {money(selectedTotals.balance)}
              </div>
            </div>
          </div>

          <Tabs
            value={detailsTab}
            onChange={setDetailsTab}
            items={[
              { value: 'purchases', label: 'Compras' },
              { value: 'payments', label: 'Pagamentos' },
              { value: 'history', label: 'Histórico' },
            ]}
          />

          {detailsTab === 'purchases' ? (
            <div className="grid gap-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreatePurchase}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Nova compra
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/60 text-xs text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Nº Fatura/Recibo</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPurchases ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-400" colSpan={5}>
                            Carregando...
                          </td>
                        </tr>
                      ) : (purchases || []).length ? (
                        (purchases || []).map((p) => (
                          <tr key={p.id} className="border-t border-slate-800">
                            <td className="px-4 py-3 text-slate-200">{p.purchase_date || '-'}</td>
                            <td className="px-4 py-3 text-slate-200">{p.doc_ref || '-'}</td>
                            <td className="px-4 py-3 text-slate-200">
                              {p.status === 'open'
                                ? 'Em aberto'
                                : p.status === 'partial'
                                  ? 'Parcial'
                                  : p.status === 'paid'
                                    ? 'Pago'
                                    : p.status === 'cancelled'
                                      ? 'Cancelado'
                                      : p.status}
                            </td>
                            <td className="px-4 py-3 text-slate-200 text-right">{money(p.total)} {p.currency || ''}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100"
                                  onClick={() => openEditPurchase(p)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200"
                                  onClick={() => onDeletePurchase(p)}
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-slate-400" colSpan={5}>
                            Sem compras
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {detailsTab === 'payments' ? (
            <div className="grid gap-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreatePayment}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Novo pagamento
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/60 text-xs text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3">Compra</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPayments ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-400" colSpan={5}>
                            Carregando...
                          </td>
                        </tr>
                      ) : (payments || []).length ? (
                        (payments || []).map((p) => (
                          <tr key={p.id} className="border-t border-slate-800">
                            <td className="px-4 py-3 text-slate-200">{p.payment_date || '-'}</td>
                            <td className="px-4 py-3 text-slate-200">{p.method}</td>
                            <td className="px-4 py-3 text-slate-200">{p.purchase_id ? `#${p.purchase_id}` : '-'}</td>
                            <td className="px-4 py-3 text-slate-200 text-right">{money(p.amount)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-100"
                                  onClick={() => openEditPayment(p)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2.5 py-1 text-xs text-rose-200"
                                  onClick={() => onDeletePayment(p)}
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-slate-400" colSpan={5}>
                            Sem pagamentos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {detailsTab === 'history' ? (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Referência</th>
                      <th className="px-4 py-3 text-right">Débito</th>
                      <th className="px-4 py-3 text-right">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const events = []
                      for (const p of purchases || []) {
                        events.push({
                          id: `purchase-${p.id}`,
                          date: p.purchase_date || p.created_at?.slice(0, 10) || '',
                          type: 'Compra',
                          ref: p.doc_ref || `#${p.id}`,
                          debit: Number(p.total || 0),
                          credit: 0,
                        })
                      }
                      for (const pay of payments || []) {
                        events.push({
                          id: `payment-${pay.id}`,
                          date: pay.payment_date || pay.created_at?.slice(0, 10) || '',
                          type: 'Pagamento',
                          ref: pay.reference || (pay.purchase_id ? `Compra #${pay.purchase_id}` : `#${pay.id}`),
                          debit: 0,
                          credit: Number(pay.amount || 0),
                        })
                      }
                      events.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

                      if (!events.length) {
                        return (
                          <tr>
                            <td className="px-4 py-4 text-slate-400" colSpan={5}>
                              Sem movimentos
                            </td>
                          </tr>
                        )
                      }

                      return events.map((e) => (
                        <tr key={e.id} className="border-t border-slate-800">
                          <td className="px-4 py-3 text-slate-200">{e.date || '-'}</td>
                          <td className="px-4 py-3 text-slate-200">{e.type}</td>
                          <td className="px-4 py-3 text-slate-200">{e.ref}</td>
                          <td className="px-4 py-3 text-slate-200 text-right">{e.debit ? money(e.debit) : '-'}</td>
                          <td className="px-4 py-3 text-slate-200 text-right">{e.credit ? money(e.credit) : '-'}</td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={openPurchaseForm}
        title={editingPurchase ? 'Editar compra' : 'Nova compra'}
        onClose={() => {
          if (!savingPurchase) setOpenPurchaseForm(false)
        }}
      >
        <form onSubmit={savePurchase} className="grid gap-4">
          <div className="text-sm text-slate-300">
            Uma compra representa um <span className="font-semibold text-slate-100">lançamento a pagar</span> ao
            fornecedor. Use <span className="font-semibold text-slate-100">Nº Fatura/Recibo</span> para o número do
            documento do fornecedor (se existir).
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Data</label>
              <input
                type="date"
                value={purchaseForm.purchase_date}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, purchase_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Nº Fatura/Recibo</label>
              <input
                value={purchaseForm.doc_ref}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, doc_ref: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Moeda</label>
              <input
                value={purchaseForm.currency}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Valor da compra</label>
              <input
                value={purchaseForm.total}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, total: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                inputMode="decimal"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Estado</label>
              <select
                value={purchaseForm.status}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="open">Em aberto</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pago</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-400">Notas</label>
            <input
              value={purchaseForm.notes}
              onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenPurchaseForm(false)}
              disabled={savingPurchase}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPurchase}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingPurchase ? 'Salvando...' : editingPurchase ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openPaymentForm}
        title={editingPayment ? 'Editar pagamento' : 'Novo pagamento'}
        onClose={() => {
          if (!savingPayment) setOpenPaymentForm(false)
        }}
      >
        <form onSubmit={savePayment} className="grid gap-4">
          <div className="text-sm text-slate-300">
            Registe um pagamento feito ao fornecedor. Se quiser, pode <span className="font-semibold text-slate-100">vincular</span>
            o pagamento a uma compra específica.
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Data</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Método</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="cash">Dinheiro</option>
                <option value="mpesa">M-Pesa</option>
                <option value="card">Cartão</option>
                <option value="bank">Transferência</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Compra (opcional)</label>
              <select
                value={paymentForm.purchase_id}
                onChange={(e) => setPaymentForm((f) => ({ ...f, purchase_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Sem vínculo</option>
                {(purchases || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} {p.doc_ref ? `· ${p.doc_ref}` : ''} ({money(p.total)} {p.currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Valor</label>
              <input
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Referência</label>
              <input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-400">Notas</label>
              <input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenPaymentForm(false)}
              disabled={savingPayment}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPayment}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingPayment ? 'Salvando...' : editingPayment ? 'Atualizar' : 'Registar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
