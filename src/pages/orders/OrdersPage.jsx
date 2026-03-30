import { useEffect, useMemo, useState } from 'react'

import { closeOrder, createOrder, deleteOrder, listOrders, updateOrder } from '../../api/orders.js'
import { listCustomers } from '../../api/customers.js'
import { getMyBranch } from '../../api/branches.js'
import { listCompanies } from '../../api/companies.js'
import { listProducts, listProductImages } from '../../api/products.js'
import { thermalPrinter } from '../../utils/thermalPrinter.js'
import { printOrderReceipt } from '../../services/qzService.js'
import ProductOptionSelector from '../../components/ProductOptionSelector.jsx'
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

function fmtStatus(st) {
  if (st === 'open') return 'Aberto'
  if (st === 'in_progress') return 'Em preparo'
  if (st === 'closed') return 'Fechado'
  if (st === 'cancelled') return 'Cancelado'
  return st
}

export default function OrdersPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://neoerp-production.up.railway.app'

  const [status, setStatus] = useState('open')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const [products, setProducts] = useState([])
  const [imageByProductId, setImageByProductId] = useState({})

  const [openClose, setOpenClose] = useState(false)
  const [closingOrder, setClosingOrder] = useState(null)
  
  // Estados para modal de confirmação de impressão
  const [openPrintConfirm, setOpenPrintConfirm] = useState(false)
  const [printConfirmCallback, setPrintConfirmCallback] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [saving, setSaving] = useState(false)

  const [openDetails, setOpenDetails] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState(null)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmKind, setConfirmKind] = useState(null)
  const [confirmOrder, setConfirmOrder] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  // Estados para criação de pedidos
  const [openCreateOrder, setOpenCreateOrder] = useState(false)
  const [createOrderLoading, setCreateOrderLoading] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newSeatNumber, setNewSeatNumber] = useState('')
  const [newOrderItems, setNewOrderItems] = useState([])

  // Estados para adicionar itens a pedido existente
  const [openAddItems, setOpenAddItems] = useState(false)
  const [addItemsLoading, setAddItemsLoading] = useState(false)
  const [targetOrder, setTargetOrder] = useState(null)
  const [addOrderItems, setAddOrderItems] = useState([])

  // Estado para seleção de opções
  const [optionsProduct, setOptionsProduct] = useState(null)

  const paidNum = useMemo(() => {
    const n = Number(String(paid || '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [paid])

  const orderTotal = useMemo(() => {
    const items = closingOrder?.items || []
    return (items || []).reduce((acc, i) => acc + Number(i.line_total || 0), 0)
  }, [closingOrder])

  const effectivePaid = useMemo(() => {
    if (paymentMethod === 'cash') return paidNum
    return orderTotal
  }, [paymentMethod, paidNum, orderTotal])

  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    return Math.max(0, effectivePaid - orderTotal)
  }, [paymentMethod, effectivePaid, orderTotal])

  useEffect(() => {
    if (!openClose) return
    if (paymentMethod !== 'cash') {
      setPaid(orderTotal ? Number(orderTotal).toFixed(2) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, orderTotal, openClose])

  function openDetailsModal(o) {
    setDetailsOrder(o)
    setOpenDetails(true)
  }

  function openAddItemsModal(o) {
    try {
      const orderItems = (o.items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || `Produto #${item.product_id}`,
        quantity: item.qty || 1,
        unit_price: item.price_at_order,
        total: item.line_total,
        order_id: o.id,
        order_table_number: o.table_number,
        order_seat_number: o.seat_number
      }))
      
      if (!orderItems.length) {
        toast.error('Este pedido não tem itens para adicionar')
        return
      }
      
      sessionStorage.setItem('pdv_order_items', JSON.stringify(orderItems))
      sessionStorage.setItem('pdv_order_info', JSON.stringify({
        order_id: o.id,
        table_number: o.table_number,
        seat_number: o.seat_number,
        order_type: o.order_type,
        status: o.status
      }))
      
      window.location.href = '/pdv'
      
    } catch (error) {
      toast.error('Erro ao redirecionar para PDV: ' + error.message)
    }
  }

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of products || []) map.set(p.id, p)
    return map
  }, [products])

  async function load() {
    setLoading(true)
    try {
      const { data } = await listOrders({ status, limit: 200, offset: 0 })
      setRows(data || [])
    } catch {
      toast.error('Não foi possível carregar pedidos agora.')
    } finally {
      setLoading(false)
    }
  }

  async function printDirect(order) {
    try {
      const branch = await getMyBranch();
      await printOrderReceipt(order, branch);
      toast.success('Comprovante enviado para a impressora.');
    } catch (err) {
      console.error('Erro na impressão direta:', err);
      // Fallback para o componente antigo se necessário
      await thermalPrinter.printKitchenTicket({
        id: order.id,
        table_number: order.table_number,
        seat_number: order.seat_number,
        items: order.items?.map(it => ({
          product_name: it.product_name || `Produto #${it.product_id}`,
          qty: it.qty,
          notes: it.notes || ''
        })) || [],
        company: { name: companies?.[0]?.name || 'ERPCRM' }
      });
    }
  }

  async function loadProducts() {
    setLoading(true)
    try {
      const data = await listProducts({ 
        limit: 500, 
        offset: 0,
        is_active: true  // Apenas produtos ativos
      })
      setProducts(data || [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Forçar reload quando mudar de aba ou focar na página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProducts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadImages() {
      if (!products?.length) return;
      
      try {
        // Carregar imagens em lotes para evitar sobrecarga e muitos erros simultâneos
        const batchSize = 5;
        const results = [];
        
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (p) => {
              try {
                // Tenta carregar as imagens do produto
                const imgs = await listProductImages(p.id);
                const first = imgs?.[0]?.url || imgs?.[0]?.file_path || null;
                return [p.id, first];
              } catch (err) {
                // Log silencioso do erro de CORS ou rede
                console.debug(`Erro ao carregar imagem para produto ${p.id}:`, err.message);
                return [p.id, null];
              }
            })
          );
          results.push(...batchResults);
        }

        const map = {};
        for (const [id, filePath] of results) {
          map[id] = filePath;
        }
        
        if (!cancelled) {
          setImageByProductId(map);
        }
      } catch (err) {
        console.error("Erro crítico ao carregar imagens:", err);
        if (!cancelled) setImageByProductId({});
      }
    }

    if ((products || []).length) loadImages()
    return () => {
      cancelled = true
    }
  }, [products])

  async function markInProgress(o) {
    try {
      await updateOrder(o.id, { status: 'in_progress' })
      toast.success('Pedido marcado como em preparo.')
      await load()
    } catch {
      toast.error('Não foi possível atualizar o pedido agora.')
    }
  }

  function requestCancelOrder(o) {
    setConfirmKind('cancel')
    setConfirmOrder(o)
    setOpenConfirm(true)
  }

  function requestDeleteOrder(o) {
    if (!o) return
    // Permitir excluir pedidos fechados ou cancelados
    if (o.status !== 'closed' && o.status !== 'cancelled') {
      toast.error('Só é possível excluir pedidos fechados ou cancelados.')
      return
    }
    setConfirmKind('delete')
    setConfirmOrder(o)
    setOpenConfirm(true)
  }

  async function confirmAction() {
    if (!confirmOrder || !confirmKind) return
    setConfirmBusy(true)
    try {
      if (confirmKind === 'cancel') {
        await updateOrder(confirmOrder.id, { status: 'cancelled' })
        toast.success('Pedido cancelado.')
      } else if (confirmKind === 'delete') {
        await deleteOrder(confirmOrder.id)
        toast.success('Pedido excluído.')
      }
      setOpenConfirm(false)
      setConfirmKind(null)
      setConfirmOrder(null)
      await load()
      setOpenDetails(false)
    } catch {
      toast.error(confirmKind === 'delete' ? 'Não foi possível excluir o pedido agora.' : 'Não foi possível cancelar o pedido agora.')
    } finally {
      setConfirmBusy(false)
    }
  }

  function openCloseModal(o) {
    setClosingOrder(o)
    setPaymentMethod('cash')
    setPaid('')
    setOpenClose(true)
  }

  function addProductToOrder(product) {
    if (!newTableNumber || !newSeatNumber) {
      toast.error('Informe a mesa e o cliente/assento primeiro.')
      return
    }

    // Abrir modal de opções para restaurantes
    setOptionsProduct({
      ...product,
      basePrice: Number(product.price || 0),
      quantity: 1
    })
  }

  function handleOptionsChange(optionsData) {
    if (!optionsProduct) return

    const newItem = {
      product_id: optionsProduct.id,
      product_name: optionsProduct.name,
      qty: optionsProduct.quantity || 1,
      price_at_order: optionsProduct.basePrice,
      cost_at_order: Number(optionsProduct.cost || 0),
      line_total: optionsData.totalPrice,
      options: optionsData.selectedOptions
    }

    // Verificar se já existe um item igual
    const existingIndex = newOrderItems.findIndex(item => 
      item.product_id === optionsProduct.id && 
      JSON.stringify(item.options) === JSON.stringify(optionsData.selectedOptions)
    )

    if (existingIndex >= 0) {
      const updated = [...newOrderItems]
      updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + 1 }
      setNewOrderItems(updated)
    } else {
      setNewOrderItems(prev => [...prev, newItem])
    }
  }

  function addProductToNewOrder(product) {
    if (!newTableNumber || !newSeatNumber) {
      toast.error('Preencha número da mesa e cliente.')
      return
    }

    const existingIndex = newOrderItems.findIndex(item => item.product_id === product.id)

    if (existingIndex >= 0) {
      const updated = [...newOrderItems]
      updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + 1 }
      setNewOrderItems(updated)
    } else {
      const newItem = {
        product_id: product.id,
        qty: 1,
        price_at_order: product.price,
        line_total: product.price
      }
      setNewOrderItems([...newOrderItems, newItem])
    }
  }

  function addProductToExistingOrder(product) {
    const existingIndex = addOrderItems.findIndex(item => item.product_id === product.id)

    if (existingIndex >= 0) {
      const updated = [...addOrderItems]
      const newQty = (updated[existingIndex].qty || 0) + 1
      updated[existingIndex] = { 
        ...updated[existingIndex], 
        qty: newQty,
        line_total: Number((newQty * (updated[existingIndex].price_at_order || 0)).toFixed(2))
      }
      setAddOrderItems(updated)
    } else {
      const newItem = {
        product_id: product.id,
        qty: 1,
        price_at_order: Number(product.price || 0),
        cost_at_order: Number(product.cost || 0),
        line_total: Number(product.price || 0)
      }
      setAddOrderItems([...addOrderItems, newItem])
    }
  }

  function updateExistingOrderItemQty(index, newQty) {
    if (newQty <= 0) {
      const updated = addOrderItems.filter((_, i) => i !== index)
      setAddOrderItems(updated)
      return
    }

    const updated = [...addOrderItems]
    const price = Number(updated[index].price_at_order || 0)
    updated[index] = { 
      ...updated[index], 
      qty: newQty, 
      line_total: Number((newQty * price).toFixed(2)) 
    }
    setAddOrderItems(updated)
  }

  function removeExistingOrderItem(index) {
    const updated = addOrderItems.filter((_, i) => i !== index)
    setAddOrderItems(updated)
  }

  function updateNewItemQuantity(index, newQty) {
    if (newQty <= 0) {
      removeNewOrderItem(index)
      return
    }

    const updated = [...newOrderItems]
    updated[index] = { ...updated[index], qty: newQty, line_total: newQty * updated[index].price_at_order }
    setNewOrderItems(updated)
  }

  async function doCreateOrder() {
    if (!newTableNumber || !newSeatNumber) {
      toast.error('Preencha número da mesa e cliente.')
      return
    }

    if (newOrderItems.length === 0) {
      toast.error('Adicione pelo menos um produto ao pedido.')
      return
    }

    setCreateOrderLoading(true)
    try {
      const payload = {
        table_number: parseInt(newTableNumber),
        seat_number: parseInt(newSeatNumber),
        items: newOrderItems.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          price_at_order: item.price_at_order,
          cost_at_order: item.cost_at_order
        }))
      }

      const createdOrder = await createOrder(payload)
      toast.success('Pedido criado com sucesso!')
      
      // Perguntar se deseja imprimir o ticket de cozinha
      setTimeout(() => {
        showPrintConfirm(() => printReceiptAfterOrder({
          ...createdOrder,
          status: 'open' // Garante que caia no fluxo de ticket de cozinha
        }))
      }, 500)
      
      // Resetar formulário
      setOpenCreateOrder(false)
      setNewTableNumber('')
      setNewSeatNumber('')
      setNewOrderItems([])
      
      // Recarregar lista
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Não foi possível criar o pedido.')
    } finally {
      setCreateOrderLoading(false)
    }
  }

  async function doUpdateOrder() {
    if (!targetOrder) return;
    
    setAddItemsLoading(true)
    try {
      console.log('Atualizando pedido:', targetOrder.id);
      
      // Mapear itens para o formato que o backend espera
      const payload = {
        table_number: Number(targetOrder.table_number),
        seat_number: Number(targetOrder.seat_number),
        items: addOrderItems.map(item => ({
          product_id: Number(item.product_id),
          qty: Number(item.qty),
          price_at_order: Number(item.price_at_order || 0),
          cost_at_order: Number(item.cost_at_order || 0)
        }))
      };

      console.log('Payload enviado para updateOrder (JSON):', JSON.stringify(payload, null, 2));

      // TENTAR ATUALIZAR PRIMEIRO (pode funcionar se o backend for parcialmente compatível)
      let response = null;
      let updateWorked = false;
      
      try {
        response = await updateOrder(targetOrder.id, payload);
        console.log('Resposta COMPLETA do servidor (updateOrder):', JSON.stringify(response, null, 2));
        updateWorked = true;
      } catch (updateError) {
        console.log('Update falhou, tentando abordagem alternativa:', updateError.message);
        
        // ABORDAGEM ALTERNATIVA: Criar novo pedido e substituir
        try {
          const createPayload = {
            table_number: Number(targetOrder.table_number),
            seat_number: Number(targetOrder.seat_number),
            items: payload.items
          };
          
          console.log('Tentando criar novo pedido como alternativa:', JSON.stringify(createPayload, null, 2));
          const newOrder = await createOrder(createPayload);
          console.log('Novo pedido criado:', newOrder);
          
          response = newOrder;
          updateWorked = true;
          
          toast.success('Pedido atualizado (criado novo pedido)!')
        } catch (createError) {
          console.error('Ambas abordagens falharam:', createError);
          throw createError;
        }
      }
      
      // Verificar se a resposta contém os itens atualizados
      if (response && response.items) {
        console.log('Itens na resposta do backend:', response.items.length);
        console.log('Itens esperados:', payload.items.length);
        
        if (response.items.length !== payload.items.length) {
          console.error('⚠️ BACKEND NÃO SALVOU TODOS OS ITENS!');
          console.error('Enviados:', payload.items.length, 'Recebidos:', response.items.length);
          toast.error('Erro: Backend não salvou todos os itens. Contate o suporte.')
        } else {
          if (updateWorked) {
            toast.success('Pedido atualizado com sucesso!')
          }
        }
      } else {
        if (updateWorked) {
          toast.success('Pedido atualizado com sucesso!')
        }
      }
      
      // Guardar itens para impressão
      const itemsForKitchen = [...addOrderItems];
      const orderInfoForKitchen = { ...targetOrder };
      
      // NÃO perguntar sobre impressão ao atualizar pedido
      // Apenas ao finalizar pedido deve perguntar
      
      // Resetar formulário
      setOpenAddItems(false)
      setTargetOrder(null)
      setAddOrderItems([])
      
      // Forçar recarga imediata para garantir dados atualizados
      console.log('Recarregando dados do backend imediatamente...');
      await load();
      
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err);
      toast.error(err?.response?.data?.detail || 'Não foi possível atualizar o pedido.')
    } finally {
      setAddItemsLoading(false)
    }
  }

  function resetCreateOrder() {
    setNewTableNumber('')
    setNewSeatNumber('')
    setNewOrderItems([])
    setOptionsProduct(null)
  }

  async function handleCloseOrder() {
    if (!closingOrder) return

    const effectivePaid = Number(String(paid || '0').replace(',', '.'))
    if (!Number.isFinite(effectivePaid) || effectivePaid < orderTotal) {
      if (paymentMethod !== 'debt') {
        toast.error(`Valor pago insuficiente. Total: ${orderTotal.toFixed(2)} MZN`)
        return
      }
    }

    try {
      setSaving(true)
      
      const closePayload = {
        payment_method: paymentMethod,
        paid: effectivePaid,
        items: closingOrder.items?.map(item => ({
          product_id: item.product_id,
          qty: Number(item.qty || item.quantity),
          price_at_order: Number(item.price_at_order || item.price_at_sale || 0),
          cost_at_order: Number(item.cost_at_order || item.cost_at_sale || 0)
        })) || []
      }
      
      await closeOrder(closingOrder.id, closePayload)
      toast.success('Pedido finalizado e venda registrada.')
      
      // Impressão direta após fechar (QZ Tray)
      try {
        const branch = await getMyBranch();
        await printOrderReceipt({
          ...closingOrder,
          payment_method: paymentMethod,
          paid: effectivePaid,
          change: Math.max(0, effectivePaid - orderTotal)
        }, branch);
        toast.success('Recibo enviado para a impressora.');
      } catch (printErr) {
        console.error('Erro na impressão QZ Tray:', printErr);
        // Fallback para o método térmico antigo se o QZ falhar
        try {
          await thermalPrinter.printReceipt({
            sale: {
              id: `REC-PED-${closingOrder.id}`,
              created_at: new Date().toISOString(),
              total: orderTotal,
              payment_method: paymentMethod
            },
            items: closingOrder.items?.map(item => ({
              name: item.product_name || `Produto #${item.product_id}`,
              quantity: item.qty,
              price_at_sale: Number(item.price_at_order || 0),
              total: item.qty * Number(item.price_at_order || 0)
            })) || [],
            company: { name: companies?.[0]?.name || 'ERPCRM' }
          });
        } catch (fallbackErr) {
          console.error('Erro no fallback de impressão:', fallbackErr);
        }
      }

      setOpenClose(false)
      setClosingOrder(null)
      await load()
    } catch (error) {
      console.error('Erro ao fechar pedido:', error)
      toast.error(error?.response?.data?.detail || 'Não foi possível finalizar o pedido agora.')
    } finally {
      setSaving(false)
    }
  }

  // Função para mostrar modal de confirmação de impressão
  function showPrintConfirm(callback) {
    setPrintConfirmCallback(() => callback)
    setOpenPrintConfirm(true)
  }

  // Função para imprimir recibo após finalizar pedido
  async function printReceiptAfterOrder(order) {
    try {
      const branch = await getMyBranch();
      await printOrderReceipt(order, branch);
      toast.success('Comprovante enviado para a impressora!');
    } catch (error) {
      console.error('Erro na impressão QZ Tray:', error);
      
      // Fallback para o método antigo se o QZ Tray estiver offline
      if (error.message === 'QZ_OFFLINE') {
        toast.info('QZ Tray não detectado. Abra o software para impressão direta.', { duration: 5000 });
        
        const orderData = {
          order: {
            table_number: order.table_number,
            seat_number: order.seat_number,
          },
          items: order.items?.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            qty: item.qty,
            notes: item.notes || ''
          })) || [],
          company: { name: companies?.[0]?.name || 'ERPCRM' }
        };
        await thermalPrinter.printKitchenTicket(orderData);
      } else {
        toast.error(`Falha na impressão: ${error.message}`);
      }
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pedidos</h1>
          <p className="text-xs text-slate-400">Gestão de pedidos do restaurante</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ k: 'open', l: 'Abertos' }, { k: 'in_progress', l: 'Em preparo' }, { k: 'closed', l: 'Fechados' }, { k: 'cancelled', l: 'Cancelados' }].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setStatus(t.k)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              status === t.k
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Carregando...</div>
        ) : rows.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {rows.map((o) => {
              const total = (o.items || []).reduce((acc, i) => acc + Number(i.line_total || 0), 0)
              const isDelivery = String(o.order_type || '').toLowerCase() === 'delivery'
              return (
                <div key={o.id} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <div className="border-b border-slate-800 bg-slate-900 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {isDelivery ? 'Delivery' : `Mesa ${o.table_number}`}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {isDelivery
                            ? `${o.customer_name || 'Cliente'}${o.customer_phone ? ` · ${o.customer_phone}` : ''}`
                            : `Cliente ${o.seat_number}`}
                        </div>
                        {isDelivery ? (
                          <div className="mt-1 text-[11px] text-slate-400 truncate" title={o.delivery_address || ''}>
                            {o.delivery_zone_name ? `${o.delivery_zone_name} · ` : ''}
                            {o.delivery_address || ''}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${
                          o.status === 'open'
                            ? 'border-amber-900/60 bg-amber-950/30 text-amber-200'
                            : o.status === 'in_progress'
                              ? 'border-sky-900/60 bg-sky-950/30 text-sky-200'
                              : o.status === 'closed'
                                ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
                                : 'border-rose-900/60 bg-rose-950/30 text-rose-200'
                        }`}
                      >
                        {fmtStatus(o.status)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <div>Itens: <span className="font-semibold text-slate-200">{o.items?.length || 0}</span></div>
                      <div>Total: <span className="font-semibold text-white">{Number(total || 0).toFixed(2)}</span></div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 bg-slate-900 px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        onClick={() => openDetailsModal(o)}
                      >
                        Detalhes
                      </button>

                      {o.status === 'open' || o.status === 'in_progress' ? (
                        <button
                          type="button"
                          className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                          onClick={() => requestCancelOrder(o)}
                        >
                          Cancelar
                        </button>
                      ) : null}

                      {o.status === 'closed' || o.status === 'cancelled' ? (
                        <button
                          type="button"
                          className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                          onClick={() => requestDeleteOrder(o)}
                        >
                          Excluir
                        </button>
                      ) : null}

                      {o.status === 'open' || o.status === 'in_progress' ? (
                        <button
                          type="button"
                          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
                          onClick={() => openCloseModal(o)}
                        >
                          Finalizar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Nenhum pedido encontrado.</div>
        )}
      </div>

      <Modal
        open={openDetails}
        title={
          detailsOrder
            ? String(detailsOrder.order_type || '').toLowerCase() === 'delivery'
              ? `Detalhes · Delivery`
              : `Detalhes · Mesa ${detailsOrder.table_number} · Cliente ${detailsOrder.seat_number}`
            : 'Detalhes'
        }
        onClose={() => setOpenDetails(false)}
      >
        {!detailsOrder ? null : (
          <div className="grid gap-4">
            {String(detailsOrder.order_type || '').toLowerCase() === 'delivery' ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-sm font-semibold text-white">Cliente</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.customer_name || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.customer_phone || '-'}</div>
                <div className="mt-3 text-sm font-semibold text-white">Entrega</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.delivery_kind || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.delivery_zone_name || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">{detailsOrder.delivery_address || '-'}</div>
                <div className="mt-1 text-sm text-slate-200">Taxa: {Number(detailsOrder.delivery_fee || 0).toFixed(2)}</div>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">
                Status: <span className="font-semibold text-white">{fmtStatus(detailsOrder.status)}</span>
              </div>
              <div className="text-sm text-slate-200">
                Total:{' '}
                <span className="font-semibold text-white">
                  {Number((detailsOrder.items || []).reduce((acc, i) => acc + Number(i.line_total || 0), 0) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              {(detailsOrder.items || []).map((it, idx) => {
                const p = productById.get(it.product_id)
                const rawUrl = imageByProductId?.[it.product_id] || null
                const url = rawUrl && rawUrl.startsWith('/') ? `${apiBaseUrl}${rawUrl}` : rawUrl
                // Usar it.id se existir, caso contrário combinar product_id e index para garantir unicidade
                const itemKey = it.id || `item-${it.product_id}-${idx}`
                return (
                  <div key={itemKey} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-900">
                        {url ? (
                          <img src={url} alt={p?.name || 'Produto'} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">Sem</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-100" title={it.product_name || p?.name || ''}>
                          {it.product_name || p?.name || `Produto ${it.product_id}`}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400 font-medium">Qtd: {Number(it.qty || 0)}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-white">{Number(it.line_total || 0).toFixed(2)}</div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {detailsOrder.status === 'open' ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                  onClick={async () => {
                    await markInProgress(detailsOrder)
                    setOpenDetails(false)
                  }}
                >
                  Em preparo
                </button>
              ) : null}

              {detailsOrder.status === 'open' || detailsOrder.status === 'in_progress' ? (
                <button
                  type="button"
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => {
                    setOpenDetails(false)
                    openCloseModal(detailsOrder)
                  }}
                >
                  Finalizar
                </button>
              ) : null}

              {detailsOrder.status === 'open' || detailsOrder.status === 'in_progress' ? (
                <button
                  type="button"
                  className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 hover:bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-200"
                  onClick={() => {
                    openAddItemsModal(detailsOrder)
                  }}
                >
                  Adicionar Itens
                </button>
              ) : null}

              {detailsOrder.status === 'open' || detailsOrder.status === 'in_progress' ? (
                <button
                  type="button"
                  className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                  onClick={() => requestCancelOrder(detailsOrder)}
                >
                  Cancelar
                </button>
              ) : null}

              {detailsOrder.status === 'closed' || detailsOrder.status === 'cancelled' ? (
                <button
                  type="button"
                  className="rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200"
                  onClick={() => requestDeleteOrder(detailsOrder)}
                >
                  Excluir
                </button>
              ) : null}

              <button
                type="button"
                className="rounded-xl border border-blue-900/60 bg-blue-950/30 hover:bg-blue-950/50 px-3 py-2 text-xs font-semibold text-blue-200"
                onClick={async () => {
                  try {
                    const branch = await getMyBranch();
                    await printOrderReceipt(detailsOrder, branch);
                    toast.success('Comprovante enviado para a impressora.');
                  } catch (err) {
                    toast.error('Erro na impressão: ' + err.message);
                  }
                }}
              >
                Imprimir
              </button>

              <button
                type="button"
                className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                onClick={() => setOpenDetails(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={openConfirm}
        title={
          confirmKind === 'delete'
            ? 'Excluir pedido'
            : confirmKind === 'cancel'
              ? 'Cancelar pedido'
              : 'Confirmar'
        }
        onClose={() => {
          if (confirmBusy) return
          setOpenConfirm(false)
          setConfirmKind(null)
          setConfirmOrder(null)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            {confirmKind === 'delete' ? (
              <>
                Tem certeza que deseja excluir o pedido{' '}
                <span className="font-semibold text-white">
                  {String(confirmOrder?.order_type || '').toLowerCase() === 'delivery'
                    ? 'Delivery'
                    : `Mesa ${confirmOrder?.table_number} · Cliente ${confirmOrder?.seat_number}`}
                </span>
                ?
              </>
            ) : (
              <>
                Tem certeza que deseja cancelar o pedido{' '}
                <span className="font-semibold text-white">
                  {String(confirmOrder?.order_type || '').toLowerCase() === 'delivery'
                    ? 'Delivery'
                    : `Mesa ${confirmOrder?.table_number} · Cliente ${confirmOrder?.seat_number}`}
                </span>
                ?
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={confirmBusy}
              onClick={() => {
                setOpenConfirm(false)
                setConfirmKind(null)
                setConfirmOrder(null)
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={confirmBusy}
              onClick={confirmAction}
              className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                confirmKind === 'delete'
                  ? 'border border-rose-900/60 bg-rose-950/50 hover:bg-rose-950 text-rose-100'
                  : 'border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 text-rose-200'
              }`}
            >
              {confirmBusy ? 'Processando...' : confirmKind === 'delete' ? 'Excluir' : 'Cancelar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openClose}
        title="Finalizar pedido"
        onClose={() => {
          if (!saving) setOpenClose(false)
        }}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Mesa <span className="font-semibold text-white">{closingOrder?.table_number || ''}</span> · Cliente{' '}
            <span className="font-semibold text-white">{closingOrder?.seat_number || ''}</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <div>Total</div>
              <div className="font-semibold text-white">{Number(orderTotal || 0).toFixed(2)}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Pagamento</div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="emola">e-Mola</option>
                  <option value="mkesh">mKesh</option>
                  <option value="card">Cartão (POS)</option>
                  <option value="transfer">Transferência</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label className="grid gap-2">
                <div className="text-xs font-semibold text-slate-400">Recebido</div>
                <input
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  disabled={paymentMethod !== 'cash'}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  inputMode="decimal"
                  placeholder="0.00"
                  type="text"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <div>Troco</div>
              <div className="text-slate-200">{Number(change || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenClose(false)}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => doClose()}
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Finalizando...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Criar Pedido */}
      <Modal
        open={openCreateOrder}
        title="Novo Pedido"
        onClose={() => {
          if (!createOrderLoading) {
            setOpenCreateOrder(false)
            resetCreateOrder()
          }
        }}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mesa</label>
              <input
                type="number"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Nº"
                min="1"
                disabled={createOrderLoading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Cliente/Assento</label>
              <input
                type="number"
                value={newSeatNumber}
                onChange={(e) => setNewSeatNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Nº"
                min="1"
                disabled={createOrderLoading}
              />
            </div>
          </div>

          {/* Lista de Produtos */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Produtos</label>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2">
              {products.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Nenhum produto disponível</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addProductToOrder(product)}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-brand-600 transition-colors disabled:opacity-60"
                      disabled={!newTableNumber || !newSeatNumber || createOrderLoading}
                    >
                      <div className="text-sm font-medium text-slate-100 truncate">{product.name}</div>
                      <div className="text-xs text-slate-400">{Number(product.price || 0).toFixed(2)} MT</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Itens do Pedido */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Itens do Pedido ({newOrderItems.length})
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {newOrderItems.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Nenhum item adicionado</div>
              ) : (
                newOrderItems.map((item, index) => (
                  <div key={index} className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-100 truncate">{item.product_name}</div>
                        {item.options && Object.keys(item.options).length > 0 && (
                          <div className="text-xs text-brand-400">+{Object.keys(item.options).length} opção(ões)</div>
                        )}
                        <div className="text-xs text-slate-400">
                          {Number(item.price_at_order).toFixed(2)} MT × {item.qty}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">
                          {Number(item.line_total).toFixed(2)} MT
                        </div>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => updateNewItemQuantity(index, item.qty - 1)}
                            className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                            disabled={createOrderLoading}
                          >
                            -
                          </button>
                          <span className="text-xs text-slate-300 w-4 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateNewItemQuantity(index, item.qty + 1)}
                            className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                            disabled={createOrderLoading}
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeNewOrderItem(index)}
                            className="h-5 w-5 rounded border border-rose-700 bg-rose-950 text-xs text-rose-300 hover:bg-rose-900"
                            disabled={createOrderLoading}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-lg font-bold text-white">
                {newOrderItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)} MT
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={createOrderLoading}
              onClick={() => {
                setOpenCreateOrder(false)
                resetCreateOrder()
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={createOrderLoading || newOrderItems.length === 0}
              onClick={doCreateOrder}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createOrderLoading ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Adicionar Itens ao Pedido Existente */}
      <Modal
        open={openAddItems}
        title={
          targetOrder
            ? `Adicionar Itens · Mesa ${targetOrder.table_number} · Cliente ${targetOrder.seat_number}`
            : 'Adicionar Itens'
        }
        onClose={() => setOpenAddItems(false)}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-200">
            Adicione mais produtos ao pedido existente. Os itens atuais também podem ser removidos ou ter suas quantidades alteradas.
          </div>

          {/* Lista de produtos para adicionar */}
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-slate-400">Adicionar Produtos</div>
            
            {/* Dropdown para selecionar produtos */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const product = products.find(p => p.id === parseInt(e.target.value))
                  if (product) {
                    addProductToExistingOrder(product)
                  }
                  e.target.value = '' // Resetar select
                }
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              disabled={addItemsLoading || !products.length}
            >
              <option value="">Selecione um produto...</option>
              {products
                .filter(p => p.is_active)  // Apenas produtos ativos
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {Number(product.price || 0).toFixed(2)} MT
                  </option>
                ))
              }
            </select>

            {/* Grid de produtos em cards (opcional, para acesso rápido) */}
            {products.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {products
                  .filter(p => p.is_active)  // Apenas produtos ativos
                  .slice(0, 10) // Limitar a 10 produtos para não sobrecarregar
                  .map(product => (
                    <button
                      key={product.id}
                      onClick={() => addProductToExistingOrder(product)}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-brand-600 transition-colors disabled:opacity-60"
                      disabled={addItemsLoading}
                      title={`${product.name} - ${Number(product.price || 0).toFixed(2)} MT`}
                    >
                      <div className="text-sm font-medium text-slate-100 truncate">{product.name}</div>
                      <div className="text-xs text-slate-400">{Number(product.price || 0).toFixed(2)} MT</div>
                    </button>
                  ))}
              </div>
            )}

            {!products.length && (
              <div className="text-xs text-slate-400 text-center py-4">
                Nenhum produto encontrado. Verifique se há produtos ativos e visíveis no cardápio.
              </div>
            )}
          </div>

          {/* Itens do pedido */}
          {addOrderItems.length > 0 && (
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-slate-400">Itens do Pedido</div>
              {addOrderItems.map((item, index) => {
                const p = productById.get(item.product_id)
                return (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100" title={p?.name || ''}>
                          {p?.name || `Produto ${item.product_id}`}
                        </div>
                        <div className="text-xs text-slate-400">{Number(item.price_at_order || 0).toFixed(2)} MT</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900">
                        <button
                          onClick={() => updateExistingOrderItemQty(index, Math.max(1, (item.qty || 1) - 1))}
                          className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                          disabled={addItemsLoading}
                        >
                          -
                        </button>
                        <span className="min-w-[2rem] text-center text-xs font-semibold text-white">
                          {item.qty || 1}
                        </span>
                        <button
                          onClick={() => updateExistingOrderItemQty(index, (item.qty || 1) + 1)}
                          className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                          disabled={addItemsLoading}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeExistingOrderItem(index)}
                        className="h-5 w-5 rounded border border-rose-700 bg-rose-950 text-xs text-rose-300 hover:bg-rose-900"
                        disabled={addItemsLoading}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="text-sm font-semibold text-slate-200">Total do Pedido:</div>
            <div className="text-sm font-bold text-white">
              {Number(addOrderItems.reduce((acc, item) => acc + (item.line_total || 0), 0)).toFixed(2)} MT
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpenAddItems(false)
                setTargetOrder(null)
                setAddOrderItems([])
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={addItemsLoading || addOrderItems.length === 0}
              onClick={doUpdateOrder}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {addItemsLoading ? 'Atualizando...' : 'Atualizar Pedido'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Opções */}
      {optionsProduct && (
        <ProductOptionSelector
          productId={optionsProduct.id}
          productName={optionsProduct.name}
          basePrice={optionsProduct.basePrice}
          onOptionsChange={handleOptionsChange}
          onClose={() => setOptionsProduct(null)}
        />
      )}

      {/* Modal de Confirmação de Impressão */}
      <Modal 
        open={openPrintConfirm} 
        title="Confirmação de Impressão" 
        onClose={() => setOpenPrintConfirm(false)}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-200">
            Deseja imprimir o recibo do pedido?
          </div>
          
          <div className="text-xs text-slate-400">
            O recibo será impresso na impressora térmica configurada nas configurações do sistema.
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenPrintConfirm(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700"
            >
              Não
            </button>
            <button
              type="button"
              onClick={() => {
                if (printConfirmCallback) {
                  printConfirmCallback()
                }
                setOpenPrintConfirm(false)
              }}
              className="rounded-xl border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Sim, imprimir
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
