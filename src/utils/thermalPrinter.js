// Sistema de Impressão Térmica - ERPCRM
// Suporte para múltiplos métodos de impressão

class ThermalPrinter {
  constructor() {
    this.printerType = null; // 'web', 'bluetooth', 'escpos'
    this.isConnected = false;
    this.paperWidth = 58; // 58mm formato compacto (tamanho pequeno)
    this.printerModel = 'gainscha-ga-e200'; // Modelo específico
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

  // 📱 Opção 2: Bluetooth (para mobile) - Otimizado para Gainscha GA-E200
  async connectBluetoothPrinter() {
    try {
      // Verificar suporte a Web Bluetooth API
      if (!('bluetooth' in navigator)) {
        throw new Error('Navegador não suporta Web Bluetooth API');
      }

      // Solicitar dispositivo Bluetooth Gainscha específico
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // ESC/POS Service
          { namePrefix: 'GA-E200' }, // Gainscha GA-E200
          { namePrefix: 'Gainscha' },
          { namePrefix: 'Printer' }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      // Conectar ao dispositivo
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      this.printerType = 'bluetooth';
      this.isConnected = true;
      this.device = device;
      this.characteristic = characteristic;
      this.printerModel = 'gainscha-ga-e200';

      return { success: true, message: 'Impressora Gainscha GA-E200 conectada via Bluetooth!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 🔌 Opção 3: ESC/POS Direct (via USB/Rede) - Otimizado para Gainscha GA-E200
  async printWithESCPOS(saleData) {
    try {
      const commands = this.generateESCPOSCommands(saleData);
      
      // Para Gainscha GA-E200, tentar diferentes métodos de conexão
      if (this.printerType === 'bluetooth' && this.characteristic) {
        // Envia via Bluetooth
        for (const command of commands) {
          await this.characteristic.writeValue(command);
        }
        return { success: true, message: 'Impresso via Bluetooth Gainscha GA-E200!' };
      } else {
        // Para USB/Rede - requer implementação específica
        // Aqui poderíamos usar WebUSB, WebSocket ou outro método
        console.log('Comandos ESC/POS gerados para Gainscha GA-E200:', commands);
        return { success: true, message: 'Comandos ESC/POS gerados para Gainscha GA-E200!' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 🖨️ Método específico para Gainscha GA-E200
  async connectGainschaPrinter() {
    try {
      // Tentar conexão via USB (WebUSB)
      if ('usb' in navigator) {
        const device = await navigator.usb.requestDevice({
          filters: [
            { vendorId: 0x0483 }, // Vendor ID Gainscha (exemplo)
            { productId: 0x5740 } // Product ID GA-E200 (exemplo)
          ]
        });

        await device.open();
        await device.claimInterface(0);

        this.printerType = 'usb';
        this.isConnected = true;
        this.device = device;
        this.printerModel = 'gainscha-ga-e200';

        return { success: true, message: 'Impressora Gainscha GA-E200 conectada via USB!' };
      } else {
        // Fallback para Bluetooth
        return await this.connectBluetoothPrinter();
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // � Reset forçado da impressora (resolver problema de papel longo)
  async resetPrinter() {
    try {
      let commands = [];
      
      // Comandos de reset completo
      commands.push(Buffer.from([0x1B, 0x40])); // ESC @ - Initialize printer
      commands.push(Buffer.from([0x1B, 0x4D, 0x00])); // ESC M 0 - Fonte A padrão
      commands.push(Buffer.from([0x1B, 0x21, 0x00])); // ESC ! 0 - Reset formatação
      commands.push(Buffer.from([0x1B, 0x61, 0x00])); // ESC a 0 - Alinhamento esquerda
      commands.push(Buffer.from([0x1B, 0x50, 0x00])); // ESC P 0 - Desabilitar modo página
      commands.push(Buffer.from([0x1B, 0x4A, 0x00])); // ESC J 0 - Sem avanço de linha
      commands.push(Buffer.from([0x1B, 0x64, 0x00])); // ESC d 0 - Sem avanço de linha
      
      // Enviar comandos de reset
      if (this.printerType === 'bluetooth' && this.characteristic) {
        for (const command of commands) {
          await this.characteristic.writeValue(command);
        }
      } else if (this.printerType === 'usb' && this.device) {
        for (const command of commands) {
          await this.device.transferOut(1, command);
        }
      }
      
      // Teste com uma linha simples
      const testCommands = [
        Buffer.from([0x1B, 0x40]), // Reset
        Buffer.from('TESTE RESET\n'),
        Buffer.from([0x1D, 0x56, 0x01]) // Partial cut
      ];
      
      if (this.printerType === 'bluetooth' && this.characteristic) {
        for (const command of testCommands) {
          await this.characteristic.writeValue(command);
        }
      } else if (this.printerType === 'usb' && this.device) {
        for (const command of testCommands) {
          await this.device.transferOut(1, command);
        }
      }
      
      return { success: true, message: 'Impressora resetada com sucesso!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // � Imprimir via USB para Gainscha
  async printViaUSB(saleData) {
    try {
      const commands = this.generateESCPOSCommands(saleData);
      
      if (!this.device || this.printerType !== 'usb') {
        throw new Error('Impressora USB não conectada');
      }

      // Enviar comandos via USB
      for (const command of commands) {
        await this.device.transferOut(1, command);
      }

      return { success: true, message: 'Impresso via USB Gainscha GA-E200!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 📄 Gerar HTML para impressão Web (Formato Compacto para Gainscha GA-E200)
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
          @page {
            size: 58mm 297mm;
            margin: 2mm;
          }
          body { 
            margin: 0; 
            padding: 2px;
            font-family: 'Courier New', monospace;
            font-size: 8px;
            width: 54mm; /* 58mm - margens */
            line-height: 1.0;
          }
          .no-print { display: none; }
          .receipt {
            width: 100%;
            margin: 0;
            text-align: center;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border-top { border-top: 1px dashed #000; margin-top: 3px; padding-top: 3px; }
          .border-bottom { border-bottom: 1px dashed #000; margin-bottom: 3px; padding-bottom: 3px; }
          .item { display: flex; justify-content: space-between; margin: 1px 0; text-align: left; }
          .total { font-weight: bold; font-size: 9px; }
          .left-align { text-align: left; }
          .right-align { text-align: right; }
          .company-name { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
          .title { font-size: 9px; font-weight: bold; margin: 2px 0; }
          .small { font-size: 7px; }
          .tiny { font-size: 6px; }
          .compact { margin: 1px 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Cabeçalho Compacto -->
        <div class="center">
          <div class="company-name">${company.name}</div>
          ${company.phone ? `<div class="tiny">${company.phone}</div>` : ''}
        </div>
        
        <div class="border-bottom"></div>
        
        <!-- Informações Compactas -->
        <div class="center">
          <div class="title">RECIBO</div>
          <div class="tiny">#${sale.id} ${new Date(sale.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
        
        ${customer ? `
        <div class="border-bottom"></div>
        <div class="center compact">
          <div class="small">${customer.name}</div>
        </div>
        ` : ''}
        
        <!-- Itens Compactos -->
        <div class="left-align">
          ${items.map(item => `
            <div class="item compact">
              <span class="small">${item.quantity}x ${item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}</span>
              <span>${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="border-top"></div>
        
        <!-- Totais Compactos -->
        <div>
          <div class="item total">
            <span>TOTAL:</span>
            <span>${sale.total.toFixed(2)} MT</span>
          </div>
        </div>
        
        <div class="border-top"></div>
        
        <!-- Pagamento Compacto -->
        <div class="center compact">
          <div class="small">${this.getPaymentMethodText(payment.method)}</div>
          ${payment.change ? `<div class="tiny">Troco: ${payment.change.toFixed(2)}</div>` : ''}
        </div>
        
        <div class="border-bottom"></div>
        
        <!-- Rodapé Mínimo -->
        <div class="center">
          <div class="tiny">Obrigado!</div>
          <div class="tiny">${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      
      <script class="no-print">
        window.onload = function() {
          setTimeout(() => {
            window.print();
            window.close();
          }, 300);
        };
      </script>
    </body>
    </html>
    `;
  }

  // 🔌 Gerar comandos ESC/POS (Formato Ultra-Compacto para Gainscha GA-E200)
  generateESCPOSCommands(saleData) {
    const { sale, items, company, customer, payment } = saleData;
    let commands = [];

    // Inicialização e reset completo da impressora
    commands.push(Buffer.from([0x1B, 0x40])); // ESC @ - Initialize printer
    
    // Reset de configurações de papel
    commands.push(Buffer.from([0x1B, 0x4D, 0x00])); // ESC M 0 - Fonte A (padrão)
    
    // Definir codificação de caracteres para suporte português
    commands.push(Buffer.from([0x1B, 0x74, 0x02])); // ESC t 2 - PC860 (Português)
    
    // Desabilitar modo de página (evitar avanço excessivo)
    commands.push(Buffer.from([0x1B, 0x50, 0x00])); // ESC P 0 - Desabilitar modo página
    
    // Definir área de impressão (limitar a 58mm)
    commands.push(Buffer.from([0x1D, 0x28, 0x43])); // GS (C - Definir área de impressão
    
    // Fonte pequena
    commands.push(Buffer.from([0x1B, 0x21, 0x01])); // ESC ! 1 - Small font

    // Centralizar
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 - Center align

    // Cabeçalho Ultra-Compacto
    commands.push(Buffer.from([0x1B, 0x45, 0x01])); // ESC E 1 - Bold on
    commands.push(Buffer.from(company.name + '\n'));
    commands.push(Buffer.from([0x1B, 0x45, 0x00])); // ESC E 0 - Bold off
    
    if (company.phone) {
      commands.push(Buffer.from([0x1B, 0x21, 0x00])); // ESC ! 0 - Tiny font
      commands.push(Buffer.from(company.phone + '\n'));
      commands.push(Buffer.from([0x1B, 0x21, 0x01])); // ESC ! 1 - Small font
    }

    // Linha separadora muito curta
    commands.push(Buffer.from('------------------\n'));

    // Título Ultra-Compacto
    commands.push(Buffer.from([0x1B, 0x45, 0x01])); // ESC E 1 - Bold on
    commands.push(Buffer.from('RECIBO\n'));
    commands.push(Buffer.from([0x1B, 0x45, 0x00])); // ESC E 0 - Bold off
    
    commands.push(Buffer.from(`#${sale.id} ${new Date(sale.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}\n`));

    // Cliente compacto
    if (customer) {
      commands.push(Buffer.from('------------------\n'));
      commands.push(Buffer.from([0x1B, 0x21, 0x00])); // ESC ! 0 - Tiny font
      commands.push(Buffer.from(customer.name + '\n'));
      commands.push(Buffer.from([0x1B, 0x21, 0x01])); // ESC ! 1 - Small font
    }

    // Alinhar à esquerda
    commands.push(Buffer.from([0x1B, 0x61, 0x00])); // ESC a 0 - Left align

    // Itens ultra-compactos (máximo 28 caracteres por linha)
    items.forEach(item => {
      const itemName = item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name;
      const itemLine = `${item.quantity}x ${itemName}`;
      const priceLine = `${item.total.toFixed(2)} MT`;
      
      // Ajustar para 28 caracteres totais
      const availableSpace = 28 - itemLine.length;
      const paddedPrice = priceLine.padStart(availableSpace);
      
      commands.push(Buffer.from(itemLine + paddedPrice + '\n'));
    });

    // Linha separadora
    commands.push(Buffer.from('------------------\n'));

    // Total ultra-compacto
    commands.push(Buffer.from([0x1B, 0x45, 0x01])); // ESC E 1 - Bold on
    commands.push(Buffer.from(`TOTAL: ${sale.total.toFixed(2)} MT\n`));
    commands.push(Buffer.from([0x1B, 0x45, 0x00])); // ESC E 0 - Bold off

    // Linha separadora
    commands.push(Buffer.from('------------------\n'));

    // Pagamento ultra-compacto
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 - Center align
    commands.push(Buffer.from([0x1B, 0x21, 0x00])); // ESC ! 0 - Tiny font
    commands.push(Buffer.from(this.getPaymentMethodText(payment.method) + '\n'));
    if (payment.change) {
      commands.push(Buffer.from(`Troco: ${payment.change.toFixed(2)}\n`));
    }

    // Linha separadora final
    commands.push(Buffer.from('------------------\n'));

    // Rodapé mínimo
    commands.push(Buffer.from('Obrigado!\n'));
    commands.push(Buffer.from(new Date().toLocaleDateString('pt-BR') + '\n'));

    // FORÇAR PARADA DE AVANÇO DE PAPEL
    commands.push(Buffer.from([0x1B, 0x4A, 0x00])); // ESC J 0 - Sem avanço de linha
    commands.push(Buffer.from([0x1B, 0x64, 0x00])); // ESC d 0 - Sem avanço de linha
    
    // Limpar buffer e resetar
    commands.push(Buffer.from([0x1B, 0x40])); // ESC @ - Reset da impressora
    
    // Corte parcial (em vez de corte total)
    commands.push(Buffer.from([0x1D, 0x56, 0x01])); // GS V 1 - Partial cut (usa menos papel)

    return commands;
  }

  // 🍳 Gerar comandos ESC/POS para Ticket de Cozinha (Ultra-Compacto)
  generateKitchenTicketCommands(orderData) {
    const { order, items, company } = orderData;
    let commands = [];

    // Inicialização
    commands.push(Buffer.from([0x1B, 0x40])); // ESC @ - Initialize printer
    commands.push(Buffer.from([0x1B, 0x74, 0x02])); // PC860 (Português)
    commands.push(Buffer.from([0x1B, 0x21, 0x01])); // Small font
    
    // Centralizar
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // Center align
    
    // Título COZINHA (Negrito e Grande se possível)
    commands.push(Buffer.from([0x1B, 0x45, 0x01])); // Bold on
    commands.push(Buffer.from('*** PEDIDO COZINHA ***\n'));
    
    // Mesa e Assento
    commands.push(Buffer.from(`MESA: ${order.table_number} | CLIENTE: ${order.seat_number}\n`));
    commands.push(Buffer.from([0x1B, 0x45, 0x00])); // Bold off
    
    // Hora do pedido
    commands.push(Buffer.from(`${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}\n`));
    
    commands.push(Buffer.from('------------------\n'));
    
    // Alinhar à esquerda
    commands.push(Buffer.from([0x1B, 0x61, 0x00])); // Left align
    
    // Itens (Sem preços, apenas quantidades e nomes)
    items.forEach(item => {
      const itemName = item.name || item.product_name || `Item #${item.product_id}`;
      // Em ticket de cozinha, a quantidade deve ser bem visível
      commands.push(Buffer.from([0x1B, 0x45, 0x01])); // Bold on
      commands.push(Buffer.from(`${item.quantity || item.qty}x `));
      commands.push(Buffer.from([0x1B, 0x45, 0x00])); // Bold off
      commands.push(Buffer.from(`${itemName}\n`));
      
      if (item.notes) {
        commands.push(Buffer.from(`  OBS: ${item.notes}\n`));
      }
    });
    
    commands.push(Buffer.from('------------------\n'));
    
    // Rodapé
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // Center align
    commands.push(Buffer.from('Bom trabalho!\n'));
    
    // Reset e Corte
    commands.push(Buffer.from([0x1B, 0x40])); // Reset
    commands.push(Buffer.from([0x1D, 0x56, 0x01])); // Partial cut
    
    return commands;
  }

  // 🍳 Gerar HTML para Ticket de Cozinha
  generateKitchenTicketHTML(orderData) {
    const { order, items } = orderData;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @media print {
          @page { size: 58mm 297mm; margin: 2mm; }
          body { font-family: 'Courier New', monospace; font-size: 10px; width: 54mm; line-height: 1.2; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border { border-top: 1px dashed #000; margin: 4px 0; }
          .item { font-size: 12px; margin: 4px 0; }
          .kitchen-title { font-size: 14px; font-weight: bold; border: 2px solid #000; padding: 2px; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="kitchen-title">COZINHA</div>
        <div class="bold" style="font-size: 16px; margin: 5px 0;">
          MESA: ${order.table_number}<br>
          CLIENTE: ${order.seat_number}
        </div>
        <div>${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
      
      <div class="border"></div>
      
      ${items.map(item => `
        <div class="item">
          <span class="bold">${item.quantity || item.qty}x</span> 
          ${item.name || item.product_name || `Item #${item.product_id}`}
          ${item.notes ? `<br><small>OBS: ${item.notes}</small>` : ''}
        </div>
      `).join('')}
      
      <div class="border"></div>
      
      <div class="center bold">BOM TRABALHO!</div>
      
      <script>
        window.onload = function() {
          setTimeout(() => { window.print(); window.close(); }, 300);
        };
      </script>
    </body>
    </html>
    `;
  }

  // 🍳 Imprimir Ticket de Cozinha
  async printKitchenTicket(orderData) {
    try {
      await this.resetPrinter();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Tentar Web API primeiro (HTML)
      if (this.printerType === 'web' || !this.isConnected) {
        const html = this.generateKitchenTicketHTML(orderData);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        return { success: true, message: 'Ticket de cozinha enviado!' };
      }
      
      // Caso contrário, ESC/POS
      const commands = this.generateKitchenTicketCommands(orderData);
      if (this.printerType === 'bluetooth' && this.characteristic) {
        for (const command of commands) { await this.characteristic.writeValue(command); }
      } else if (this.printerType === 'usb' && this.device) {
        for (const command of commands) { await this.device.transferOut(1, command); }
      }
      
      return { success: true, message: 'Ticket de cozinha impresso!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  // 🖨️ Método principal de impressão (Ultra-Compacto para Gainscha GA-E200)
  async printReceipt(saleData) {
    try {
      // PRIMEIRO: Reset forçado para limpar configurações
      console.log('Resetando impressora para evitar papel longo...');
      await this.resetPrinter();
      
      // Pequena pausa para o reset completar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Tentar métodos em ordem de preferência para Gainscha GA-E200
      const methods = [
        { name: 'web', fn: () => this.printWithWebAPI(saleData) },
        { name: 'usb', fn: () => this.printViaUSB(saleData) },
        { name: 'bluetooth', fn: () => this.printWithESCPOS(saleData) },
        { name: 'escpos', fn: () => this.printWithESCPOS(saleData) }
      ];

      for (const method of methods) {
        try {
          console.log(`Tentando impressão via ${method.name} para Gainscha GA-E200...`);
          const result = await method.fn();
          if (result.success) {
            return { 
              success: true, 
              message: result.message,
              method: method.name,
              printer: this.printerModel
            };
          }
        } catch (error) {
          console.log(`Método ${method.name} falhou para Gainscha GA-E200:`, error.message);
          continue;
        }
      }

      throw new Error('Nenhum método de impressão disponível para Gainscha GA-E200');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ⚙️ Configurar impressora Gainscha GA-E200
  async configurePrinter(config) {
    this.paperWidth = config.paperWidth || 58; // 58mm padrão compacto
    this.printerModel = config.model || 'gainscha-ga-e200';
    
    if (config.type === 'gainscha-usb' && !this.isConnected) {
      return await this.connectGainschaPrinter();
    } else if (config.type === 'gainscha-bluetooth' && !this.isConnected) {
      return await this.connectBluetoothPrinter();
    }
    
    return { 
      success: true, 
      message: `Impressora ${this.printerModel} configurada (${this.paperWidth}mm)!` 
    };
  }

  // 📋 Obter informações da impressora
  getPrinterInfo() {
    return {
      model: this.printerModel,
      type: this.printerType,
      connected: this.isConnected,
      paperWidth: this.paperWidth
    };
  }
}

// Exportar instância global
export const thermalPrinter = new ThermalPrinter();
export default ThermalPrinter;
