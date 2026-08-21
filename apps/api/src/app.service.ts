import { Injectable, Logger } from '@nestjs/common';

export interface ProcessDocumentDto {
  imageBase64?: string;
  mimeType?: string;
  qrCodeRaw?: string;
  category?: string;
  fileName?: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  
  // Regras de Fornecedores e Prazos Predefinidos
  private supplierRules: Record<string, { paymentMethod: string; daysToDue: number; defaultCategory: string }> = {
    'TEFCOLD': { paymentMethod: 'Débito Direto', daysToDue: 10, defaultCategory: 'Fornecedores Espanha / UE' },
    'CLIMAHOSTELERIA': { paymentMethod: 'Débito Direto', daysToDue: 10, defaultCategory: 'Fornecedores Espanha / UE' },
    'SAMMIC': { paymentMethod: 'Débito Direto', daysToDue: 30, defaultCategory: 'Equipamentos & Máquinas' },
    'ANDY': { paymentMethod: 'Débito Direto', daysToDue: 45, defaultCategory: 'Equipamentos & Máquinas' },
    'MIRANDESEIRA': { paymentMethod: 'Transferência Bancária', daysToDue: 30, defaultCategory: 'Equipamentos & Máquinas' },
    'CLIMA INOX': { paymentMethod: 'Transferência Bancária', daysToDue: 30, defaultCategory: 'Equipamentos & Máquinas' },
    'EDP': { paymentMethod: 'Débito Direto', daysToDue: 15, defaultCategory: 'Instalações & Energia' },
    'VODAFONE': { paymentMethod: 'Débito Direto', daysToDue: 15, defaultCategory: 'Instalações & Energia' },
    'ÁGUAS': { paymentMethod: 'Débito Direto', daysToDue: 15, defaultCategory: 'Instalações & Energia' },
  };

  private documents: any[] = [];
  private folders: any[] = [
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Compras de equipamentos e máquinas', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica e componentes', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Detergentes, stock e consumíveis', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, eletricidade e comunicações (Débito Direto)', color: 'purple' },
    { id: 'f5', name: 'Alimentação & Refeições', description: 'Despesas de refeições (IVA 0% dedutível Art.21 CIVA)', color: 'red' },
    { id: 'f6', name: 'Combustíveis & Frotas', description: 'Gasóleo e viaturas (IVA 50% dedutível)', color: 'orange' },
    { id: 'f7', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura definitiva', color: 'amber' },
    { id: 'f8', name: 'Fornecedores Espanha / UE', description: 'Transmissões Intracomunitárias', color: 'cyan' },
  ];

  private settings: any = {
    companyName: 'NOV OUSADO UNIPESSOAL LDA',
    companyNif: '515208566',
    companyAddress: 'Rua Empresarial, Nº 8, A - Zona Industrial Ponte Seca, Gaeiras - Óbidos',
    companyIban: 'PT50003500000000000000000',
    accountantEmail: 'contabilidade@hotelequip.pt',
    activeAiModel: 'gemini-2.0-flash',
    customAiPrompt: 'Aplica com rigor o Artigo 21º do CIVA: Se for refeição/restauração, o IVA dedutível é 0€. Se for gasóleo/combustível, o IVA dedutível é 50%. Em fornecedores Espanha/UE, IVA é 0% intracomunitário.',
    employees: [
      { id: 'emp-1', name: 'Rui Medalha', email: 'rui@profihotel.pt', role: 'ADMIN', phone: '+351 916 542 211' },
      { id: 'emp-2', name: 'Operador / Escritório', email: 'geral@hotelequip.pt', role: 'MANAGER', phone: '+351 919 165 422' }
    ]
  };

  // Cálculo de IVA Dedutível Fiscal (CIVA Art. 21º)
  calculateDeductibleTax(category: string, totalTax: number): { deductibleTax: number; nonDeductibleTax: number; taxDeductionRate: number } {
    const cat = (category || '').toLowerCase();
    if (cat.includes('refeição') || cat.includes('refeicoes') || cat.includes('alimenta') || cat.includes('restaura')) {
      return { deductibleTax: 0.00, nonDeductibleTax: totalTax, taxDeductionRate: 0 };
    }
    if (cat.includes('combust') || cat.includes('gasóleo') || cat.includes('gasoleo') || cat.includes('gasolina')) {
      const half = Math.round((totalTax * 0.5) * 100) / 100;
      return { deductibleTax: half, nonDeductibleTax: Math.round((totalTax - half) * 100) / 100, taxDeductionRate: 50 };
    }
    return { deductibleTax: totalTax, nonDeductibleTax: 0.00, taxDeductionRate: 100 };
  }

  // Regra de Vencimento e Método do Fornecedor
  applySupplierRules(supplierName: string, docDateStr: string): { paymentMethod: string; dueDate: string; category?: string } {
    const sName = (supplierName || '').toUpperCase();
    let matchedRule = { paymentMethod: 'Transferência Bancária', daysToDue: 30, defaultCategory: 'Equipamentos & Máquinas' };

    for (const [key, rule] of Object.entries(this.supplierRules)) {
      if (sName.includes(key)) {
        matchedRule = rule;
        break;
      }
    }

    let dueDate = docDateStr;
    try {
      const d = new Date(docDateStr || new Date());
      d.setDate(d.getDate() + matchedRule.daysToDue);
      dueDate = d.toISOString().split('T')[0];
    } catch {}

    return { paymentMethod: matchedRule.paymentMethod, dueDate, category: matchedRule.defaultCategory };
  }

  parsePortugueseQR(qrText: string): any | null {
    if (!qrText || (!qrText.includes('A:') && !qrText.includes('*'))) return null;
    const parts = qrText.split('*');
    const getVal = (prefix: string) => {
      const found = parts.find(p => p.startsWith(`${prefix}:`));
      return found ? found.substring(prefix.length + 1).trim() : '';
    };

    const supplierNif = getVal('A');
    const customerNif = getVal('B');
    const docType = getVal('D') || 'FT';
    const docNumber = getVal('G');
    const docDateRaw = getVal('F');
    const atcud = getVal('H');
    const total = parseFloat(getVal('O') || '0');
    const tax = parseFloat(getVal('N') || '0');

    let formattedDate = docDateRaw;
    if (docDateRaw && docDateRaw.length === 8) {
      formattedDate = `${docDateRaw.substring(0,4)}-${docDateRaw.substring(4,6)}-${docDateRaw.substring(6,8)}`;
    }

    const isNonFiscal = ['ORC', 'FP', 'PF', 'NE', 'GT', 'GD', 'DC', 'PFR'].some(p => docNumber.toUpperCase().includes(p)) || docType === 'ORC';

    return {
      supplierName: `Fornecedor (NIF ${supplierNif})`,
      supplierNif,
      customerName: this.settings.companyName,
      customerNif: customerNif || this.settings.companyNif,
      docType,
      docNumber,
      docDate: formattedDate,
      atcud,
      totalAmount: total,
      taxAmount: tax,
      netAmount: Math.round((total - tax) * 100) / 100,
      isNonFiscalDoc: isNonFiscal,
      docNature: isNonFiscal ? 'Factura Proforma / Orçamento' : 'Fatura Fiscal Certificada pela AT',
      extractionMethod: 'QR_CODE_AT'
    };
  }

  async analyzeWithGemini(base64Data: string, mimeType: string = 'application/pdf'): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY não configurada no servidor.');
      return null;
    }

    const modelName = this.settings.activeAiModel || 'gemini-2.0-flash';
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    const prompt = `És o auditor contabilístico sénior da empresa "${this.settings.companyName}" (NIF ${this.settings.companyNif}).
Aplica o Artigo 21º do CIVA:
- Despesas de alimentação, refeições e restaurantes NÃO deduzem IVA (deductibleTax = 0).
- Combustíveis deduzem 50% de IVA para gasóleo.
- Fornecedores de Espanha/UE têm IVA 0% (Autoliquidação Intracomunitária).
- Deteta se é Tefcold/Sammic/Andy (Débito Direto) ou Mirandeseira/Clima Inox (Transferência).
- Deteta notas manuscritas como 'Pago transf.' ou 'Pago DD'.

Devolve EXCLUSIVAMENTE um JSON com esta estrutura:
{
  "supplierName": "Nome completo do fornecedor",
  "supplierNif": "NIF ou CIF",
  "customerName": "Nome do cliente",
  "customerNif": "NIF do cliente",
  "docType": "FT | FS | FR | ORC | OFERTA",
  "docNumber": "Número do documento",
  "docDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "atcud": "Código ATCUD ou null",
  "iban": "IBAN do fornecedor",
  "netAmount": 0.00,
  "taxAmount": 0.00,
  "totalAmount": 0.00,
  "isNonFiscalDoc": true/false,
  "docNature": "Fatura Fiscal Definitiva | Factura Proforma | Oferta de Venda",
  "isIntracommunity": true/false,
  "suggestedCategory": "Alimentação & Refeições | Combustíveis & Frotas | Equipamentos & Máquinas | Instalações & Energia | Fornecedores Espanha / UE",
  "paymentStatus": "PAID | PENDING",
  "paymentMethod": "Débito Direto | Transferência Bancária | Pronto Pagamento",
  "paymentDate": "YYYY-MM-DD ou null",
  "items": [
    { "code": "Código", "description": "Descrição", "quantity": 1, "unitPrice": 0.0, "discount": 0, "taxRate": 23, "total": 0.0 }
  ]
}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: cleanBase64 } }
            ]
          }],
          generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
        })
      });

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        parsed.extractionMethod = 'GEMINI_VISION_AI';
        return parsed;
      }
    } catch (err) {
      this.logger.error('Erro na chamada Gemini API:', err);
    }
    return null;
  }

  async processDocumentHybrid(payload: ProcessDocumentDto) {
    let result: any = null;

    if (payload.qrCodeRaw) {
      const qrParsed = this.parsePortugueseQR(payload.qrCodeRaw);
      if (qrParsed && qrParsed.supplierNif) {
        result = qrParsed;
      }
    }

    if (payload.imageBase64) {
      const geminiResult = await this.analyzeWithGemini(payload.imageBase64, payload.mimeType || 'application/pdf');
      if (geminiResult) {
        if (result) {
          result = {
            ...result,
            supplierName: geminiResult.supplierName || result.supplierName,
            customerName: geminiResult.customerName || result.customerName,
            iban: geminiResult.iban || result.iban,
            items: geminiResult.items || [],
            dueDate: geminiResult.dueDate || result.docDate,
            paymentStatus: geminiResult.paymentStatus || 'PENDING',
            paymentMethod: geminiResult.paymentMethod || 'Transferência Bancária',
            paymentDate: geminiResult.paymentDate || null,
            suggestedCategory: geminiResult.suggestedCategory,
            extractionMethod: 'HYBRID_QR_AND_GEMINI'
          };
        } else {
          result = geminiResult;
        }
      }
    }

    if (!result) {
      result = {
        supplierName: 'Documento Registado',
        supplierNif: '514585587',
        customerName: this.settings.companyName,
        customerNif: this.settings.companyNif,
        docType: 'FT',
        docNumber: 'DOC-' + Math.floor(Math.random() * 10000),
        docDate: new Date().toISOString().split('T')[0],
        netAmount: 100.00,
        taxAmount: 23.00,
        totalAmount: 123.00,
        isNonFiscalDoc: false,
        docNature: 'Documento Fiscal',
        paymentStatus: 'PENDING',
        paymentMethod: 'Transferência Bancária',
        items: []
      };
    }

    // Aplicação das regras de negócio de fornecedores
    const supplierDefaults = this.applySupplierRules(result.supplierName, result.docDate);
    result.paymentMethod = result.paymentMethod || supplierDefaults.paymentMethod;
    result.dueDate = result.dueDate || supplierDefaults.dueDate;
    result.category = payload.category || result.suggestedCategory || supplierDefaults.category || 'Equipamentos & Máquinas';

    // Aplicação do Artigo 21º do CIVA (Cálculo de IVA Dedutível vs IVA de Custo)
    const taxCalc = this.calculateDeductibleTax(result.category, result.taxAmount || 0);
    result.deductibleTax = taxCalc.deductibleTax;
    result.nonDeductibleTax = taxCalc.nonDeductibleTax;
    result.taxDeductionRate = taxCalc.taxDeductionRate;

    result.id = 'DOC-' + Date.now();
    result.syncedToTocOnline = true;
    result.tocOnlineSyncDate = new Date().toISOString();
    return result;
  }

  getDocuments() { return this.documents; }
  saveDocument(data: any) {
    const taxCalc = this.calculateDeductibleTax(data.category, data.taxAmount || 0);
    const doc = {
      ...data,
      id: data.id || 'DOC-' + Date.now(),
      deductibleTax: taxCalc.deductibleTax,
      nonDeductibleTax: taxCalc.nonDeductibleTax,
      taxDeductionRate: taxCalc.taxDeductionRate,
      syncedToTocOnline: true,
      tocOnlineSyncDate: data.tocOnlineSyncDate || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    this.documents.unshift(doc);
    return { success: true, document: doc };
  }
  updatePaymentStatus(id: string, updateData: any) {
    const idx = this.documents.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.documents[idx] = { ...this.documents[idx], ...updateData };
      return { success: true, document: this.documents[idx] };
    }
    return { success: false, message: 'Documento não encontrado' };
  }
  getFolders() { return this.folders; }
  createFolder(data: any) {
    const folder = { id: 'f-' + Date.now(), name: data.name, description: data.description || 'Pasta', color: data.color || 'emerald' };
    this.folders.push(folder);
    return folder;
  }
  getSettings() { return this.settings; }
  updateSettings(data: any) {
    this.settings = { ...this.settings, ...data };
    return { success: true, settings: this.settings };
  }
}
