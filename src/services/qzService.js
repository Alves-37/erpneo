import qz from "qz-tray";

// Configuração de segurança para desenvolvimento (sem certificado real)
qz.security.setCertificatePromise(() => Promise.resolve("CERTIFICATE"));
qz.security.setSignaturePromise(() => Promise.resolve());

/**
 * Conecta ao QZ Tray via WebSocket
 */
export async function connectQZ() {
  if (qz.websocket.isActive()) return;
  
  try {
    // Timeout curto para não travar a UI se o QZ estiver fechado
    await qz.websocket.connect({ retries: 0, delay: 1 });
    console.log("✅ QZ Tray conectado");
  } catch (err) {
    console.warn("⚠️ QZ Tray offline.");
    throw new Error("QZ_OFFLINE");
  }
}

/**
 * Busca a impressora GA-E200
 */
export async function getPrinter() {
  try {
    // Tenta encontrar a impressora específica. Se não achar, busca a padrão.
    const printer = await qz.printers.find("GA-E200").catch(() => qz.printers.getDefault());
    if (!printer) {
      throw new Error("Impressora GA-E200 não encontrada e nenhuma impressora padrão definida.");
    }
    return printer;
  } catch (err) {
    console.error("❌ Erro ao buscar impressora:", err);
    throw err;
  }
}

/**
 * Formata e imprime um recibo de pedido
 * @param {Object} order Objeto do pedido
 * @param {Object} branch Info da filial
 */
export async function printOrderReceipt(order, branch) {
  try {
    await connectQZ();
    const printer = await getPrinter();
    const config = qz.configs.create(printer);

    const companyName = branch?.name || "MEU ERP";
    const date = new Date().toLocaleString('pt-BR');
    const tableInfo = order.table_number ? `Mesa: ${order.table_number} | Cliente: ${order.seat_number || '1'}` : 'Venda de Balcão';
    
    let itemsText = "";
    let total = 0;

    (order.items || []).forEach(item => {
      const name = (item.product_name || `Prod #${item.product_id}`).padEnd(18, ' ').substring(0, 18);
      const qty = String(item.qty || item.quantity || 1).padStart(3, ' ');
      const price = Number(item.price_at_order || item.unit_price || 0).toFixed(2).padStart(8, ' ');
      itemsText += `${name} ${qty}x ${price}\n`;
      total += (item.qty || item.quantity || 1) * (item.price_at_order || item.unit_price || 0);
    });

    const data = [
      {
        type: "raw",
        format: "plain",
        data: `
\x1B\x61\x01\x1B\x45\x01${companyName}\x1B\x45\x00
\x1B\x61\x00--------------------------------
Data: ${date}
Pedido: #${order.id || 'N/A'}
${tableInfo}
--------------------------------
ITEM               QTD    PRECO
${itemsText}--------------------------------
\x1B\x61\x02\x1B\x45\x01TOTAL: ${total.toFixed(2)} MZN\x1B\x45\x00
\x1B\x61\x01
Obrigado pela preferência!
\x1B\x61\x00
\n\n\n\n\x1D\x56\x00`
      }
    ];

    await qz.print(config, data);
    return true;
  } catch (error) {
    console.error("Erro na impressão:", error);
    throw error;
  }
}
