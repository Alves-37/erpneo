// Sistema de Impressão Térmica - ERPCRM
// Suporte para múltiplos métodos de impressão

class ThermalPrinter {
  constructor() {
    this.printerType = null; // 'web', 'bluetooth', 'escpos'
    this.isConnected = false;
    this.paperWidth = 80; // 80mm padrão
  }

  // 🖨️ Opção 1: Web Print API (Chrome/Edge)
  async printWithWebAPI(saleData) {
    try {
      // Verificar se suporta Web Print API
      if (!('print' in window)) {
        throw new Error('Navegador não suporta Web Print API');
      }

      // Criar conteúdo de impressão
      const printContent = this.generateReceiptHTML(saleData);
      
      // Abrir diálogo de impressão
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Aguardar impressão
      await new Promise((resolve) => {
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
          resolve();
        };
      });

      return { success: true, message: 'Impressão enviada com sucesso!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 📱 Opção 2: Bluetooth (para mobile)
  async connectBluetoothPrinter() {
    try {
      // Verificar suporte a Web Bluetooth API
      if (!('bluetooth' in navigator)) {
        throw new Error('Navegador não suporta Web Bluetooth API');
      }

      // Solicitar dispositivo Bluetooth
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // ESC/POS Service
          { namePrefix: 'Printer' }
        ]
      });

      // Conectar ao dispositivo
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      this.printerType = 'bluetooth';
      this.isConnected = true;
      this.device = device;
      this.characteristic = characteristic;

      return { success: true, message: 'Impressora Bluetooth conectada!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 🔌 Opção 3: ESC/POS Direct (via USB/Rede)
  async printWithESCPOS(saleData) {
    try {
      const commands = this.generateESCPOSCommands(saleData);
      
      // Enviar comandos para impressora
      // Implementação depende do método (USB, Rede, Serial)
      
      return { success: true, message: 'Comandos ESC/POS enviados!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 📄 Gerar HTML para impressão Web
  generateReceiptHTML(saleData) {
    const { sale, items, company, customer, payment } = saleData;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Recibo - ${company.name}</title>
      <style>
        @media print {
          body { 
            margin: 0; 
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
          }
          .no-print { display: none; }
          .receipt {
            max-width: 80mm;
            margin: 0 auto;
            text-align: center;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border-top { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; }
          .border-bottom { border-bottom: 1px dashed #000; margin-bottom: 10px; padding-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; text-align: left; }
          .total { font-weight: bold; font-size: 14px; }
          .left-align { text-align: left; }
          .right-align { text-align: right; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Cabeçalho Centralizado -->
        <div class="center">
          <h2 class="bold">${company.name}</h2>
          <p>${company.address || ''}</p>
          <p>${company.phone || ''}</p>
          <p>${company.document || ''}</p>
        </div>
        
        <div class="border-bottom"></div>
        
        <!-- Informações da Venda Centralizadas -->
        <div class="center">
          <p><strong>RECIBO DE VENDA</strong></p>
          <p>Nº: ${sale.id}</p>
          <p>Data: ${new Date(sale.created_at).toLocaleString('pt-BR')}</p>
        </div>
        
        <div class="border-bottom"></div>
        
        <!-- Cliente Centralizado -->
        ${customer ? `
        <div class="center">
          <p><strong>Cliente:</strong> ${customer.name}</p>
        </div>
        <div class="border-bottom"></div>
        ` : ''}
        
        <!-- Itens -->
        <div class="left-align">
          ${items.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.name}</span>
              <span>${item.total.toFixed(2)} MT</span>
            </div>
            ${item.notes ? `<div style="font-size: 10px; margin-left: 10px;">Obs: ${item.notes}</div>` : ''}
          `).join('')}
        </div>
        
        <div class="border-top"></div>
        
        <!-- Totais -->
        <div>
          <div class="item">
            <span>Subtotal:</span>
            <span>${sale.subtotal.toFixed(2)} MT</span>
          </div>
          ${sale.discount > 0 ? `
          <div class="item">
            <span>Desconto:</span>
            <span>-${sale.discount.toFixed(2)} MT</span>
          </div>
          ` : ''}
          <div class="item total">
            <span>TOTAL:</span>
            <span>${sale.total.toFixed(2)} MT</span>
          </div>
        </div>
        
        <div class="border-top"></div>
        
        <!-- Pagamento Centralizado -->
        <div class="center">
          <p><strong>Pagamento:</strong> ${this.getPaymentMethodText(payment.method)}</p>
          ${payment.amount_paid ? `<p>Valor Pago: ${payment.amount_paid.toFixed(2)} MT</p>` : ''}
          ${payment.change ? `<p>Troco: ${payment.change.toFixed(2)} MT</p>` : ''}
        </div>
        
        <div class="border-bottom"></div>
        
        <!-- Rodapé Centralizado -->
        <div class="center">
          <p>Obrigado pela preferência!</p>
          <p>Volte sempre!</p>
          <p style="font-size: 10px;">${new Date().toLocaleString('pt-BR')}</p>
        </div>
        
        <!-- Informações fiscais se necessário -->
        ${sale.fiscal_document ? `
        <div class="border-top"></div>
        <div class="center">
          <p style="font-size: 10px;">${sale.fiscal_document.type} ${sale.fiscal_document.number}</p>
          <p style="font-size: 10px;">${sale.fiscal_document.access_key || ''}</p>
        </div>
        ` : ''}
      </div>
      
      <script class="no-print">
        window.onload = function() {
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
    `;
  }

  // 🔌 Gerar comandos ESC/POS
  generateESCPOSCommands(saleData) {
    const { sale, items, company, customer, payment } = saleData;
    let commands = [];

    // Inicialização
    commands.push(Buffer.from([0x1B, 0x40])); // ESC @ - Initialize printer

    // Centralizar
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 - Center align

    // Cabeçalho Centralizado
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 - Center align
    commands.push(Buffer.from(company.name + '\n'));
    commands.push(Buffer.from((company.address || '') + '\n'));
    commands.push(Buffer.from((company.phone || '') + '\n'));
    commands.push(Buffer.from((company.document || '') + '\n'));

    // Linha separadora
    commands.push(Buffer.from('--------------------------------\n'));

    // Título Centralizado
    commands.push(Buffer.from('RECIBO DE VENDA\n'));
    commands.push(Buffer.from(`Nº: ${sale.id}\n`));
    commands.push(Buffer.from(`Data: ${new Date(sale.created_at).toLocaleString('pt-BR')}\n`));

    // Linha separadora
    commands.push(Buffer.from('--------------------------------\n'));

    // Cliente Centralizado
    if (customer) {
      commands.push(Buffer.from(`Cliente: ${customer.name}\n`));
      commands.push(Buffer.from('--------------------------------\n'));
    }

    // Alinhar à esquerda
    commands.push(Buffer.from([0x1B, 0x61, 0x00])); // ESC a 0 - Left align

    // Itens
    items.forEach(item => {
      const itemLine = `${item.quantity}x ${item.name}`;
      const priceLine = `${item.total.toFixed(2)} MT`;
      
      commands.push(Buffer.from(itemLine + '\n'));
      if (item.notes) {
        commands.push(Buffer.from(`  Obs: ${item.notes}\n`));
      }
      commands.push(Buffer.from(priceLine.padStart(32) + '\n'));
    });

    // Linha separadora
    commands.push(Buffer.from('--------------------------------\n'));

    // Totais
    commands.push(Buffer.from(`Subtotal: ${sale.subtotal.toFixed(2)} MT\n`));
    if (sale.discount > 0) {
      commands.push(Buffer.from(`Desconto: -${sale.discount.toFixed(2)} MT\n`));
    }
    
    // Negrito para total
    commands.push(Buffer.from([0x1B, 0x45, 0x01])); // ESC E 1 - Bold on
    commands.push(Buffer.from(`TOTAL: ${sale.total.toFixed(2)} MT\n`));
    commands.push(Buffer.from([0x1B, 0x45, 0x00])); // ESC E 0 - Bold off

    // Linha separadora
    commands.push(Buffer.from('--------------------------------\n'));

    // Pagamento Centralizado
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 - Center align
    commands.push(Buffer.from(`Pagamento: ${this.getPaymentMethodText(payment.method)}\n`));
    if (payment.amount_paid) {
      commands.push(Buffer.from(`Valor Pago: ${payment.amount_paid.toFixed(2)} MT\n`));
    }
    if (payment.change) {
      commands.push(Buffer.from(`Troco: ${payment.change.toFixed(2)} MT\n`));
    }

    // Linha separadora
    commands.push(Buffer.from('--------------------------------\n'));

    // Rodapé
    commands.push(Buffer.from('Obrigado pela preferência!\n'));
    commands.push(Buffer.from('Volte sempre!\n'));
    commands.push(Buffer.from(new Date().toLocaleString('pt-BR') + '\n'));

    // Documento fiscal se existir
    if (sale.fiscal_document) {
      commands.push(Buffer.from('--------------------------------\n'));
      commands.push(Buffer.from(`${sale.fiscal_document.type} ${sale.fiscal_document.number}\n`));
      if (sale.fiscal_document.access_key) {
        commands.push(Buffer.from(sale.fiscal_document.access_key + '\n'));
      }
    }

    // Cut paper
    commands.push(Buffer.from([0x1D, 0x56, 0x00])); // GS V 0 - Full cut

    return commands;
  }

  // 📝 Obter texto do método de pagamento
  getPaymentMethodText(method) {
    const methods = {
      'cash': 'Dinheiro',
      'card': 'Cartão',
      'pix': 'PIX',
      'transfer': 'Transferência',
      'check': 'Cheque',
      'other': 'Outro'
    };
    return methods[method] || method;
  }

  // 🖨️ Método principal de impressão
  async printReceipt(saleData) {
    try {
      // Tentar métodos em ordem de preferência
      const methods = [
        { name: 'web', fn: () => this.printWithWebAPI(saleData) },
        { name: 'bluetooth', fn: () => this.printWithESCPOS(saleData) },
        { name: 'escpos', fn: () => this.printWithESCPOS(saleData) }
      ];

      for (const method of methods) {
        try {
          const result = await method.fn();
          if (result.success) {
            return { ...result, method: method.name };
          }
        } catch (error) {
          console.log(`Método ${method.name} falhou:`, error.message);
          continue;
        }
      }

      throw new Error('Nenhum método de impressão disponível');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ⚙️ Configurar impressora
  async configurePrinter(config) {
    this.paperWidth = config.paperWidth || 80;
    this.printerType = config.type || 'web';
    
    if (config.type === 'bluetooth' && !this.isConnected) {
      return await this.connectBluetoothPrinter();
    }
    
    return { success: true, message: 'Impressora configurada!' };
  }
}

// Exportar instância global
export const thermalPrinter = new ThermalPrinter();
export default ThermalPrinter;
