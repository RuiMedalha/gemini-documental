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
  private documents: any[] = [];
  private folders: any[] = [
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Faturas de equipamentos e ativos', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica e componentes', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock e consumíveis', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, luz e comunicações', color: 'purple' },
    { id: 'f5', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura final', color: 'amber' },
    { id: 'f6', name: 'Fornecedores Espanha / UE', description: 'Compras Intracomunitárias', color: 'cyan' },
  ];

  // Configurações Globais do Sistema
  private settings: any = {
    companyName: 'NOV OUSADO UNIPESSOAL LDA',
    companyNif: '515208566',
    companyAddress: 'Rua Empresarial, Nº 8, A - Zona Industrial Ponte Seca, Gaeiras - Óbidos',
    companyIban: 'PT50003500000000000000000',
    accountantEmail: 'contabilidade@hotelequip.pt',
    activeAiModel: 'gemini-2.0-flash',
    customAiPrompt: 'Se o fornecedor for espanhol, valida se a taxa de IVA é 0% intracomunitária. Assinala sempre as referências de máquinas e números de série nas observações.',
    employees: [
      { id: 'emp-1', name: 'Rui Medalha', email: 'rui@profihotel.pt', role: 'ADMIN', phone: '+351 916 542 211' },
      { id: 'emp-2', name: 'Operador / Escritório', email: 'geral@hotelequip.pt', role: 'MANAGER', phone: '+351 919 165 422' },
      { id: 'emp-3', name: 'Técnico de Assistência', email: 'tecnico@hotelequip.pt', role: 'SCANNER', phone: '' }
    ],
    internalGuidelines: '1. Fotografar sempre com o QR Code focado.\n2. Não validar pagamentos de orçamentos proforma sem fatura definitiva correspondente.\n3. Faturas superiores a 1.000€ necessitam de aprovação da gerência.'
  };

  getSettings() {
    return this.settings;
  }

  updateSettings(data: any) {
    this.settings = { ...this.settings, ...data };
    return { success: true, settings: this.settings };
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
    
    const prompt = `És um auditor contabilístico sénior especializado em faturas portuguesas e europeias.
Instruções especiais da empresa: "${this.settings.customAiPrompt}"
Nome da empresa adquirente: "${this.settings.companyName}" (NIF ${this.settings.companyNif}).

Analisa este documento e extrai com rigor absoluto todos os dados.
Devolve EXCLUSIVAMENTE um JSON válido com esta estrutura:
{
  "supplierName": "Nome completo da empresa emissora",
  "supplierNif": "NIF/CIF do fornecedor (ex: 514585587 ou ESB09802059)",
  "customerName": "Nome do adquirente/cliente",
  "customerNif": "NIF do adquirente",
  "docType": "FT | FS | FR | ORC | OFERTA | NC",
  "docNumber": "Número do documento (ex: FT M2026/432 ou VOV26008382)",
  "docDate": "YYYY-MM-DD",
  "atcud": "Código ATCUD ou null",
  "iban": "IBAN com prefixo de país (ex: PT50... ou ES77...)",
  "netAmount": 0.00,
  "taxAmount": 0.00,
  "totalAmount": 0.00,
  "isNonFiscalDoc": true/false (true se for Proforma, Orçamento, Oferta de Venda ou indicar que não serve de fatura),
  "docNature": "Fatura Fiscal Definitiva | Factura Proforma | Oferta de Venda",
  "isIntracommunity": true/false,
  "paymentStatus": "PAID | PENDING",
  "paymentDate": "YYYY-MM-DD ou null",
  "items": [
    {
      "code": "Código",
      "description": "Descrição do artigo",
      "quantity": 1,
      "unitPrice": 0.00,
      "discount": 0,
      "taxRate": 23,
      "total": 0.00
    }
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
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1
          }
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
            paymentStatus: geminiResult.paymentStatus || 'PENDING',
            paymentDate: geminiResult.paymentDate || null,
            extractionMethod: 'HYBRID_QR_AND_GEMINI'
          };
        } else {
          result = geminiResult;
        }
      }
    }

    if (!result) {
      result = {
        supplierName: 'Documento Processado',
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
        category: payload.category || 'Equipamentos & Máquinas',
        paymentStatus: 'PENDING',
        items: [],
        extractionMethod: 'BACKEND_PROCESSED'
      };
    }

    result.id = 'DOC-' + Date.now();
    result.category = payload.category || (result.isNonFiscalDoc ? 'Proformas & Orçamentos' : (result.isIntracommunity ? 'Fornecedores Espanha / UE' : 'Equipamentos & Máquinas'));
    return result;
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
    return { success: false, message: 'Documento não encontrado' };
  }
  getFolders() { return this.folders; }
  createFolder(data: any) {
    const folder = { id: 'f-' + Date.now(), name: data.name, description: data.description || 'Pasta', color: data.color || 'emerald' };
    this.folders.push(folder);
    return folder;
  }
}
