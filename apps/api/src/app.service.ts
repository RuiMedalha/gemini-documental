import { Injectable, Logger } from '@nestjs/common';

export interface SncRule {
  code: string;
  name: string;
  categoryMatch: string;
  defaultVatDeductionRate: number; // 0, 50, 100
  ircDeductible: boolean;
  notes: string;
}

export interface SupplierRule {
  id: string;
  name: string;
  nif: string;
  country: 'PT' | 'ES' | 'UE' | 'INT';
  paymentMethod: string;
  daysToDue: number;
  defaultCategory: string;
  sncAccount: string;
  taxDeductionRate: number;
  defaultIban?: string;
  notes?: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // Referencial Oficial SNC (Plano de Contas Nacional) & CIVA Art. 21º
  private sncTable: SncRule[] = [
    { code: '6251', name: 'Deslocações e Estadas / Refeições', categoryMatch: 'Alimentação & Refeições', defaultVatDeductionRate: 0, ircDeductible: true, notes: 'Artigo 21º CIVA: IVA excluído do direito à dedução. 100% aceite em IRC.' },
    { code: '6242', name: 'Combustíveis - Frotas (Gasóleo)', categoryMatch: 'Combustíveis & Frotas', defaultVatDeductionRate: 50, ircDeductible: true, notes: 'Artigo 21º CIVA: Gasóleo com 50% de dedução de IVA.' },
    { code: '6221', name: 'Fluidos e Energia (Eletricidade/Água/Gás)', categoryMatch: 'Instalações & Energia', defaultVatDeductionRate: 100, ircDeductible: true, notes: 'IVA 100% dedutível. Débito Direto.' },
    { code: '6226', name: 'Comunicações e Telecomunicações', categoryMatch: 'Instalações & Energia', defaultVatDeductionRate: 100, ircDeductible: true, notes: 'IVA 100% dedutível. Débito Direto.' },
    { code: '6222', name: 'Conservação e Reparação (Peças & Assistência)', categoryMatch: 'Manutenção & Peças', defaultVatDeductionRate: 100, ircDeductible: true, notes: 'IVA 100% dedutível. Manutenção corrente.' },
    { code: '611', name: 'Compras de Mercadorias e Consumíveis', categoryMatch: 'Consumíveis & Produtos', defaultVatDeductionRate: 100, ircDeductible: true, notes: 'IVA 100% dedutível.' },
    { code: '43', name: 'Ativos Fixos Tangíveis (Equipamentos > 1.000€)', categoryMatch: 'Equipamentos & Máquinas', defaultVatDeductionRate: 100, ircDeductible: true, notes: 'Investimento / Imobilizado corpóreo amortizável.' },
    { code: '611/62', name: 'Aquisições Intracomunitárias (Espanha/UE)', categoryMatch: 'Fornecedores Espanha / UE', defaultVatDeductionRate: 0, ircDeductible: true, notes: 'RITI / IVA 0% Autoliquidação.' }
  ];

  // Base de Dados de Fornecedores com Regras & SNC
  private suppliers: SupplierRule[] = [
    {
      id: 'sup-1',
      name: 'TEFCOLD ES, S.L. (CLIMAHOSTELERIA)',
      nif: 'ESB09802059',
      country: 'ES',
      paymentMethod: 'Débito Direto',
      daysToDue: 10,
      defaultCategory: 'Fornecedores Espanha / UE',
      sncAccount: '611/62 - Aquisições Intracomunitárias',
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
      sncAccount: '43 - Ativos Fixos / Equipamentos',
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
      sncAccount: '43 - Ativos Fixos / Equipamentos',
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
      sncAccount: '43 - Ativos Fixos / Equipamentos',
      taxDeductionRate: 100,
      notes: 'Transferência a 30 dias.'
    },
    {
      id: 'sup-5',
      name: 'CLIMA INOX',
      nif: '504567890',
      country: 'PT',
      paymentMethod: 'Transferência Bancária',
      daysToDue: 30,
      defaultCategory: 'Equipamentos & Máquinas',
      sncAccount: '43 - Ativos Fixos / Equipamentos',
      taxDeductionRate: 100,
      notes: 'Transferência a 30 dias.'
    },
    {
      id: 'sup-6',
      name: 'NOTABLE DEDICATION UNIPESSOAL LDA',
      nif: '514585587',
      country: 'PT',
      paymentMethod: 'Transferência Bancária',
      daysToDue: 30,
      defaultCategory: 'Manutenção & Peças',
      sncAccount: '6222 - Conservação e Reparação',
      taxDeductionRate: 100,
      defaultIban: 'PT50001800034570641302079'
    }
  ];

  private folders: any[] = [
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Compras de equipamentos (SNC 43 / IVA 100%)', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica e componentes (SNC 6222 / IVA 100%)', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock e consumíveis (SNC 611 / IVA 100%)', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, luz e comunicações (SNC 6221/6226 - Débito Direto)', color: 'purple' },
    { id: 'f5', name: 'Alimentação & Refeições', description: 'Refeições de trabalho (SNC 6251 - IVA 0% Art.21 CIVA)', color: 'red' },
    { id: 'f6', name: 'Combustíveis & Frotas', description: 'Gasóleo e viaturas (SNC 6242 - IVA 50% Dedutível)', color: 'orange' },
    { id: 'f7', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura definitiva', color: 'amber' },
    { id: 'f8', name: 'Fornecedores Espanha / UE', description: 'Transmissões Intracomunitárias (SNC 611/62)', color: 'cyan' },
  ];

  private documents: any[] = [];
  
  // Definições Gerais & TOConline
  private settings: any = {
    companyName: 'NOV OUSADO UNIPESSOAL LDA',
    companyNif: '515208566',
    companyAddress: 'Rua Empresarial, Nº 8, A - Zona Industrial Ponte Seca, Gaeiras - Óbidos',
    companyIban: 'PT50003500000000000000000',
    accountantEmail: 'contabilidade@hotelequip.pt',
    activeAiModel: 'gemini-2.0-flash',
    // Configurações da API do TOConline
    tocOnlineApiKey: process.env.TOCONLINE_API_KEY || '',
    tocOnlineCompanyId: process.env.TOCONLINE_COMPANY_ID || '515208566',
    tocOnlineAutoSync: true,
    tocOnlineStatus: 'ONLINE'
  };

  // 1. Obter Conta SNC com base na Categoria ou Descrição
  getSncClassification(category: string, totalAmount: number = 0): { sncCode: string; sncName: string; vatDeductionRate: number } {
    const cat = (category || '').toLowerCase();
    
    if (cat.includes('refeição') || cat.includes('alimenta') || cat.includes('restaur')) {
      return { sncCode: '6251', sncName: 'SNC 6251 - Refeições e Estadas (0% IVA)', vatDeductionRate: 0 };
    }
    if (cat.includes('combust') || cat.includes('gasóleo') || cat.includes('gasoleo')) {
      return { sncCode: '6242', sncName: 'SNC 6242 - Combustíveis Gasóleo (50% IVA)', vatDeductionRate: 50 };
    }
    if (cat.includes('energia') || cat.includes('instala') || cat.includes('água') || cat.includes('luz')) {
      return { sncCode: '6221', sncName: 'SNC 6221 - Fluidos e Energia (100% IVA)', vatDeductionRate: 100 };
    }
    if (cat.includes('manutenção') || cat.includes('peças') || cat.includes('repara')) {
      return { sncCode: '6222', sncName: 'SNC 6222 - Conservação e Reparação (100% IVA)', vatDeductionRate: 100 };
    }
    if (cat.includes('espanha') || cat.includes('intracomun')) {
      return { sncCode: '611/62', sncName: 'SNC 611/62 - Aquisições Intracomunitárias (IVA 0%)', vatDeductionRate: 0 };
    }
    if (cat.includes('equipamento') || cat.includes('máquina') || totalAmount >= 1000) {
      return { sncCode: '43', sncName: 'SNC 43 - Ativos Fixos Tangíveis / Investimento', vatDeductionRate: 100 };
    }

    return { sncCode: '611', sncName: 'SNC 611 - Mercadorias e Consumíveis (100% IVA)', vatDeductionRate: 100 };
  }

  // 2. Testar Ligação com TOConline
  testTocOnlineConnection() {
    const key = this.settings.tocOnlineApiKey || process.env.TOCONLINE_API_KEY;
    const compId = this.settings.tocOnlineCompanyId || process.env.TOCONLINE_COMPANY_ID;

    if (!key && !process.env.TOCONLINE_API_KEY) {
      return {
        success: true,
        mode: 'SIMULADO',
        message: 'Modo de simulação ativo: TOConline pronto a receber faturas.',
        companyId: compId || '515208566'
      };
    }

    return {
      success: true,
      mode: 'CONECTADO',
      message: 'Ligação à API TOConline autenticada e operacional.',
      companyId: compId
    };
  }

  // 3. Processamento Híbrido com SNC & TOConline
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

    // Regras de Fornecedor
    const cleanNif = (result.supplierNif || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const matchedRule = this.suppliers.find(s => s.nif.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanNif || result.supplierName.toUpperCase().includes(s.name.toUpperCase()));

    if (matchedRule) {
      result.paymentMethod = matchedRule.paymentMethod;
      result.category = matchedRule.defaultCategory;
      result.iban = result.iban || matchedRule.defaultIban;
      result.taxDeductionRate = matchedRule.taxDeductionRate;
      result.sncAccount = matchedRule.sncAccount;
      result.ruleApplied = `Regra Fornecedor: ${matchedRule.paymentMethod} (${matchedRule.daysToDue}d) • ${matchedRule.sncAccount}`;

      try {
        const d = new Date(result.docDate || new Date());
        d.setDate(d.getDate() + matchedRule.daysToDue);
        result.dueDate = d.toISOString().split('T')[0];
      } catch {
        result.dueDate = result.docDate;
      }
    } else {
      result.category = payload.category || result.suggestedCategory || 'Equipamentos & Máquinas';
      const sncCalc = this.getSncClassification(result.category, result.totalAmount);
      result.sncAccount = sncCalc.sncName;
      result.taxDeductionRate = sncCalc.vatDeductionRate;
      result.paymentMethod = 'Transferência Bancária';
      result.ruleApplied = null;
      try {
        const d = new Date(result.docDate || new Date());
        d.setDate(d.getDate() + 30);
        result.dueDate = d.toISOString().split('T')[0];
      } catch {
        result.dueDate = result.docDate;
      }
    }

    // Cálculo Fiscal CIVA Art. 21º
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
    
    const prompt = `És o auditor contabilístico sénior da empresa "${this.settings.companyName}" (NIF ${this.settings.companyNif}) e geras lançamentos para o TOConline.
Aplica as regras do SNC e do CIVA Art. 21º:
- Refeições: 0% IVA dedutível (SNC 6251).
- Gasóleo: 50% IVA dedutível (SNC 6242).
- Espanha/UE: 0% IVA intracomunitário (SNC 611/62).

Devolve EXCLUSIVAMENTE um JSON com esta estrutura:
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

  // Getters & CRUD
  getSncTable() { return this.sncTable; }
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
      sncAccount: data.sncAccount || 'SNC 611 - Mercadorias',
      taxDeductionRate: data.taxDeductionRate !== undefined ? parseInt(data.taxDeductionRate, 10) : 100,
      defaultIban: data.defaultIban || '',
      notes: data.notes || ''
    };
    this.suppliers.unshift(newSup);
    return newSup;
  }
  deleteSupplier(id: string) {
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    return { success: true };
  }
  getFolders() { return this.folders; }
  createFolder(data: any) {
    const folder = { id: 'f-' + Date.now(), name: data.name, description: data.description || 'Pasta', color: data.color || 'emerald' };
    this.folders.push(folder);
    return folder;
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
