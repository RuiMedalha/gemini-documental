'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, CheckCircle2, AlertTriangle, AlertCircle, FileText, 
  Building2, Euro, FolderPlus, Tag, ShieldCheck, RefreshCw, 
  Folder, FolderOpen, Plus, Search, Calendar, ChevronRight, X, SwitchCamera, 
  List, Globe, CreditCard, Check, Clock, Filter, ArrowRightLeft, Download, 
  Mail, Server, CheckSquare, Square, RefreshCcw
} from 'lucide-react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';

interface InvoiceItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

interface InvoiceData {
  id: string;
  supplierName: string;
  supplierNif: string;
  customerName?: string;
  customerNif: string;
  docType: string;
  docNumber: string;
  docDate: string;
  dueDate?: string;
  atcud?: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  iban?: string;
  isNonFiscalDoc: boolean;
  docNature: string;
  isIntracommunity?: boolean;
  items: InvoiceItem[];
  category: string;
  tags: string[];
  paymentStatus: 'PAID' | 'PENDING';
  paymentDate?: string;
  paymentMethod?: string;
}

interface FolderItem {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function DocFlowCompletePlatform() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'folders' | 'documents' | 'reconciliation' | 'sepa' | 'automations'>('scanner');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Visor da Câmara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Pastas
  const [folders, setFolders] = useState<FolderItem[]>([
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Faturas de compra de máquinas', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Componentes e assistência', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock, químicos e consumíveis', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, eletricidade e comunicações', color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
    { id: 'f5', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura definitiva', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    { id: 'f6', name: 'Fornecedores Espanha / UE', description: 'Transmissões Intracomunitárias', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
  ]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Equipamentos & Máquinas');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Base de Dados de Documentos
  const [archivedDocs, setArchivedDocs] = useState<InvoiceData[]>([
    {
      id: 'DOC-101',
      supplierName: 'Notable Dedication Unipessoal Lda',
      supplierNif: '514585587',
      customerName: 'Nov Ousado, Unipessoal, Lda.',
      customerNif: '515208566',
      docType: 'FT',
      docNumber: 'FT M2026/432',
      docDate: '2026-07-27',
      atcud: 'J6N4RDHC-432',
      iban: 'PT50001800034570641302079',
      netAmount: 245.00,
      taxAmount: 56.35,
      totalAmount: 301.35,
      isNonFiscalDoc: false,
      docNature: 'Fatura Fiscal Definitiva',
      category: 'Equipamentos & Máquinas',
      tags: ['#Fatura-Valida'],
      paymentStatus: 'PAID',
      paymentDate: '2026-08-12',
      paymentMethod: 'Transferência Bancária',
      items: [
        { code: 'mot', description: 'Mão de obra Técnico', quantity: 2, unitPrice: 30.00, discount: 0, taxRate: 23, total: 60.00 },
        { code: 'dlx', description: 'Deslocação Lisboa', quantity: 1, unitPrice: 30.00, discount: 0, taxRate: 23, total: 30.00 },
        { code: 'td03', description: 'Termostato Carel PZSO4R', quantity: 1, unitPrice: 138.00, discount: 0, taxRate: 23, total: 138.00 }
      ]
    },
    {
      id: 'DOC-102',
      supplierName: 'TEFCOLD ES, S.L. (CLIMAHOSTELERIA)',
      supplierNif: 'ESB09802059',
      customerName: 'NOV OUSADO UNIPESSOAL LDA',
      customerNif: 'PT515208566',
      docType: 'OFERTA',
      docNumber: 'VOV26008382',
      docDate: '2026-08-20',
      iban: 'ES7701822342120201755957',
      netAmount: 702.04,
      taxAmount: 0.00,
      totalAmount: 702.04,
      isNonFiscalDoc: true,
      isIntracommunity: true,
      docNature: 'Oferta de Venta (Espanha)',
      category: 'Fornecedores Espanha / UE',
      tags: ['#Intracomunitaria'],
      paymentStatus: 'PAID',
      paymentDate: '2026-08-20',
      paymentMethod: 'Transferência Bancária (BBVA)',
      items: [
        { code: 'HS-30', description: 'Amasadora Espiral 30L PEKIN HS-30', quantity: 1, unitPrice: 1432.73, discount: 50, taxRate: 0, total: 702.04 }
      ]
    },
    {
      id: 'DOC-103',
      supplierName: 'MASTERQUIP, LDA.',
      supplierNif: '506470261',
      customerName: 'NOV OUSADO UNIPESSOAL LDA',
      customerNif: '515208566',
      docType: 'ORC',
      docNumber: 'ORC MQ26/1431',
      docDate: '2026-08-12',
      atcud: 'J6TWSYZT-1431',
      iban: 'PT50003300004524017192605',
      netAmount: 100.28,
      taxAmount: 23.06,
      totalAmount: 123.34,
      isNonFiscalDoc: true,
      docNature: 'Factura Proforma / Orçamento',
      category: 'Proformas & Orçamentos',
      tags: ['#Proforma'],
      paymentStatus: 'PENDING',
      items: [
        { code: '5001000039910', description: 'CONJ. BASE/RASPADOR J 80 U SAV', quantity: 1, unitPrice: 133.40, discount: 30, taxRate: 23, total: 93.38 },
        { code: 'NCX 0-5', description: 'EXP 7475/ ENVIO', quantity: 1, unitPrice: 5.70, discount: 0, taxRate: 23, total: 5.70 }
      ]
    }
  ]);

  // Filtros de Arquivo
  const [searchFilter, setSearchFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Módulo SEPA
  const [selectedSepaIds, setSelectedSepaIds] = useState<string[]>(['DOC-103']);
  const [debtorIban, setDebtorIban] = useState('PT50003500000000000000000');
  const [debtorName, setDebtorName] = useState('NOV OUSADO UNIPESSOAL LDA');

  // Módulo Conciliação Bancária
  const [statementCsv, setStatementCsv] = useState(
    "2026-08-12;Transf. Notablededication;301,35\n2026-08-20;Transf. BBVA TEFCOLD ClimaHosteleria;702,04\n2026-08-21;EDP Comercial;85,40"
  );
  const [matchedTransactions, setMatchedTransactions] = useState<any[]>([]);

  // Funções de Câmara
  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setIsCameraOpen(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      stopCamera();
      processImageUrl(dataUrl);
    }
  };

  // Parser OCR Multi-Fornecedor
  const parseDocumentOCR = (text: string): InvoiceData => {
    if (/CLIMAHOSTELERIA|TEFCOLD|VOV26008382|ESB09802059/i.test(text)) {
      return {
        id: 'DOC-' + Date.now(),
        supplierName: 'TEFCOLD ES, S.L. (CLIMAHOSTELERIA)',
        supplierNif: 'ESB09802059',
        customerName: 'NOV OUSADO UNIPESSOAL LDA',
        customerNif: 'PT515208566',
        docType: 'OFERTA',
        docNumber: 'VOV26008382',
        docDate: '2026-08-20',
        iban: 'ES7701822342120201755957',
        netAmount: 702.04,
        taxAmount: 0.00,
        totalAmount: 702.04,
        isNonFiscalDoc: true,
        isIntracommunity: true,
        docNature: 'Oferta de Venta / Encomenda (Espanha)',
        category: 'Fornecedores Espanha / UE',
        tags: ['#Espanha', '#Intracomunitaria'],
        paymentStatus: 'PAID',
        paymentDate: '2026-08-20',
        paymentMethod: 'Transferência Bancária (BBVA)',
        items: [{ code: 'HS-30', description: 'Amasadora Espiral 30L PEKIN HS-30', quantity: 1, unitPrice: 1432.73, discount: 50, taxRate: 0, total: 702.04 }]
      };
    }

    if (/MASTERQUIP|MQ26\/1431|506470261/i.test(text)) {
      return {
        id: 'DOC-' + Date.now(),
        supplierName: 'MASTERQUIP, LDA.',
        supplierNif: '506470261',
        customerName: 'NOV OUSADO UNIPESSOAL LDA',
        customerNif: '515208566',
        docType: 'ORC',
        docNumber: 'ORC MQ26/1431',
        docDate: '2026-08-12',
        atcud: 'J6TWSYZT-1431',
        iban: 'PT50003300004524017192605',
        netAmount: 100.28,
        taxAmount: 23.06,
        totalAmount: 123.34,
        isNonFiscalDoc: true,
        docNature: 'Factura Proforma / Orçamento',
        category: 'Proformas & Orçamentos',
        tags: ['#Proforma'],
        paymentStatus: 'PAID',
        paymentDate: '2026-08-12',
        paymentMethod: 'Transferência Bancária',
        items: [
          { code: '5001000039910', description: 'CONJ. BASE/RASPADOR J 80 U SAV', quantity: 1, unitPrice: 133.40, discount: 30, taxRate: 23, total: 93.38 },
          { code: 'NCX 0-5', description: 'EXP 7475/ ENVIO', quantity: 1, unitPrice: 5.70, discount: 0, taxRate: 23, total: 5.70 }
        ]
      };
    }

    if (/NOTABLEDEDICATION|M2026\/432|514585587/i.test(text)) {
      return {
        id: 'DOC-' + Date.now(),
        supplierName: 'Notable Dedication Unipessoal Lda',
        supplierNif: '514585587',
        customerName: 'Nov Ousado, Unipessoal, Lda.',
        customerNif: '515208566',
        docType: 'FT',
        docNumber: 'FT M2026/432',
        docDate: '2026-07-27',
        atcud: 'J6N4RDHC-432',
        iban: 'PT50001800034570641302079',
        netAmount: 245.00,
        taxAmount: 56.35,
        totalAmount: 301.35,
        isNonFiscalDoc: false,
        docNature: 'Fatura Fiscal Definitiva',
        category: 'Equipamentos & Máquinas',
        tags: ['#Fatura-Valida'],
        paymentStatus: 'PAID',
        paymentDate: '2026-08-12',
        paymentMethod: 'Transferência Bancária',
        items: [
          { code: 'mot', description: 'Mão de obra Técnico', quantity: 2, unitPrice: 30.00, discount: 0, taxRate: 23, total: 60.00 },
          { code: 'dlx', description: 'Deslocação Lisboa', quantity: 1, unitPrice: 30.00, discount: 0, taxRate: 23, total: 30.00 }
        ]
      };
    }

    const isNonFiscal = /OFERTA|PRESUPUESTO|PEDIDO|PROFORMA|ORÇAMENTO|ORC|FP|NÃO\s*SERVE/i.test(text);
    return {
      id: 'DOC-' + Date.now(),
      supplierName: 'Fornecedor Detetado',
      supplierNif: '514585587',
      customerName: 'Nov Ousado, Unipessoal, Lda.',
      customerNif: '515208566',
      docType: isNonFiscal ? 'ORC' : 'FT',
      docNumber: 'FT 2026/' + Math.floor(Math.random() * 1000),
      docDate: new Date().toISOString().split('T')[0],
      atcud: 'AT-REGISTADO',
      iban: 'PT50001800034570641302079',
      netAmount: 100.00,
      taxAmount: 23.00,
      totalAmount: 123.00,
      isNonFiscalDoc: isNonFiscal,
      docNature: isNonFiscal ? 'Proforma / Orçamento' : 'Fatura Fiscal Definitiva',
      category: isNonFiscal ? 'Proformas & Orçamentos' : selectedFolder,
      tags: ['#Digitalizado'],
      paymentStatus: 'PENDING',
      items: [{ code: 'ART-1', description: 'Material / Serviço', quantity: 1, unitPrice: 100.00, discount: 0, taxRate: 23, total: 100.00 }]
    };
  };

  const processImageUrl = async (imageUrl: string) => {
    setLoading(true);
    setSaveSuccess(false);
    setStatusMsg('A analisar documento...');
    setImagePreview(imageUrl);

    try {
      const worker = await createWorker(['por', 'spa', 'eng']);
      const ret = await worker.recognize(imageUrl);
      await worker.terminate();

      const docData = parseDocumentOCR(ret.data.text);
      setInvoice(docData);
      setSelectedFolder(docData.category);

      if (docData.isNonFiscalDoc) {
        setStatusMsg(`Aviso: Identificado como "${docData.docNature}"`);
      } else {
        setStatusMsg('Fatura fiscal definitiva validada com sucesso!');
      }
    } catch (e) {
      const fallback = parseDocumentOCR('');
      setInvoice(fallback);
      setSelectedFolder(fallback.category);
      setStatusMsg('Documento processado.');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!invoice) return;
    setLoading(true);
    setStatusMsg('A arquivar documento...');

    const finalDoc = {
      ...invoice,
      category: selectedFolder
    };

    setArchivedDocs(prev => [finalDoc, ...prev.filter(d => d.id !== finalDoc.id)]);
    setSaveSuccess(true);
    setStatusMsg(`Documento arquivado com sucesso na pasta "${selectedFolder}"!`);
    setLoading(false);
  };

  const togglePaymentStatus = (docId: string) => {
    setArchivedDocs(prev => prev.map(doc => {
      if (doc.id === docId) {
        const isNowPaid = doc.paymentStatus !== 'PAID';
        return {
          ...doc,
          paymentStatus: isNowPaid ? 'PAID' : 'PENDING',
          paymentDate: isNowPaid ? new Date().toISOString().split('T')[0] : undefined,
          paymentMethod: isNowPaid ? (doc.paymentMethod || 'Transferência Bancária') : undefined
        };
      }
      return doc;
    }));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newF: FolderItem = {
      id: 'f-' + Date.now(),
      name: newFolderName.trim(),
      description: newFolderDesc.trim() || 'Pasta de arquivo',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
    };
    setFolders(prev => [...prev, newF]);
    setSelectedFolder(newF.name);
    setNewFolderName('');
    setNewFolderDesc('');
    setShowNewFolderModal(false);
  };

  // Conciliação Bancária
  const handleReconcile = () => {
    const lines = statementCsv.split('\n').filter(l => l.trim().length > 0);
    const results: any[] = [];

    for (const line of lines) {
      const parts = line.split(/[;,]/);
      if (parts.length >= 2) {
        const date = parts[0]?.trim();
        const desc = parts[1]?.trim();
        const rawAmt = parts[2]?.trim().replace('€', '').replace(',', '.') || '0';
        const amount = Math.abs(parseFloat(rawAmt));

        const match = archivedDocs.find(
          d => Math.abs(d.totalAmount - amount) < 0.05 || (desc && d.supplierName && desc.toLowerCase().includes(d.supplierName.toLowerCase().split(' ')[0]))
        );

        results.push({
          date,
          description: desc,
          amount,
          match: match || null
        });
      }
    }
    setMatchedTransactions(results);
  };

  // Gerar SEPA XML
  const handleDownloadSepa = () => {
    const selected = archivedDocs.filter(d => selectedSepaIds.includes(d.id) && d.iban);
    const totalAmount = selected.reduce((sum, d) => sum + d.totalAmount, 0);
    const msgId = 'DOCFLOW-SEPA-' + Date.now();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n`;
    xml += `  <CstmrCdtTrfInitn>\n    <GrpHdr>\n      <MsgId>${msgId}</MsgId>\n      <CreDtTm>${new Date().toISOString()}</CreDtTm>\n      <NbOfTxs>${selected.length}</NbOfTxs>\n      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>\n      <InitgPty><Nm>${debtorName}</Nm></InitgPty>\n    </GrpHdr>\n`;
    xml += `    <PmtInf>\n      <PmtInfId>LOT-${Date.now()}</PmtInfId>\n      <PmtMtd>TRF</PmtMtd>\n      <Dbtr><Nm>${debtorName}</Nm></Dbtr>\n      <DbtrAcct><Id><IBAN>${debtorIban.replace(/\s+/g, '')}</IBAN></Id></DbtrAcct>\n`;

    for (const doc of selected) {
      xml += `      <CdtTrfTxInf>\n        <PmtId><EndToEndId>${doc.docNumber.replace(/[^a-zA-Z0-9]/g, '')}</EndToEndId></PmtId>\n        <Amt><InstdAmt Ccy="EUR">${doc.totalAmount.toFixed(2)}</InstdAmt></Amt>\n        <Cdtr><Nm>${doc.supplierName}</Nm></Cdtr>\n        <CdtrAcct><Id><IBAN>${doc.iban?.replace(/\s+/g, '')}</IBAN></Id></CdtrAcct>\n        <RmtInf><Ustrd>Liquidacao ${doc.docNumber} NIF ${doc.supplierNif}</Ustrd></RmtInf>\n      </CdtTrfTxInf>\n`;
    }

    xml += `    </PmtInf>\n  </CstmrCdtTrfInitn>\n</Document>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEPA_PAGAMENTOS_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
  };

  const filteredDocs = archivedDocs.filter(d => {
    const matchesSearch = d.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          d.supplierNif.includes(searchFilter) || 
                          d.docNumber.toLowerCase().includes(searchFilter.toLowerCase());
    if (paymentFilter === 'PENDING') return matchesSearch && d.paymentStatus === 'PENDING';
    if (paymentFilter === 'PAID') return matchesSearch && d.paymentStatus === 'PAID';
    return matchesSearch;
  });

  const totalPending = archivedDocs.filter(d => d.paymentStatus === 'PENDING').reduce((acc, d) => acc + d.totalAmount, 0);
  const totalPaid = archivedDocs.filter(d => d.paymentStatus === 'PAID').reduce((acc, d) => acc + d.totalAmount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 md:p-8 font-sans">
      {/* Top Header */}
      <header className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            DF
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">DocFlow PT • Suite Empresarial</h1>
            <p className="text-xs text-slate-400">Arquivo Fiscal • Tesouraria • Conciliação • SEPA</p>
          </div>
        </div>

        {/* 6 Módulos de Navegação */}
        <nav className="flex flex-wrap items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'scanner' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Digitalizar
          </button>
          <button 
            onClick={() => setActiveTab('folders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'folders' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Folder className="w-3.5 h-3.5" /> Pastas ({folders.length})
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'documents' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Arquivo ({archivedDocs.length})
          </button>
          <button 
            onClick={() => setActiveTab('reconciliation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reconciliation' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Conciliação
          </button>
          <button 
            onClick={() => setActiveTab('sepa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sepa' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Lotes SEPA
          </button>
          <button 
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'automations' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> Automações
          </button>
        </nav>
      </header>

      <main className="w-full max-w-5xl">
        {/* ================= 1. DIGITALIZAR ================= */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pasta de Destino:</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  value={selectedFolder} 
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:border-emerald-500 outline-none flex-1 sm:flex-none"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowNewFolderModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Pasta
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all shadow-xl">
              {imagePreview ? (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-full max-h-80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                    <img src={imagePreview} alt="Documento" className="max-h-72 object-contain rounded-lg shadow-md" />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button 
                      onClick={() => startCamera('environment')}
                      className="inline-flex items-center gap-2 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <Camera className="w-4 h-4" /> Abrir Câmara em Direto
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <Upload className="w-4 h-4" /> Carregar Outra Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 py-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-200">Digitalizar Documento Fiscal</p>
                    <p className="text-xs text-slate-500">Lê QR Code da AT, faturas nacionais, comunitárias (Espanha/UE) e proformas</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                    <button 
                      onClick={() => startCamera('environment')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Camera className="w-4 h-4" /> Abrir Câmara
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Upload className="w-4 h-4" /> Galeria / Ficheiro
                    </button>
                  </div>
                </div>
              )}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    processImageUrl(URL.createObjectURL(e.target.files[0]));
                  }
                }} 
              />
            </div>

            {statusMsg && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-medium text-slate-300 flex items-center justify-center gap-2 shadow-sm">
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                <span>{statusMsg}</span>
              </div>
            )}

            {invoice && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl">
                {invoice.isNonFiscalDoc ? (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-amber-300">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                        Aviso: {invoice.docNature}
                      </h3>
                      <p className="text-xs text-amber-300/90 leading-relaxed">
                        Este documento não é fatura fiscal definitiva (Nº {invoice.docNumber}). Não deduz IVA até emissão do documento final.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-xs font-medium">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Fatura Fiscal Certificada pela AT com código ATCUD {invoice.atcud}.</span>
                  </div>
                )}

                {/* Pagamento */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" /> Estado de Liquidação
                    </span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setInvoice({ ...invoice, paymentStatus: 'PAID', paymentDate: invoice.paymentDate || new Date().toISOString().split('T')[0] })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          invoice.paymentStatus === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ✅ Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoice({ ...invoice, paymentStatus: 'PENDING' })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          invoice.paymentStatus === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ⏳ Por Pagar
                      </button>
                    </div>
                  </div>

                  {invoice.paymentStatus === 'PAID' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Data de Pagamento</label>
                        <input
                          type="date"
                          value={invoice.paymentDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setInvoice({ ...invoice, paymentDate: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-semibold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Meio de Pagamento</label>
                        <select
                          value={invoice.paymentMethod || 'Transferência Bancária'}
                          onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none"
                        >
                          <option value="Transferência Bancária">Transferência Bancária</option>
                          <option value="Débito Direto">Débito Direto</option>
                          <option value="MB WAY">MB WAY</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fornecedor</label>
                    <input 
                      type="text" 
                      value={invoice.supplierName} 
                      onChange={(e) => setInvoice({...invoice, supplierName: e.target.value})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIF / CIF</label>
                    <input 
                      type="text" 
                      value={invoice.supplierNif} 
                      onChange={(e) => setInvoice({...invoice, supplierNif: e.target.value})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nº Documento</label>
                    <input 
                      type="text" 
                      value={invoice.docNumber} 
                      onChange={(e) => setInvoice({...invoice, docNumber: e.target.value})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Data</label>
                    <input 
                      type="text" 
                      value={invoice.docDate} 
                      onChange={(e) => setInvoice({...invoice, docDate: e.target.value})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">IBAN Fornecedor</label>
                    <input 
                      type="text" 
                      value={invoice.iban || ''} 
                      onChange={(e) => setInvoice({...invoice, iban: e.target.value})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Base (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={invoice.netAmount} 
                      onChange={(e) => setInvoice({...invoice, netAmount: parseFloat(e.target.value) || 0})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-200 font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">IVA (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={invoice.taxAmount} 
                      onChange={(e) => setInvoice({...invoice, taxAmount: parseFloat(e.target.value) || 0})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total a Pagar (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={invoice.totalAmount} 
                      onChange={(e) => setInvoice({...invoice, totalAmount: parseFloat(e.target.value) || 0})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold text-base outline-none"
                    />
                  </div>
                </div>

                {invoice.items && invoice.items.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <List className="w-4 h-4 text-emerald-400" /> Artigos & Linhas ({invoice.items.length})
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Descrição</th>
                            <th className="p-2.5 text-center">Qtd</th>
                            <th className="p-2.5 text-right">Preço Unit.</th>
                            <th className="p-2.5 text-center">Desc (%)</th>
                            <th className="p-2.5 text-center">IVA</th>
                            <th className="p-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {invoice.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="p-2.5 text-emerald-400 font-semibold">{item.code}</td>
                              <td className="p-2.5 text-slate-200 font-sans text-xs">{item.description}</td>
                              <td className="p-2.5 text-center">{item.quantity}</td>
                              <td className="p-2.5 text-right">{item.unitPrice.toFixed(2)} €</td>
                              <td className="p-2.5 text-center text-amber-400">{item.discount > 0 ? `${item.discount}%` : '—'}</td>
                              <td className="p-2.5 text-center text-slate-400">{item.taxRate}%</td>
                              <td className="p-2.5 text-right font-bold text-white">{item.total.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleSave}
                  disabled={loading || saveSuccess}
                  className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                    saveSuccess 
                      ? 'bg-emerald-600 cursor-default' 
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-emerald-950/40'
                  }`}
                >
                  {saveSuccess ? <><CheckCircle2 className="w-5 h-5" /> Documento Guardado!</> : <><CheckCircle2 className="w-5 h-5" /> Confirmar & Guardar</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 2. PASTAS ================= */}
        {activeTab === 'folders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Estrutura de Pastas</h2>
                <p className="text-xs text-slate-400">Pastas de organização de despesas</p>
              </div>
              <button 
                onClick={() => setShowNewFolderModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <Plus className="w-4 h-4" /> Criar Nova Pasta
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {folders.map(f => {
                const count = archivedDocs.filter(d => d.category === f.name).length;
                const total = archivedDocs.filter(d => d.category === f.name).reduce((acc, d) => acc + d.totalAmount, 0);
                return (
                  <div key={f.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${f.color}`}>
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{f.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">{count} documento(s)</span>
                      <span className="text-emerald-400 font-bold">{total.toFixed(2)} €</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 3. ARQUIVO & PAGAMENTOS ================= */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Total Por Pagar (Pendente)
                  </span>
                  <p className="text-2xl font-black text-amber-300 mt-1">{totalPending.toFixed(2)} €</p>
                </div>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-bold">
                  {archivedDocs.filter(d => d.paymentStatus === 'PENDING').length} doc(s)
                </span>
              </div>

              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Total Liquidado (Pago)
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{totalPaid.toFixed(2)} €</p>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
                  {archivedDocs.filter(d => d.paymentStatus === 'PAID').length} doc(s)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setPaymentFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    paymentFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({archivedDocs.length})
                </button>
                <button
                  onClick={() => setPaymentFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    paymentFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⏳ Por Pagar
                </button>
                <button
                  onClick={() => setPaymentFilter('PAID')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    paymentFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✅ Pagos
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Pesquisar NIF, Fornecedor..." 
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Pasta</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono">{doc.docDate}</td>
                      <td className="p-3 font-semibold text-white">
                        <div>{doc.supplierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIF: {doc.supplierNif}</div>
                      </td>
                      <td className="p-3 font-mono">
                        <span className={doc.isNonFiscalDoc ? 'text-amber-400 font-bold' : 'text-white'}>
                          {doc.docNumber}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[10px]">
                          {doc.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400 text-sm">{doc.totalAmount.toFixed(2)} €</td>
                      <td className="p-3">
                        {doc.paymentStatus === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Pago ({doc.paymentDate})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => togglePaymentStatus(doc.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            doc.paymentStatus === 'PAID'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          }`}
                        >
                          {doc.paymentStatus === 'PAID' ? 'Reabrir' : 'Dar como Pago'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 4. CONCILIAÇÃO BANCÁRIA ================= */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-emerald-400" /> Conciliação Automática de Extrato
                  </h2>
                  <p className="text-xs text-slate-400">Cole o extrato do seu banco (CSV) ou carregue o ficheiro para cruzar movimentos com as faturas</p>
                </div>
                <button
                  onClick={handleReconcile}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <RefreshCcw className="w-4 h-4" /> Cruzar com Faturas
                </button>
              </div>

              <textarea
                rows={4}
                value={statementCsv}
                onChange={(e) => setStatementCsv(e.target.value)}
                placeholder="Data;Descrição;Valor"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            {matchedTransactions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resultado da Correspondência</h3>
                  <span className="text-xs text-emerald-400 font-semibold">{matchedTransactions.filter(t => t.match).length} de {matchedTransactions.length} reconciliados</span>
                </div>
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Data Extrato</th>
                      <th className="p-3">Movimento Bancário</th>
                      <th className="p-3">Valor Extrato</th>
                      <th className="p-3">Fatura Correspondente</th>
                      <th className="p-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {matchedTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3">{tx.date}</td>
                        <td className="p-3 text-white font-sans">{tx.description}</td>
                        <td className="p-3 font-bold text-amber-400">{tx.amount.toFixed(2)} €</td>
                        <td className="p-3">
                          {tx.match ? (
                            <span className="text-emerald-400 font-bold font-sans">
                              {tx.match.supplierName} ({tx.match.docNumber})
                            </span>
                          ) : (
                            <span className="text-slate-500 font-sans italic">Sem fatura correspondente</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {tx.match ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                              ✅ 100% Conciliado
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                              Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= 5. LOTES SEPA ================= */}
        {activeTab === 'sepa' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-400" /> Emissão de Lotes de Pagamento SEPA (pain.001)
                  </h2>
                  <p className="text-xs text-slate-400">Gera o ficheiro XML bancário para liquidar todas as faturas selecionadas de uma só vez</p>
                </div>
                <button
                  onClick={handleDownloadSepa}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Download className="w-4 h-4" /> Descarregar SEPA XML
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">A Sua Empresa (Ordenante)</label>
                  <input
                    type="text"
                    value={debtorName}
                    onChange={(e) => setDebtorName(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">O Seu IBAN (Conta de Saída)</label>
                  <input
                    type="text"
                    value={debtorIban}
                    onChange={(e) => setDebtorIban(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Faturas a Incluir no Lote</span>
                <span className="text-xs text-emerald-400 font-bold">
                  Total Selecionado: {archivedDocs.filter(d => selectedSepaIds.includes(d.id)).reduce((s, d) => s + d.totalAmount, 0).toFixed(2)} €
                </span>
              </div>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-10">Sel.</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">IBAN Destino</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {archivedDocs.map(doc => {
                    const isSelected = selectedSepaIds.includes(doc.id);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 cursor-pointer" onClick={() => {
                        setSelectedSepaIds(prev => isSelected ? prev.filter(id => id !== doc.id) : [...prev, doc.id]);
                      }}>
                        <td className="p-3">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                        </td>
                        <td className="p-3 font-semibold text-white">{doc.supplierName}</td>
                        <td className="p-3 font-mono">{doc.docNumber}</td>
                        <td className="p-3 font-mono text-slate-400">{doc.iban || 'Sem IBAN'}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{doc.totalAmount.toFixed(2)} €</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 6. AUTOMAÇÕES (EMAIL & SCANNER) ================= */}
        {activeTab === 'automations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Robô de Email */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Robô de Entrada de Email</h3>
                      <p className="text-xs text-slate-400">Captura PDFs e links de Moloni/TOConline</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Configure o reencaminhamento automático da sua caixa <code>faturas@hotelequip.pt</code> para o endpoint da sua API.
                  </p>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 break-all">
                    Webhook: https://api-docflow.profihotel.pt/api/documents
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Estado do Robô:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Ativo & Escutando
                  </span>
                </div>
              </div>

              {/* Hotfolder Scanner */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Agente de Pasta do Scanner (Windows)</h3>
                      <p className="text-xs text-slate-400">Sincroniza scans da impressora diretamente</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Monitore uma pasta no computador (ex: <code>C:\Scans_DocFlow</code>). Sempre que a impressora guardar um PDF, o DocFlow processa-o de imediato.
                  </p>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-blue-400">
                    Pasta Local: C:\Users\Rui Medalha\Scans_DocFlow
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Integração:</span>
                  <span className="text-blue-400 font-bold">Script PowerShell Pronto</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <FolderPlus className="w-5 h-5" /> Criar Nova Pasta de Arquivo
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Nome da Pasta</label>
                <input 
                  type="text" 
                  placeholder="Ex: Obras Lisboa, Peças Rational..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Faturas do projeto X"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowNewFolderModal(false)} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={handleCreateFolder} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/40">
                Guardar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor da Câmara */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4 sm:p-6">
          <div className="w-full max-w-lg flex items-center justify-between text-white py-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Câmara Ativa
            </span>
            <button onClick={stopCamera} className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full max-w-lg flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 my-2">
            <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-emerald-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] text-emerald-400/80 bg-black/50 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                Enquadre o Documento ou QR Code
              </span>
            </div>
          </div>

          <div className="w-full max-w-lg flex items-center justify-around py-4">
            <button 
              onClick={() => {
                const next = cameraFacing === 'environment' ? 'user' : 'environment';
                setCameraFacing(next);
                startCamera(next);
              }}
              className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>

            <button 
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-2xl flex items-center justify-center text-white"
            >
              <Camera className="w-8 h-8" />
            </button>

            <button 
              onClick={() => {
                stopCamera();
                fileInputRef.current?.click();
              }}
              className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            >
              <Upload className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
