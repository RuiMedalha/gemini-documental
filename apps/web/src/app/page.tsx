'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, CheckCircle2, AlertTriangle, FileText, 
  Euro, FolderPlus, ShieldCheck, RefreshCw, Folder, FolderOpen, 
  Plus, Search, X, SwitchCamera, List, Globe, CreditCard, 
  Check, Clock, ArrowRightLeft, Download, Server, Sparkles, Zap
} from 'lucide-react';
import jsQR from 'jsqr';

interface InvoiceItem {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  total: number;
}

interface InvoiceData {
  id: string;
  supplierName: string;
  supplierNif: string;
  customerName?: string;
  customerNif?: string;
  docType: string;
  docNumber: string;
  docDate: string;
  atcud?: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  iban?: string;
  isNonFiscalDoc?: boolean;
  docNature?: string;
  isIntracommunity?: boolean;
  extractionMethod?: string;
  items?: InvoiceItem[];
  category: string;
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

export default function DocFlowPlatform() {
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
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Faturas de equipamentos', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Componentes e assistência', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock e químicos', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, luz e comunicações', color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
    { id: 'f5', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura final', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    { id: 'f6', name: 'Fornecedores Espanha / UE', description: 'Compras Intracomunitárias', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
  ]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Equipamentos & Máquinas');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Arquivo de Documentos
  const [archivedDocs, setArchivedDocs] = useState<InvoiceData[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SEPA & Conciliação
  const [selectedSepaIds, setSelectedSepaIds] = useState<string[]>([]);
  const [debtorIban, setDebtorIban] = useState('PT50003500000000000000000');
  const [debtorName, setDebtorName] = useState('NOV OUSADO UNIPESSOAL LDA');
  const [statementCsv, setStatementCsv] = useState("2026-08-12;Transf. Notablededication;301,35\n2026-08-20;Transf. TEFCOLD ClimaHosteleria;702,04");
  const [matchedTransactions, setMatchedTransactions] = useState<any[]>([]);

  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    try {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
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
    } catch {
      setIsCameraOpen(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
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
      processDocumentHybrid(dataUrl);
    }
  };

  // Motor Híbrido: Procura QR Code localmente e submete ao Backend (Gemini API)
  const processDocumentHybrid = async (imageUrl: string) => {
    setLoading(true);
    setSaveSuccess(false);
    setStatusMsg('1. A verificar QR Code da AT...');
    setImagePreview(imageUrl);

    const img = new Image();
    img.src = imageUrl;
    await new Promise(r => { img.onload = r; });

    let qrCodeRaw: string | undefined = undefined;
    const scales = [1, 0.75, 0.5, 1.5];
    for (const scale of scales) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data && code.data.includes('*')) {
          qrCodeRaw = code.data;
          break;
        }
      }
    }

    setStatusMsg(qrCodeRaw ? 'QR Code AT detetado! A extrair dados e auditar no servidor...' : 'A analisar documento no Gemini Vision AI...');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/documents/process-hybrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageUrl,
          mimeType: 'image/jpeg',
          qrCodeRaw,
          category: selectedFolder
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
        setSelectedFolder(data.category || selectedFolder);
        setStatusMsg(data.extractionMethod === 'HYBRID_QR_AND_GEMINI' 
          ? '⚡ QR Code AT Oficial + 🧠 Linhas extraídas por Gemini Vision!'
          : (data.extractionMethod === 'GEMINI_VISION_AI' ? '🧠 Auditado com sucesso por Gemini Vision AI!' : 'Documento processado!'));
      }
    } catch {
      setStatusMsg('Processado no modo local.');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!invoice) return;
    setLoading(true);
    const finalDoc = { ...invoice, category: selectedFolder };

    setArchivedDocs(prev => [finalDoc, ...prev.filter(d => d.id !== finalDoc.id)]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      if (apiUrl) {
        await fetch(`${apiUrl}/api/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalDoc)
        });
      }
    } catch {}

    setSaveSuccess(true);
    setStatusMsg(`Fatura arquivada com sucesso na pasta "${selectedFolder}"!`);
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

  const handleDownloadSepa = () => {
    const selected = archivedDocs.filter(d => selectedSepaIds.includes(d.id) && d.iban);
    const total = selected.reduce((s, d) => s + d.totalAmount, 0);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n<CstmrCdtTrfInitn>\n<GrpHdr><MsgId>SEPA-${Date.now()}</MsgId><CreDtTm>${new Date().toISOString()}</CreDtTm><NbOfTxs>${selected.length}</NbOfTxs><CtrlSum>${total.toFixed(2)}</CtrlSum><InitgPty><Nm>${debtorName}</Nm></InitgPty></GrpHdr>\n<PmtInf><PmtInfId>LOT-${Date.now()}</PmtInfId><PmtMtd>TRF</PmtMtd><Dbtr><Nm>${debtorName}</Nm></Dbtr><DbtrAcct><Id><IBAN>${debtorIban.replace(/\s+/g, '')}</IBAN></Id></DbtrAcct>\n`;
    for (const doc of selected) {
      xml += `<CdtTrfTxInf><PmtId><EndToEndId>${doc.docNumber.replace(/[^a-zA-Z0-9]/g, '')}</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">${doc.totalAmount.toFixed(2)}</InstdAmt></Amt><Cdtr><Nm>${doc.supplierName}</Nm></Cdtr><CdtrAcct><Id><IBAN>${doc.iban?.replace(/\s+/g, '')}</IBAN></Id></CdtrAcct><RmtInf><Ustrd>Liquidacao ${doc.docNumber} NIF ${doc.supplierNif}</Ustrd></RmtInf></CdtTrfTxInf>\n`;
    }
    xml += `</PmtInf>\n</CstmrCdtTrfInitn>\n</Document>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEPA_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
  };

  const filteredDocs = archivedDocs.filter(d => {
    const match = d.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) || 
                  d.supplierNif.includes(searchFilter) || 
                  d.docNumber.toLowerCase().includes(searchFilter.toLowerCase());
    if (paymentFilter === 'PENDING') return match && d.paymentStatus === 'PENDING';
    if (paymentFilter === 'PAID') return match && d.paymentStatus === 'PAID';
    return match;
  });

  const totalPending = archivedDocs.filter(d => d.paymentStatus === 'PENDING').reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid = archivedDocs.filter(d => d.paymentStatus === 'PAID').reduce((s, d) => s + d.totalAmount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 md:p-8 font-sans">
      <header className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            DF
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">DocFlow PT • Suite Fiscal & IA</h1>
            <p className="text-xs text-slate-400">QR Code First + Gemini 2.0 Vision Engine</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveTab('scanner')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Camera className="w-3.5 h-3.5" /> Digitalizar
          </button>
          <button onClick={() => setActiveTab('folders')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'folders' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Folder className="w-3.5 h-3.5" /> Pastas ({folders.length})
          </button>
          <button onClick={() => setActiveTab('documents')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'documents' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <FileText className="w-3.5 h-3.5" /> Arquivo ({archivedDocs.length})
          </button>
          <button onClick={() => setActiveTab('reconciliation')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'reconciliation' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <ArrowRightLeft className="w-3.5 h-3.5" /> Conciliação
          </button>
          <button onClick={() => setActiveTab('sepa')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'sepa' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Download className="w-3.5 h-3.5" /> Lotes SEPA
          </button>
          <button onClick={() => setActiveTab('automations')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'automations' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
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
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guardar na Pasta:</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  value={selectedFolder} 
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-emerald-500 flex-1 sm:flex-none"
                >
                  {folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
                <button onClick={() => setShowNewFolderModal(true)} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Nova Pasta
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all shadow-xl">
              {imagePreview ? (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-full max-h-80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                    <img src={imagePreview} alt="Fatura" className="max-h-72 object-contain rounded-lg shadow-md" />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button onClick={() => startCamera('environment')} className="inline-flex items-center gap-2 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 font-semibold px-4 py-2 rounded-xl transition-all">
                      <Camera className="w-4 h-4" /> Abrir Câmara
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 font-semibold px-4 py-2 rounded-xl transition-all">
                      <Upload className="w-4 h-4" /> Carregar Outra Imagem
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
                    <p className="text-xs text-slate-500">Pipeline inteligente: Lê QR Code da AT ou aciona Gemini Vision AI para faturas de Espanha/UE e recibos</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                    <button onClick={() => startCamera('environment')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-sm">
                      <Camera className="w-4 h-4" /> Abrir Câmara
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 text-sm">
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
                    const reader = new FileReader();
                    reader.onload = () => processDocumentHybrid(reader.result as string);
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }} 
              />
            </div>

            {statusMsg && (
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-medium text-slate-300 flex items-center justify-center gap-2 shadow-sm">
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                <span>{statusMsg}</span>
              </div>
            )}

            {invoice && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl">
                {/* Badges de Auditoria */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {invoice.extractionMethod === 'HYBRID_QR_AND_GEMINI' && (
                      <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> QR Code AT Oficial + <Sparkles className="w-3.5 h-3.5" /> Gemini AI
                      </span>
                    )}
                    {invoice.extractionMethod === 'GEMINI_VISION_AI' && (
                      <span className="text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Gemini 2.0 Vision Engine
                      </span>
                    )}
                    {invoice.atcud && (
                      <span className="text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-md">
                        ATCUD: {invoice.atcud}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                    📁 {selectedFolder}
                  </span>
                </div>

                {/* Banner de Aviso Proforma */}
                {invoice.isNonFiscalDoc && (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-amber-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-amber-200 uppercase">Aviso de Auditoria: {invoice.docNature || 'Documento Não Fiscal'}</h4>
                      <p className="text-[11px] text-amber-300/90 leading-relaxed">
                        Este documento não é fatura fiscal definitiva. Não deduz IVA até emissão do documento final.
                      </p>
                    </div>
                  </div>
                )}

                {/* Secção de Pagamento */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" /> Estado de Liquidação
                    </span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setInvoice({ ...invoice, paymentStatus: 'PAID', paymentDate: invoice.paymentDate || new Date().toISOString().split('T')[0] })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${invoice.paymentStatus === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        ✅ Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoice({ ...invoice, paymentStatus: 'PENDING' })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${invoice.paymentStatus === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
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

                {/* Campos do Documento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fornecedor / Emissor</label>
                    <input 
                      type="text" 
                      value={invoice.supplierName} 
                      onChange={(e) => setInvoice({...invoice, supplierName: e.target.value})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIF / CIF Fornecedor</label>
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
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Data de Emissão</label>
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
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Base Incidência (€)</label>
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

                {/* Linhas de Artigos */}
                {invoice.items && invoice.items.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <List className="w-4 h-4 text-emerald-400" /> Artigos & Linhas Extraídas ({invoice.items.length})
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
                              <td className="p-2.5 text-emerald-400 font-semibold">{item.code || '—'}</td>
                              <td className="p-2.5 text-slate-200 font-sans text-xs">{item.description}</td>
                              <td className="p-2.5 text-center">{item.quantity}</td>
                              <td className="p-2.5 text-right">{item.unitPrice.toFixed(2)} €</td>
                              <td className="p-2.5 text-center text-amber-400">{item.discount ? `${item.discount}%` : '—'}</td>
                              <td className="p-2.5 text-center text-slate-400">{item.taxRate || 23}%</td>
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
                    saveSuccess ? 'bg-emerald-600 cursor-default' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-emerald-950/40'
                  }`}
                >
                  {saveSuccess ? <><CheckCircle2 className="w-5 h-5" /> Documento Guardado!</> : <><CheckCircle2 className="w-5 h-5" /> Confirmar & Arquivar</>}
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
              <button onClick={() => setShowNewFolderModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40">
                <Plus className="w-4 h-4" /> Criar Nova Pasta
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {folders.map(f => {
                const count = archivedDocs.filter(d => d.category === f.name).length;
                const total = archivedDocs.filter(d => d.category === f.name).reduce((acc, d) => acc + d.totalAmount, 0);
                return (
                  <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${f.color}`}><Folder className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{f.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">{count} documento(s)</span>
                      <span className="text-emerald-400 font-bold">{total.toFixed(2)} €</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 3. ARQUIVO ================= */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-4 h-4" /> Total Por Pagar</span>
                  <p className="text-2xl font-black text-amber-300 mt-1">{totalPending.toFixed(2)} €</p>
                </div>
                <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg font-bold">{archivedDocs.filter(d => d.paymentStatus === 'PENDING').length} doc(s)</span>
              </div>
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Total Liquidado</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{totalPaid.toFixed(2)} €</p>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg font-bold">{archivedDocs.filter(d => d.paymentStatus === 'PAID').length} doc(s)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <button onClick={() => setPaymentFilter('ALL')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${paymentFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Todos ({archivedDocs.length})</button>
                <button onClick={() => setPaymentFilter('PENDING')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${paymentFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>⏳ Por Pagar</button>
                <button onClick={() => setPaymentFilter('PAID')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${paymentFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>✅ Pagos</button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
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
                    <tr key={doc.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono">{doc.docDate}</td>
                      <td className="p-3 font-semibold text-white">
                        <div>{doc.supplierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIF: {doc.supplierNif}</div>
                      </td>
                      <td className="p-3 font-mono">{doc.docNumber}</td>
                      <td className="p-3"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[10px]">{doc.category}</span></td>
                      <td className="p-3 font-bold text-emerald-400 text-sm">{doc.totalAmount.toFixed(2)} €</td>
                      <td className="p-3">
                        {doc.paymentStatus === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => togglePaymentStatus(doc.id)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${doc.paymentStatus === 'PAID' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-600 text-white'}`}>
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
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-emerald-400" /> Conciliação Bancária</h2>
              <textarea rows={4} value={statementCsv} onChange={(e) => setStatementCsv(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 outline-none" />
              <button onClick={() => {
                const lines = statementCsv.split('\n').filter(l => l.trim().length > 0);
                setMatchedTransactions(lines.map(l => {
                  const parts = l.split(';');
                  const amt = Math.abs(parseFloat(parts[2]?.replace(',', '.') || '0'));
                  const match = archivedDocs.find(d => Math.abs(d.totalAmount - amt) < 0.05);
                  return { date: parts[0], desc: parts[1], amount: amt, match };
                }));
              }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs">Cruzar com Faturas</button>
            </div>
            {matchedTransactions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4">
                <h3 className="text-xs font-bold text-white uppercase mb-3">Movimentos Conciliados</h3>
                <div className="space-y-2">
                  {matchedTransactions.map((tx, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div><div className="font-semibold text-white">{tx.desc}</div><div className="text-slate-500 font-mono">{tx.date} • {tx.amount.toFixed(2)} €</div></div>
                      <div>{tx.match ? <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">✅ {tx.match.supplierName} ({tx.match.docNumber})</span> : <span className="text-slate-500 italic">Sem fatura correspondente</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 5. LOTES SEPA ================= */}
        {activeTab === 'sepa' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Download className="w-5 h-5 text-emerald-400" /> Emissão de Lotes SEPA (pain.001)</h2>
                <button onClick={handleDownloadSepa} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg">Descarregar SEPA XML</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div><label className="text-[11px] font-semibold text-slate-400 uppercase">Empresa Ordenante</label><input type="text" value={debtorName} onChange={(e) => setDebtorName(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <div><label className="text-[11px] font-semibold text-slate-400 uppercase">IBAN Ordenante</label><input type="text" value={debtorIban} onChange={(e) => setDebtorIban(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none" /></div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. AUTOMAÇÕES ================= */}
        {activeTab === 'automations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Server className="w-4 h-4 text-emerald-400" /> Webhook para Robô de Email</h3>
              <p className="text-xs text-slate-300">Endpoint para reencaminhar faturas recebidas por email com anexos PDF:</p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 break-all">POST https://api-docflow.profihotel.pt/api/documents</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Server className="w-4 h-4 text-blue-400" /> Pasta do Scanner (Windows Hotfolder)</h3>
              <p className="text-xs text-slate-300">Pasta monitorizada no computador de escritório para envio automático:</p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-blue-400">C:\Users\Rui Medalha\Scans_DocFlow</div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Visor da Câmara */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4 sm:p-6">
          <div className="w-full max-w-lg flex items-center justify-between text-white py-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Câmara Ativa</span>
            <button onClick={stopCamera} className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          <div className="relative w-full max-w-lg flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 my-2">
            <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-emerald-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] text-emerald-400/80 bg-black/50 px-3 py-1 rounded-full uppercase font-mono">Enquadre o Documento ou QR Code</span>
            </div>
          </div>
          <div className="w-full max-w-lg flex items-center justify-around py-4">
            <button onClick={() => { const n = cameraFacing === 'environment' ? 'user' : 'environment'; setCameraFacing(n); startCamera(n); }} className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"><SwitchCamera className="w-6 h-6" /></button>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-2xl flex items-center justify-center text-white"><Camera className="w-8 h-8" /></button>
            <button onClick={() => { stopCamera(); fileInputRef.current?.click(); }} className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"><Upload className="w-6 h-6" /></button>
          </div>
        </div>
      )}

      {/* Modal Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm"><FolderPlus className="w-5 h-5" /> Criar Nova Pasta</div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-slate-400 uppercase">Nome da Pasta</label><input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none" /></div>
              <div><label className="text-[11px] font-semibold text-slate-400 uppercase">Descrição</label><input type="text" value={newFolderDesc} onChange={(e) => setNewFolderDesc(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none" /></div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowNewFolderModal(false)} className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleCreateFolder} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
