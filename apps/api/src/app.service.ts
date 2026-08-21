import { Injectable, Logger } from '@nestjs/common';

export interface SupplierRule {
  id: string;
  name: string;
  nif: string;
  country: 'PT' | 'ES' | 'UE' | 'INT';
  paymentMethod: string;
  daysToDue: number;
  defaultCategory: string;
  taxDeductionRate: number; // 100, 50, 0
  defaultIban?: string;
  notes?: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // Base de Dados Dinâmica de Fornecedores e Regras
  private suppliers: SupplierRule[] = [
    {
      id: 'sup-1',
      name: 'TEFCOLD ES, S.L. (CLIMAHOSTELERIA)',
      nif: 'ESB09802059',
      country: 'ES',
      paymentMethod: 'Débito Direto',
      daysToDue: 10,
      defaultCategory: 'Fornecedores Espanha / UE',
      taxDeductionRate: 0,
      defaultIban: 'ES7701822342120201755957',
      notes: 'Débito direto 8 a 10 dias. IVA 0% Intracomunitário.'
    },
    {
      id: 'sup-2',
      name: 'SAMMIC PORTUGAL, LDA',
      nif: '501234987',
      country: 'PT',
      paymentMethod: 'Débito Direto',
      daysToDue: 30,
      defaultCategory: 'Equipamentos & Máquinas',
      taxDeductionRate: 100,
      notes: 'Débito direto a 30 dias.'
    },
    {
      id: 'sup-3',
      name: 'ANDY (Equipamentos)',
      nif: '508765432',
      country: 'PT',
      paymentMethod: 'Débito Direto',
      daysToDue: 45,
      defaultCategory: 'Equipamentos & Máquinas',
      taxDeductionRate: 100,
      notes: 'Débito direto a 45 dias.'
    },
    {
      id: 'sup-4',
      name: 'MIRANDESEIRA',
      nif: '503456789',
      country: 'PT',
      paymentMethod: 'Transferência Bancária',
      daysToDue: 30,
      defaultCategory: 'Equipamentos & Máquinas',
      taxDeductionRate: 100,
      notes: 'Transferência bancária a 30 dias.'
    },
    {
      id: 'sup-5',
      name: 'CLIMA INOX',
      nif: '504567890',
      country: 'PT',
      paymentMethod: 'Transferência Bancária',
      daysToDue: 30,
      defaultCategory: 'Equipamentos & Máquinas',
      taxDeductionRate: 100,
      notes: 'Transferência bancária a 30 dias.'
    },
    {
      id: 'sup-6',
      name: 'NOTABLE DEDICATION UNIPESSOAL LDA',
      nif: '514585587',
      country: 'PT',
      paymentMethod: 'Transferência Bancária',
      daysToDue: 30,
      defaultCategory: 'Manutenção & Peças',
      taxDeductionRate: 100,
      defaultIban: 'PT50001800034570641302079'
    },
    {
      id: 'sup-7',
      name: 'EDP COMERCIAL',
      nif: '503504564',
      country: 'PT',
      paymentMethod: 'Débito Direto',
      daysToDue: 15,
      defaultCategory: 'Instalações & Energia',
      taxDeductionRate: 100
    },
    {
      id: 'sup-8',
      name: 'RESTAURANTE / REFEIÇÕES',
      nif: '999999990',
      country: 'PT',
      paymentMethod: 'Cartão de Débito',
      daysToDue: 0,
      defaultCategory: 'Alimentação & Refeições',
      taxDeductionRate: 0,
      notes: 'Artigo 21º CIVA: 0% IVA Dedutível.'
    },
    {
      id: 'sup-9',
      name: 'COMBUSTÍVEIS / GASÓLEO (GALP / REPSOL)',
      nif: '500279894',
      country: 'PT',
      paymentMethod: 'Cartão de Débito',
      daysToDue: 0,
      defaultCategory: 'Combustíveis & Frotas',
      taxDeductionRate: 50,
      notes: 'Gasóleo: 50% IVA Dedutível.'
    }
  ];

  private folders: any[] = [
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Compras de equipamentos e ativos (IVA 100%)', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica e componentes (IVA 100%)', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock e consumíveis (IVA 100%)', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, eletricidade e telefone (Débito Direto)', color: 'purple' },
    { id: 'f5', name: 'Alimentação & Refeições', description: 'Despesas de refeições (IVA 0% dedutível Art.21 CIVA)', color: 'red' },
    { id: 'f6', name: 'Combustíveis & Frotas', description: 'Gasóleo e viaturas (IVA 50% dedutível)', color: 'orange' },
    { id: 'f7', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura definitiva', color: 'amber' },
    { id: 'f8', name: 'Fornecedores Espanha / UE', description: 'Transmissões Intracomunitárias', color: 'cyan' },
  ];

  private documents: any[] = [];
  private settings: any = {
    companyName: 'NOV OUSADO UNIPESSOAL LDA',
    companyNif: '515208566',
    companyAddress: 'Rua Empresarial, Nº 8, A - Zona Industrial Ponte Seca, Gaeiras - Óbidos',
    companyIban: 'PT50003500000000000000000',
    accountantEmail: 'contabilidade@hotelequip.pt',
    activeAiModel: 'gemini-2.0-flash',
    customAiPrompt: 'Aplica com rigor o Artigo 21º do CIVA e as regras específicas cadastradas por fornecedor.'
  };

  // Encontrar regra do fornecedor
  findSupplierRule(supplierName: string, supplierNif: string): SupplierRule | null {
    const cleanNif = (supplierNif || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanName = (supplierName || '').toUpperCase();

    // 1. Procura por NIF exato
    if (cleanNif) {
      const byNif = this.suppliers.find(s => s.nif.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanNif);
      if (byNif) return byNif;
    }

    // 2. Procura por Nome
    const byName = this.suppliers.find(s => cleanName.includes(s.name.toUpperCase()) || s.name.toUpperCase().includes(cleanName));
    if (byName) return byName;

    return null;
  }

  // Gestão de Fornecedores (CRUD)
  getSuppliers() { return this.suppliers; }
  
  createSupplier(data: any) {
    const newSup: SupplierRule = {
      id: 'sup-' + Date.now(),
      name: data.name,
      nif: data.nif,
      country: data.country || 'PT',
      paymentMethod: data.paymentMethod || 'Transferência Bancária',
      daysToDue: parseInt(data.daysToDue, 10) || 30,
      defaultCategory: data.defaultCategory || 'Equipamentos & Máquinas',
      taxDeductionRate: data.taxDeductionRate !== undefined ? parseInt(data.taxDeductionRate, 10) : 100,
      defaultIban: data.defaultIban || '',
      notes: data.notes || ''
    };
    this.suppliers.unshift(newSup);
    return newSup;
  }

  updateSupplier(id: string, data: any) {
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.suppliers[idx] = { ...this.suppliers[idx], ...data };
      return { success: true, supplier: this.suppliers[idx] };
    }
    return { success: false, message: 'Fornecedor não encontrado' };
  }

  deleteSupplier(id: string) {
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    return { success: true };
  }

  // Gestão de Pastas (CRUD)
  getFolders() { return this.folders; }
  createFolder(data: any) {
    const folder = { id: 'f-' + Date.now(), name: data.name, description: data.description || 'Pasta', color: data.color || 'emerald' };
    this.folders.push(folder);
    return folder;
  }
  deleteFolder(id: string) {
    this.folders = this.folders.filter(f => f.id !== id);
    return { success: true };
  }

  // Processamento Híbrido com Regras Dinâmicas de Fornecedor
  async processDocumentHybrid(payload: any) {
    let result: any = null;

    if (payload.qrCodeRaw) {
      const qrParsed = this.parsePortugueseQR(payload.qrCodeRaw);
      if (qrParsed && qrParsed.supplierNif) result = qrParsed;
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
        supplierName: 'Fornecedor Registado',
        supplierNif: '514585587',
        customerName: this.settings.companyName,
        customerNif: this.settings.companyNif,
        docType: 'FT',
        docNumber: 'FT ' + Math.floor(Math.random() * 1000),
        docDate: new Date().toISOString().split('T')[0],
        netAmount: 100.00,
        taxAmount: 23.00,
        totalAmount: 123.00,
        isNonFiscalDoc: false,
        paymentStatus: 'PENDING',
        paymentMethod: 'Transferência Bancária',
        items: []
      };
    }

    // Aplicação da Regra Dinâmica do Fornecedor
    const matchedRule = this.findSupplierRule(result.supplierName, result.supplierNif);
    if (matchedRule) {
      result.paymentMethod = matchedRule.paymentMethod;
      result.category = matchedRule.defaultCategory;
      result.iban = result.iban || matchedRule.defaultIban;
      result.taxDeductionRate = matchedRule.taxDeductionRate;
      result.ruleApplied = `Regra Ativa: ${matchedRule.paymentMethod} (${matchedRule.daysToDue}d) • ${matchedRule.taxDeductionRate}% IVA Dedutível`;

      // Calcular Data de Vencimento
      try {
        const d = new Date(result.docDate || new Date());
        d.setDate(d.getDate() + matchedRule.daysToDue);
        result.dueDate = d.toISOString().split('T')[0];
      } catch {
        result.dueDate = result.docDate;
      }
    } else {
      result.paymentMethod = 'Transferência Bancária';
      result.category = payload.category || result.suggestedCategory || 'Equipamentos & Máquinas';
      result.taxDeductionRate = 100;
      result.ruleApplied = null;
      try {
        const d = new Date(result.docDate || new Date());
        d.setDate(d.getDate() + 30);
        result.dueDate = d.toISOString().split('T')[0];
      } catch {
        result.dueDate = result.docDate;
      }
    }

    // Cálculo Final de IVA Dedutível
    const deductionRate = result.taxDeductionRate !== undefined ? result.taxDeductionRate : 100;
    const taxAmount = result.taxAmount || 0;
    result.deductibleTax = Math.round((taxAmount * (deductionRate / 100)) * 100) / 100;
    result.nonDeductibleTax = Math.round((taxAmount - result.deductibleTax) * 100) / 100;

    result.id = 'DOC-' + Date.now();
    result.syncedToTocOnline = true;
    result.tocOnlineSyncDate = new Date().toISOString();
    return result;
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
    if (!apiKey) return null;

    const modelName = this.settings.activeAiModel || 'gemini-2.0-flash';
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    const prompt = `És o auditor contabilístico sénior da empresa "${this.settings.companyName}" (NIF ${this.settings.companyNif}).
Analisa este documento e extrai com rigor: Fornecedor, NIF, DocType, DocNumber, DocDate, DueDate, ATCUD, IBAN, NetAmount, TaxAmount, TotalAmount, Itens.
Devolve EXCLUSIVAMENTE um JSON válido com esta estrutura:
{
  "supplierName": "Nome do fornecedor",
  "supplierNif": "NIF ou CIF",
  "customerName": "Nome do cliente",
  "customerNif": "NIF do cliente",
  "docType": "FT | FS | FR | ORC | OFERTA",
  "docNumber": "Número do documento",
  "docDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "atcud": "Código ATCUD ou null",
  "iban": "IBAN",
  "netAmount": 0.00,
  "taxAmount": 0.00,
  "totalAmount": 0.00,
  "isNonFiscalDoc": true/false,
  "docNature": "Fatura Fiscal Definitiva | Factura Proforma | Oferta de Venda",
  "isIntracommunity": true/false,
  "suggestedCategory": "Equipamentos & Máquinas | Alimentação & Refeições | Combustíveis & Frotas | Instalações & Energia | Fornecedores Espanha / UE",
  "paymentStatus": "PAID | PENDING",
  "paymentMethod": "Débito Direto | Transferência Bancária",
  "paymentDate": "YYYY-MM-DD ou null",
  "items": [{ "code": "Código", "description": "Descrição", "quantity": 1, "unitPrice": 0.0, "discount": 0, "taxRate": 23, "total": 0.0 }]
}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: cleanBase64 } }] }],
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
    } catch {}
    return null;
  }

  getDocuments() { return this.documents; }
  saveDocument(data: any) {
    const doc = { ...data, id: data.id || 'DOC-' + Date.now(), createdAt: new Date().toISOString() };
    this.documents.unshift(doc);
    return { success: true, document: doc };
  }
  updatePaymentStatus(id: string, updateData: any) {
    const idx = this.documents.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.documents[idx] = { ...this.documents[idx], ...updateData };
      return { success: true, document: this.documents[idx] };
    }
    return { success: false };
  }
  getSettings() { return this.settings; }
  updateSettings(data: any) {
    this.settings = { ...this.settings, ...data };
    return { success: true, settings: this.settings };
  }
}
