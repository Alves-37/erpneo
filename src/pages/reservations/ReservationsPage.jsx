import { useEffect, useState, useMemo } from 'react'
import { listRestaurantTables } from '../../api/restaurantTables.js'
import { 
  listReservations, 
  createReservation, 
  updateReservation, 
  cancelReservation,
  getTablesAvailability 
} from '../../api/reservations.js'
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

export default function ReservationsPage() {
  const { me, branch } = useAuthStore()
  
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Estados para modais
  const [openNew, setOpenNew] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openCancel, setOpenCancel] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [activeReservation, setActiveReservation] = useState(null)
  
  // Estados para formulário
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_id: '',
    reservation_date: '',
    time_slot: 'almoço',
    people_count: 2,
    estimated_amount: '',
    deposit_percentage: 50,
    deposit_amount: '',
    payment_method: '',
    payment_reference: '',
    notes: '',
    special_requests: ''
  })
  
  const fmtMoney = useMemo(() => {
    try {
      return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }, [])

  // Carregar mesas
  useEffect(() => {
    async function loadTables() {
      try {
        const rows = await listRestaurantTables()
        setTables((rows || []).filter((t) => t.is_active !== false))
      } catch {
        setTables([])
      }
    }
    loadTables()
  }, [])

  // Carregar reservas
  useEffect(() => {
    loadReservations()
  }, [selectedDate])

  async function loadReservations() {
    setLoading(true)
    try {
      // 1. Tenta carregar reservas filtradas pelo estabelecimento atual (se existir)
      const params = { 
        limit: 1000 
      };
      if (me?.establishment_id) {
        params.establishment_id = me.establishment_id;
      }
      
      const data = await listReservations(params);
      
      let allRows = [];
      if (Array.isArray(data)) {
        allRows = data;
      } else if (data && Array.isArray(data.reservations)) {
        allRows = data.reservations;
      } else if (data && typeof data === 'object') {
        const possibleArray = Object.values(data).find(val => Array.isArray(val));
        if (possibleArray) allRows = possibleArray;
      }

      // 2. Filtrar localmente por data e estabelecimento para garantir visibilidade
      let filteredRows = allRows;
      
      if (selectedDate) {
        filteredRows = allRows.filter(r => {
          if (!r.reservation_date) return false;
          const rDateStr = String(r.reservation_date);
          const datePart = rDateStr.includes('T') ? rDateStr.split('T')[0] : rDateStr.split(' ')[0];
          return datePart === selectedDate;
        });
      }
      
      setReservations(filteredRows);
    } catch (err) {
      console.error('Erro ao carregar reservas:', err);
      setReservations([]);
      toast.error('Não foi possível carregar reservas.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      customer_name: '',
      customer_phone: '',
      table_id: '',
      reservation_date: '',
      time_slot: 'almoço',
      people_count: 2,
      estimated_amount: '',
      deposit_percentage: 50,
      deposit_amount: '',
      payment_method: '',
      payment_reference: '',
      notes: '',
      special_requests: ''
    })
  }

  function openNewModal() {
    resetForm()
    setFormData(prev => ({
      ...prev,
      reservation_date: selectedDate
    }))
    setOpenNew(true)
  }

  function openEditModal(reservation) {
    setFormData({
      customer_name: reservation.customer_name || '',
      customer_phone: reservation.customer_phone || '',
      table_id: reservation.table_id || '',
      reservation_date: reservation.reservation_date ? reservation.reservation_date.split('T')[0] : '',
      time_slot: reservation.time_slot || 'almoço',
      people_count: reservation.people_count || 2,
      estimated_amount: reservation.estimated_amount || '',
      deposit_percentage: reservation.deposit_percentage || 50,
      deposit_amount: reservation.deposit_amount || '',
      payment_method: reservation.payment_method || '',
      payment_reference: reservation.payment_reference || '',
      notes: reservation.notes || '',
      special_requests: reservation.special_requests || ''
    })
    setActiveReservation(reservation)
    setOpenEdit(true)
  }

  function openDetailsModal(reservation) {
    setActiveReservation(reservation)
    setOpenDetails(true)
  }

  async function handleSave() {
    if (!formData.customer_name.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }
    if (!formData.table_id) {
      toast.error('Selecione a mesa.')
      return
    }
    if (!formData.reservation_date) {
      toast.error('Informe a data da reserva.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        table_id: Number(formData.table_id),
        people_count: Number(formData.people_count),
        estimated_amount: formData.estimated_amount ? Number(formData.estimated_amount) : null,
        deposit_percentage: formData.deposit_percentage ? Number(formData.deposit_percentage) : null,
        deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : null,
        reservation_date: new Date(formData.reservation_date).toISOString(),
        establishment_id: Number(me?.establishment_id) // Garantir que salva no ponto de venda atual
      }

      if (activeReservation?.id) {
        await updateReservation(activeReservation.id, payload)
        toast.success('Reserva atualizada com sucesso.')
        setOpenEdit(false)
      } else {
        await createReservation(payload)
        toast.success('Reserva criada com sucesso.')
        setOpenNew(false)
      }
      
      resetForm()
      setActiveReservation(null)
      
      // Forçar atualização imediata
      await loadReservations()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível salvar a reserva.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!activeReservation?.id) return
    
    setSaving(true)
    try {
      await cancelReservation(activeReservation.id, 'Cancelado pelo usuário')
      toast.success('Reserva cancelada com sucesso.')
      setOpenCancel(false)
      setActiveReservation(null)
      await loadReservations()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível cancelar a reserva.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'confirmed': return 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
      case 'pending_payment': return 'border-amber-900/60 bg-amber-950/30 text-amber-200'
      case 'cancelled': return 'border-rose-900/60 bg-rose-950/30 text-rose-200'
      case 'completed': return 'border-slate-900/60 bg-slate-950/30 text-slate-200'
      case 'no_show': return 'border-violet-900/60 bg-violet-950/30 text-violet-200'
      default: return 'border-slate-800 bg-slate-950 text-slate-200'
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'confirmed': return 'Confirmada'
      case 'pending_payment': return 'Aguardando Pagamento'
      case 'cancelled': return 'Cancelada'
      case 'completed': return 'Concluída'
      case 'no_show': return 'Não Compareceu'
      default: return status
    }
  }

  return (
    <div className="h-[calc(100vh-56px-48px)] overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-lg sm:text-xl font-semibold">Reservas</div>
          <div className="mt-1 text-sm text-slate-300">Gestão de reservas de mesas</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <button
            type="button"
            onClick={loadReservations}
            disabled={loading}
            className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={openNewModal}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Nova Reserva
          </button>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-hidden border border-slate-800 rounded-2xl bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Mesa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Pessoas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-400">
                    Carregando...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-400">
                    Nenhuma reserva encontrada para esta data.
                  </td>
                </tr>
              ) : (
                reservations.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-slate-800">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-100">{reservation.customer_name}</div>
                      {reservation.customer_nuit && (
                        <div className="text-xs text-slate-400">NUIT: {reservation.customer_nuit}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reservation.customer_phone && (
                        <div className="text-sm text-slate-100">{reservation.customer_phone}</div>
                      )}
                      {reservation.customer_email && (
                        <div className="text-xs text-slate-400">{reservation.customer_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      Mesa {tables.find(t => t.id === reservation.table_id)?.number || reservation.table_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-100">
                        {new Date(reservation.reservation_date).toLocaleDateString('pt-MZ')}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">{reservation.time_slot}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      {reservation.people_count} pessoa{reservation.people_count > 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      {reservation.estimated_amount ? fmtMoney.format(reservation.estimated_amount) : '-'}
                      {reservation.deposit_amount && (
                        <div className="text-xs text-slate-400">
                          Sinal: {fmtMoney.format(reservation.deposit_amount)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(reservation.status)}`}>
                        {getStatusLabel(reservation.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(reservation)}
                          className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-100"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(reservation)}
                          className="rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-100"
                        >
                          Editar
                        </button>
                        {!['cancelled', 'completed'].includes(reservation.status) && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReservation(reservation)
                              setOpenCancel(true)
                            }}
                            className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-2 py-1 text-xs font-semibold text-rose-200"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes da Reserva */}
      <Modal open={openDetails} title="Detalhes da Reserva" onClose={() => setOpenDetails(false)}>
        {activeReservation && (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente</div>
                <div className="text-sm font-medium text-white">{activeReservation.customer_name}</div>
                {activeReservation.customer_phone && <div className="text-sm text-slate-300">{activeReservation.customer_phone}</div>}
                {activeReservation.customer_email && <div className="text-sm text-slate-400">{activeReservation.customer_email}</div>}
                {activeReservation.customer_nuit && <div className="text-xs text-slate-500">NUIT: {activeReservation.customer_nuit}</div>}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</div>
                <div>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(activeReservation.status)}`}>
                    {getStatusLabel(activeReservation.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 border-y border-slate-800/50">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mesa</div>
                <div className="text-sm text-white font-medium">
                  Mesa {tables.find(t => t.id === activeReservation.table_id)?.number || activeReservation.table_id}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data e Hora</div>
                <div className="text-sm text-white">
                  {new Date(activeReservation.reservation_date).toLocaleDateString('pt-MZ')}
                </div>
                <div className="text-xs text-slate-400 capitalize">{activeReservation.time_slot}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pessoas</div>
                <div className="text-sm text-white">
                  {activeReservation.people_count} pessoa{activeReservation.people_count > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financeiro</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Valor Estimado:</span>
                    <span className="text-white font-medium">
                      {activeReservation.estimated_amount ? fmtMoney.format(activeReservation.estimated_amount) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Sinal (%):</span>
                    <span className="text-white">{activeReservation.deposit_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Valor do Sinal:</span>
                    <span className="text-brand-400 font-bold">
                      {activeReservation.deposit_amount ? fmtMoney.format(activeReservation.deposit_amount) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pagamento do Sinal</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Método:</span>
                    <span className="text-white capitalize">{activeReservation.payment_method || 'Aguardando'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Referência:</span>
                    <span className="text-white text-xs truncate max-w-[120px]" title={activeReservation.payment_reference}>
                      {activeReservation.payment_reference || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {(activeReservation.notes || activeReservation.special_requests) && (
              <div className="grid gap-4 pt-4 border-t border-slate-800/50">
                {activeReservation.notes && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observações</div>
                    <div className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-800/50 italic">
                      "{activeReservation.notes}"
                    </div>
                  </div>
                )}
                {activeReservation.special_requests && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pedidos Especiais</div>
                    <div className="text-sm text-amber-200/80 bg-amber-950/10 p-3 rounded-xl border border-amber-900/20">
                      {activeReservation.special_requests}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setOpenDetails(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-100 transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenDetails(false)
                  openEditModal(activeReservation)
                }}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all active:scale-95"
              >
                Editar Reserva
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Nova Reserva */}
      <Modal open={openNew} title="Nova Reserva" onClose={() => setOpenNew(false)}>
        <ReservationForm
          formData={formData}
          setFormData={setFormData}
          tables={tables}
          reservations={reservations}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setOpenNew(false)}
        />
      </Modal>

      {/* Modal Editar Reserva */}
      <Modal open={openEdit} title="Editar Reserva" onClose={() => setOpenEdit(false)}>
        <ReservationForm
          formData={formData}
          setFormData={setFormData}
          tables={tables}
          reservations={reservations}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setOpenEdit(false)}
        />
      </Modal>

      {/* Modal Cancelar Reserva */}
      <Modal open={openCancel} title="Cancelar Reserva" onClose={() => setOpenCancel(false)}>
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Tem certeza que deseja cancelar a reserva de <span className="font-semibold text-white">{activeReservation?.customer_name}</span>?
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpenCancel(false)}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ReservationForm({ formData, setFormData, tables, reservations, saving, onSave, onCancel }) {
  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Calcular valor do depósito automaticamente
  function updateEstimatedAmount(value) {
    const estimated = parseFloat(value) || 0
    const percentage = parseFloat(formData.deposit_percentage) || 0
    const deposit = estimated * (percentage / 100)
    
    setFormData(prev => ({
      ...prev,
      estimated_amount: value,
      deposit_amount: deposit.toFixed(2)
    }))
  }

  function updateDepositPercentage(value) {
    const percentage = parseFloat(value) || 0
    const estimated = parseFloat(formData.estimated_amount) || 0
    const deposit = estimated * (percentage / 100)
    
    setFormData(prev => ({
      ...prev,
      deposit_percentage: value,
      deposit_amount: deposit.toFixed(2)
    }))
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Nome do Cliente *</label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => updateField('customer_name', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Nome completo"
          />
        </div>
        
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Telefone</label>
          <input
            type="tel"
            value={formData.customer_phone}
            onChange={(e) => updateField('customer_phone', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="+258 8X XXX XXXX"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Mesa *</label>
          <select
            value={formData.table_id}
            onChange={(e) => updateField('table_id', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">Selecione a mesa</option>
            {tables.map((table) => {
              // Verificar se mesa está ocupada no dia/turno selecionado
              const isOccupied = reservations.some(r => 
                r.table_id === table.id && 
                r.reservation_date === selectedDate &&
                r.time_slot === formData.time_slot &&
                !['cancelled', 'completed'].includes(r.status)
              )
              
              return (
                <option 
                  key={table.id} 
                  value={table.id}
                  disabled={isOccupied}
                  className={isOccupied ? 'text-slate-500' : ''}
                >
                  Mesa {table.number} (Capacidade: {table.capacity}) {isOccupied ? '- OCUPADA' : ''}
                </option>
              )
            })}
          </select>
        </div>
        
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Data *</label>
          <input
            type="date"
            value={formData.reservation_date}
            onChange={(e) => updateField('reservation_date', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Turno</label>
          <select
            value={formData.time_slot}
            onChange={(e) => updateField('time_slot', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="manhã">Manhã</option>
            <option value="almoço">Almoço</option>
            <option value="lanche">Lanche</option>
            <option value="jantar">Jantar</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Número de Pessoas *</label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.people_count}
            onChange={(e) => updateField('people_count', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Valor Estimado (MZN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.estimated_amount}
            onChange={(e) => updateEstimatedAmount(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">% Sinal (Ex: 50 para 50%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.deposit_percentage}
            onChange={(e) => updateDepositPercentage(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="50"
          />
        </div>
        
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Valor do Sinal (MZN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.deposit_amount}
            onChange={(e) => updateField('deposit_amount', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="0.00"
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Forma de Pagamento do Sinal</label>
          <select
            value={formData.payment_method}
            onChange={(e) => updateField('payment_method', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">Aguardando pagamento</option>
            <option value="cash">Dinheiro</option>
            <option value="mpesa">M-Pesa</option>
            <option value="emola">e-Mola</option>
            <option value="mkesh">mKesh</option>
            <option value="card">Cartão (POS)</option>
            <option value="transfer">Transferência</option>
            <option value="other">Outro</option>
          </select>
        </div>
        
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-400">Referência do Pagamento</label>
          <input
            type="text"
            value={formData.payment_reference}
            onChange={(e) => updateField('payment_reference', e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Referência ou transação ID"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-400">Observações</label>
        <textarea
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="Observações gerais sobre a reserva"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-400">Pedidos Especiais</label>
        <textarea
          value={formData.special_requests}
          onChange={(e) => updateField('special_requests', e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="Alergias, preferências, comemorações, etc."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar Reserva'}
        </button>
      </div>
    </div>
  )
}
