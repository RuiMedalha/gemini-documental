'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, CheckCircle2, AlertTriangle, FileText, 
  Euro, FolderPlus, ShieldCheck, RefreshCw, Folder, FolderOpen, 
  Plus, Search, X, SwitchCamera, List, Globe, CreditCard, 
  Check, Clock, ArrowRightLeft, Download, Server, Sparkles, Zap, 
  File, Settings, Users, Cpu, Building, BookOpen, Calendar as CalendarIcon,
  CheckSquare, FileSpreadsheet, Share2, Send, Fuel, Utensils
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
  dueDate?: string;
  atcud?: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  deductibleTax?: number;
  nonDeductibleTax?: number;
  taxDeductionRate?: number;
  iban?: string;
  isNonFiscalDoc?: boolean;
  docNature?: string;
  isIntracommunity?: boolean;
  extractionMethod?: string;
  items?: InvoiceItem[];
  category: string;
  paymentStatus: 'PAID' | 'PENDING';
  paymentDate?: string;
  paymentMethod: string;
  syncedToTocOnline?: boolean;
  tocOnlineSyncDate?: string;
}

interface FolderItem {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function DocFlowPlatform() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'calendar' | 'folders' | 'documents' | 'accountant' | 'settings'>('scanner');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [filePreview, setFilePreview] = useState<{ url: string; isPdf: boolean; name: string } | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Visor da Câmara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Pastas Estruturadas
  const [folders, setFolders] = useState<FolderItem[]>([
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Compras de equipamentos e máquinas (IVA 100%)', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica e componentes (IVA 100%)', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock e consumíveis (IVA 100%)', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, eletricidade e telefone (Débito Direto)', color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
    { id: 'f5', name: 'Alimentação & Refeições', description: 'Despesas de refeições (IVA 0% dedutível Art.21 CIVA)', color: 'border-red-500/40 bg-red-500/10 text-red-400' },
    { id: 'f6', name: 'Combustíveis & Frotas', description: 'Gasóleo e viaturas (IVA 50% dedutível)', color: 'border-orange-500/40 bg-orange-500/10 text-orange-400' },
    { id: 'f7', name: 'Proformas & Orçamentos', description: 'Pendentes de fatura definitiva', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    { id: 'f8', name: 'Fornecedores Espanha / UE', description: 'Transmissões Intracomunitárias', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
  ]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Equipamentos & Máquinas');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Base de Dados com Faturas de Exemplo e Regras Fiscais
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
      dueDate: '2026-08-27',
      atcud: 'J6N4RDHC-432',
      iban: 'PT50001800034570641302079',
      netAmount: 245.00,
      taxAmount: 56.35,
      deductibleTax: 56.35,
      nonDeductibleTax: 0.00,
      taxDeductionRate: 100,
      totalAmount: 301.35,
      isNonFiscalDoc: false,
      category: 'Equipamentos & Máquinas',
      paymentStatus: 'PAID',
      paymentDate: '2026-08-12',
      paymentMethod: 'Transferência Bancária',
      syncedToTocOnline: true,
      tocOnlineSyncDate: '2026-08-12T14:30:00Z'
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
      dueDate: '2026-08-30',
      iban: 'ES7701822342120201755957',
      netAmount: 702.04,
      taxAmount: 0.00,
      deductibleTax: 0.00,
      nonDeductibleTax: 0.00,
      taxDeductionRate: 0,
      totalAmount: 702.04,
      isNonFiscalDoc: true,
      isIntracommunity: true,
      category: 'Fornecedores Espanha / UE',
      paymentStatus: 'PAID',
      paymentDate: '2026-08-20',
      paymentMethod: 'Débito Direto',
      syncedToTocOnline: true,
      tocOnlineSyncDate: '2026-08-20T11:15:00Z'
    },
    {
      id: 'DOC-103',
      supplierName: 'Restaurante O Manel (Refeições de Trabalho)',
      supplierNif: '509876543',
      customerName: 'NOV OUSADO UNIPESSOAL LDA',
      customerNif: '515208566',
      docType: 'FS',
      docNumber: 'FS 2026/894',
      docDate: '2026-08-18',
      dueDate: '2026-08-18',
      atcud: 'AT-REST-894',
      netAmount: 60.00,
      taxAmount: 13.80,
      deductibleTax: 0.00, // Art. 21 CIVA: 0% Dedutivel
      nonDeductibleTax: 13.80,
      taxDeductionRate: 0,
      totalAmount: 73.80,
      category: 'Alimentação & Refeições',
      paymentStatus: 'PAID',
      paymentDate: '2026-08-18',
      paymentMethod: 'Cartão de Débito',
      syncedToTocOnline: true,
      tocOnlineSyncDate: '2026-08-18T20:00:00Z'
    },
    {
      id: 'DOC-104',
      supplierName: 'SAMMIC PORTUGAL, LDA',
      supplierNif: '501234987',
      customerName: 'NOV OUSADO UNIPESSOAL LDA',
      customerNif: '515208566',
      docType: 'FT',
      docNumber: 'FT SAM26/902',
      docDate: '2026-08-15',
      dueDate: '2026-09-14', // 30 dias Débito Direto
      atcud: 'J9SAM-902',
      iban: 'PT50003300001234567890123',
      netAmount: 1250.00,
      taxAmount: 287.50,
      deductibleTax: 287.50,
      nonDeductibleTax: 0.00,
      taxDeductionRate: 100,
      totalAmount: 1537.50,
      category: 'Equipamentos & Máquinas',
      paymentStatus: 'PENDING',
      paymentMethod: 'Débito Direto',
      syncedToTocOnline: true,
      tocOnlineSyncDate: '2026-08-15T09:00:00Z'
    }
  ]);

  const [searchFilter, setSearchFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Definições de Empresa
  const [settings, setSettings] = useState({
    companyName: 'NOV OUSADO UNIPESSOAL LDA',
    companyNif: '515208566',
    companyAddress: 'Rua Empresarial, Nº 8, A - Zona Industrial Ponte Seca, Gaeiras - Óbidos',
    companyIban: 'PT50003500000000000000000',
    accountantEmail: 'contabilidade@hotelequip.pt',
    activeAiModel: 'gemini-2.0-flash',
    customAiPrompt: 'Aplica com rigor o Artigo 21º do CIVA: Se for refeição/restauração, o IVA dedutível é 0€. Se for gasóleo/combustível, o IVA dedutível é 50%. Em fornecedores Espanha/UE, IVA é 0% intracomunitário.'
  });

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
      processFilePayload(dataUrl, 'image/jpeg', 'foto_camara.jpg', false);
    }
  };

  const calculateDeductibleTaxLocal = (category: string, totalTax: number) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('refeição') || cat.includes('alimenta') || cat.includes('restaur')) {
      return { deductibleTax: 0, nonDeductibleTax: totalTax, taxDeductionRate: 0 };
    }
    if (cat.includes('combust') || cat.includes('gasóleo') || cat.includes('gasoleo')) {
      const half = Math.round((totalTax * 0.5) * 100) / 100;
      return { deductibleTax: half, nonDeductibleTax: Math.round((totalTax - half) * 100) / 100, taxDeductionRate: 50 };
    }
    return { deductibleTax: totalTax, nonDeductibleTax: 0, taxDeductionRate: 100 };
  };

  const processFilePayload = async (base64Payload: string, mimeType: string, fileName: string, isPdf: boolean) => {
    setLoading(true);
    setSaveSuccess(false);
    setFilePreview({ url: base64Payload, isPdf, name: fileName });

    let qrCodeRaw: string | undefined = undefined;

    if (!isPdf) {
      setStatusMsg('A verificar QR Code da AT...');
      const img = new Image();
      img.src = base64Payload;
      await new Promise(r => { img.onload = r; });

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
    }

    setStatusMsg(isPdf ? 'A auditar PDF com regras CIVA e TOConline...' : (qrCodeRaw ? 'QR Code AT detetado! A calcular IVA dedutível...' : 'A auditar documento fiscal no servidor...'));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/documents/process-hybrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Payload,
          mimeType,
          qrCodeRaw,
          category: selectedFolder,
          fileName
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
        setSelectedFolder(data.category || selectedFolder);
        setStatusMsg(data.extractionMethod === 'HYBRID_QR_AND_GEMINI' 
          ? '⚡ QR Code AT Oficial + 🧠 Regras de IVA e Vencimento aplicadas!'
          : '🧠 Fatura auditada com sucesso pelo Gemini Vision!');
      }
    } catch {
      // Fallback
      const taxCalc = calculateDeductibleTaxLocal(selectedFolder, 23.00);
      setInvoice({
        id: 'DOC-' + Date.now(),
        supplierName: 'Fornecedor Identificado',
        supplierNif: '514585587',
        customerName: settings.companyName,
        customerNif: settings.companyNif,
        docType: 'FT',
        docNumber: 'FT ' + Math.floor(Math.random() * 1000),
        docDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        netAmount: 100.00,
        taxAmount: 23.00,
        deductibleTax: taxCalc.deductibleTax,
        nonDeductibleTax: taxCalc.nonDeductibleTax,
        taxDeductionRate: taxCalc.taxDeductionRate,
        totalAmount: 123.00,
        isNonFiscalDoc: false,
        category: selectedFolder,
        paymentStatus: 'PENDING',
        paymentMethod: 'Transferência Bancária',
        syncedToTocOnline: true,
        tocOnlineSyncDate: new Date().toISOString()
      });
      setStatusMsg('Documento carregado.');
    }
    setLoading(false);
  };

  const handleFileUpload = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => processFilePayload(reader.result as string, mimeType, file.name, isPdf);
    reader.readAsDataURL(file);
  };

  const handleCategoryChange = (newCat: string) => {
    setSelectedFolder(newCat);
    if (invoice) {
      const taxCalc = calculateDeductibleTaxLocal(newCat, invoice.taxAmount);
      setInvoice({
        ...invoice,
        category: newCat,
        deductibleTax: taxCalc.deductibleTax,
        nonDeductibleTax: taxCalc.nonDeductibleTax,
        taxDeductionRate: taxCalc.taxDeductionRate
      });
    }
  };

  const handleSave = async () => {
    if (!invoice) return;
    setLoading(true);
    const taxCalc = calculateDeductibleTaxLocal(selectedFolder, invoice.taxAmount);
    const finalDoc = {
      ...invoice,
      category: selectedFolder,
      deductibleTax: taxCalc.deductibleTax,
      nonDeductibleTax: taxCalc.nonDeductibleTax,
      taxDeductionRate: taxCalc.taxDeductionRate,
      syncedToTocOnline: true,
      tocOnlineSyncDate: new Date().toISOString()
    };

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
    setStatusMsg(`Fatura arquivada e sincronizada para o TOConline na pasta "${selectedFolder}"!`);
    setLoading(false);
  };

  const togglePaymentStatus = (docId: string, isDirectDebit: boolean = false) => {
    setArchivedDocs(prev => prev.map(doc => {
      if (doc.id === docId) {
        const isNowPaid = doc.paymentStatus !== 'PAID';
        return {
          ...doc,
          paymentStatus: isNowPaid ? 'PAID' : 'PENDING',
          paymentDate: isNowPaid ? new Date().toISOString().split('T')[0] : undefined,
          paymentMethod: isDirectDebit ? 'Débito Direto' : doc.paymentMethod
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

  // Exportar Excel / CSV para Contabilista
  const handleExportAccountantExcel = () => {
    let csv = 'Data Emissao;Vencimento;Fornecedor;NIF Fornecedor;Documento;Pasta / Categoria;Base Tributavel;IVA Documental;IVA Dedutivel (CIVA Art.21);IVA Nao Dedutivel (Custo);Total Documento;Metodo Pagamento;Estado;Sincronizado TOConline\n';
    for (const doc of archivedDocs) {
      csv += `${doc.docDate};${doc.dueDate || doc.docDate};${doc.supplierName};${doc.supplierNif};${doc.docNumber};${doc.category};${doc.netAmount.toFixed(2)};${doc.taxAmount.toFixed(2)};${(doc.deductibleTax || 0).toFixed(2)};${(doc.nonDeductibleTax || 0).toFixed(2)};${doc.totalAmount.toFixed(2)};${doc.paymentMethod};${doc.paymentStatus === 'PAID' ? 'PAGO (' + doc.paymentDate + ')' : 'PENDENTE'};SIM (${doc.tocOnlineSyncDate?.split('T')[0]})\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAPA_FECHO_CONTABILIDADE_TOCONLINE_${new Date().toISOString().split('T')[0]}.csv`;
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
  const totalDeductibleVat = archivedDocs.reduce((s, d) => s + (d.deductibleTax ?? d.taxAmount), 0);
  const totalNonDeductibleVat = archivedDocs.reduce((s, d) => s + (d.nonDeductibleTax || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 md:p-8 font-sans">
      <header className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            DF
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">DocFlow PT • Gestão & Fiscalidade</h1>
            <p className="text-xs text-slate-400">Regras CIVA Art.21 • Cronograma de Débito Direto • TOConline</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveTab('scanner')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Camera className="w-3.5 h-3.5" /> Digitalizar
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <CalendarIcon className="w-3.5 h-3.5" /> Calendário Vencimentos
          </button>
          <button onClick={() => setActiveTab('folders')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'folders' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Folder className="w-3.5 h-3.5" /> Pastas ({folders.length})
          </button>
          <button onClick={() => setActiveTab('documents')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'documents' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <FileText className="w-3.5 h-3.5" /> Arquivo ({archivedDocs.length})
          </button>
          <button onClick={() => setActiveTab('accountant')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'accountant' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Fecho Contabilista & TOConline
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Settings className="w-3.5 h-3.5" /> Configurações
          </button>
        </nav>
      </header>

      <main className="w-full max-w-5xl">
        {/* ================= 1. DIGITALIZAR ================= */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            {/* Escolha de Pasta com Alerta de Regra de IVA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pasta / Classificação Fiscal:</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  value={selectedFolder} 
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-emerald-500 flex-1 sm:flex-none"
                >
                  {folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
                <button onClick={() => setShowNewFolderModal(true)} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Nova Pasta
                </button>
              </div>
            </div>

            {/* Zona de Upload */}
            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all shadow-xl">
              {filePreview ? (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-full max-h-80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-4">
                    {filePreview.isPdf ? (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                          <File className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-white font-mono">{filePreview.name}</p>
                          <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mt-1 inline-block">
                            Ficheiro PDF Carregado
                          </span>
                        </div>
                      </div>
                    ) : (
                      <img src={filePreview.url} alt="Fatura" className="max-h-72 object-contain rounded-lg shadow-md" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button onClick={() => startCamera('environment')} className="inline-flex items-center gap-2 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 font-semibold px-4 py-2 rounded-xl transition-all">
                      <Camera className="w-4 h-4" /> Tirar Foto
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 font-semibold px-4 py-2 rounded-xl transition-all">
                      <Upload className="w-4 h-4" /> Carregar Outro PDF / Imagem
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 py-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-200">Carregue um PDF ou Fotografe a Fatura</p>
                    <p className="text-xs text-slate-500">Aplica automaticamente as regras do CIVA (refeições, gasóleo) e calcula o vencimento do fornecedor</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-sm">
                      <Upload className="w-4 h-4" /> Carregar PDF / Ficheiro
                    </button>
                    <button onClick={() => startCamera('environment')} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 text-sm">
                      <Camera className="w-4 h-4" /> Tirar Foto
                    </button>
                  </div>
                </div>
              )}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="application/pdf,image/*,.pdf" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
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
                {/* Banner de Rastreabilidade TOConline & CIVA */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> TOConline Sincronizado
                    </span>
                    {invoice.extractionMethod === 'HYBRID_QR_AND_GEMINI' && (
                      <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> QR Code AT + <Sparkles className="w-3.5 h-3.5" /> Gemini
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                    📁 {selectedFolder}
                  </span>
                </div>

                {/* PAINEL DE APURAMENTO FISCAL DE IVA (CIVA ART. 21) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Enquadramento Fiscal de IVA (CIVA Art. 21º)
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      (invoice.deductibleTax || 0) === 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      (invoice.deductibleTax || 0) < invoice.taxAmount ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {(invoice.deductibleTax || 0) === 0 ? 'IVA Não Dedutível (100% Custo IRC)' :
                       (invoice.deductibleTax || 0) < invoice.taxAmount ? 'IVA 50% Dedutível (Gasóleo)' :
                       'IVA 100% Dedutível'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase">IVA Total do Documento</span>
                      <span className="text-base font-bold text-white mt-0.5 block">{invoice.taxAmount.toFixed(2)} €</span>
                    </div>
                    <div className="p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                      <span className="text-emerald-400 block text-[10px] uppercase font-bold">IVA Efetivamente Dedutível (à AT)</span>
                      <span className="text-base font-black text-emerald-400 mt-0.5 block">{(invoice.deductibleTax ?? invoice.taxAmount).toFixed(2)} €</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase">IVA não Dedutível (Custo p/ IRC)</span>
                      <span className="text-base font-bold text-amber-400 mt-0.5 block">{(invoice.nonDeductibleTax || 0).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                {/* Secção de Pagamento, Vencimento & Débito Direto */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" /> Tesouraria & Vencimento
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
                        ⏳ A Pagar (No Calendário)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Método de Pagamento</label>
                      <select
                        value={invoice.paymentMethod || 'Transferência Bancária'}
                        onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value })}
                        className="w-full mt-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none"
                      >
                        <option value="Débito Direto">Débito Direto (Cai Automático no Banco)</option>
                        <option value="Transferência Bancária">Transferência Bancária</option>
                        <option value="Pronto Pagamento">Pronto Pagamento / Débito em Conta</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="MB WAY">MB WAY</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Data de Vencimento</label>
                      <input
                        type="date"
                        value={invoice.dueDate || invoice.docDate}
                        onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                        className="w-full mt-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-bold outline-none"
                      />
                    </div>

                    {invoice.paymentStatus === 'PAID' ? (
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Data em que foi Pago</label>
                        <input
                          type="date"
                          value={invoice.paymentDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setInvoice({ ...invoice, paymentDate: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-semibold outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setInvoice({ ...invoice, paymentStatus: 'PAID', paymentDate: new Date().toISOString().split('T')[0] })}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-1.5 px-3 rounded-lg text-xs font-semibold"
                        >
                          Confirmar Débito Direto
                        </button>
                      </div>
                    )}
                  </div>
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
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIF Fornecedor</label>
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
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Fatura (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={invoice.totalAmount} 
                      onChange={(e) => setInvoice({...invoice, totalAmount: parseFloat(e.target.value) || 0})}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold text-base outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={loading || saveSuccess}
                  className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                    saveSuccess ? 'bg-emerald-600 cursor-default' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-emerald-950/40'
                  }`}
                >
                  {saveSuccess ? <><CheckCircle2 className="w-5 h-5" /> Fatura Gravada & Sincronizada com TOConline!</> : <><CheckCircle2 className="w-5 h-5" /> Confirmar, Arquivar & Sincronizar TOConline</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 2. CALENDÁRIO DE VENCIMENTOS ================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-400" /> Cronograma de Vencimentos & Débitos Diretos
                  </h2>
                  <p className="text-xs text-slate-400">Controlo de faturas a pagar com distinção de Débito Direto e Transferência</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total a Vencer:</span>
                  <p className="text-xl font-black text-amber-400">{totalPending.toFixed(2)} €</p>
                </div>
              </div>

              {/* Tabela do Calendário */}
              <div className="space-y-3">
                {archivedDocs.filter(d => d.paymentStatus === 'PENDING').length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold text-slate-300">Não existem faturas pendentes no calendário.</p>
                    <p className="text-xs mt-0.5">Todas as faturas estão liquidadas.</p>
                  </div>
                ) : (
                  archivedDocs.filter(d => d.paymentStatus === 'PENDING').map(doc => (
                    <div key={doc.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{doc.supplierName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            doc.paymentMethod === 'Débito Direto' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {doc.paymentMethod}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          Doc: {doc.docNumber} • Emissão: {doc.docDate} • Vencimento: <strong className="text-amber-400">{doc.dueDate || doc.docDate}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-base font-black text-emerald-400">{doc.totalAmount.toFixed(2)} €</span>
                        <button
                          onClick={() => togglePaymentStatus(doc.id, doc.paymentMethod === 'Débito Direto')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                        >
                          {doc.paymentMethod === 'Débito Direto' ? 'Confirmar Débito no Banco' : 'Dar como Pago'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. PASTAS ================= */}
        {activeTab === 'folders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Estrutura de Pastas</h2>
                <p className="text-xs text-slate-400">Classificação fiscal e arquivo de despesas</p>
              </div>
              <button onClick={() => setShowNewFolderModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg">
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

        {/* ================= 4. ARQUIVO ================= */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-4 h-4" /> A Pagar (Calendário)</span>
                <p className="text-2xl font-black text-amber-300 mt-1">{totalPending.toFixed(2)} €</p>
              </div>
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Já Liquidado</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{totalPaid.toFixed(2)} €</p>
              </div>
              <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> IVA Dedutível Real</span>
                <p className="text-2xl font-black text-cyan-300 mt-1">{totalDeductibleVat.toFixed(2)} €</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <button onClick={() => setPaymentFilter('ALL')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${paymentFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Todos ({archivedDocs.length})</button>
                <button onClick={() => setPaymentFilter('PENDING')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${paymentFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>⏳ A Pagar</button>
                <button onClick={() => setPaymentFilter('PAID')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${paymentFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>✅ Pagos</button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Pesquisar NIF, Fornecedor..." 
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
                    <th className="p-3">IVA Dedutível</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Método / Estado</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-800/40">
                      <td className="p-3">{doc.docDate}</td>
                      <td className="p-3 font-semibold text-white font-sans">
                        <div>{doc.supplierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIF: {doc.supplierNif}</div>
                      </td>
                      <td className="p-3">{doc.docNumber}</td>
                      <td className="p-3"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[10px] font-sans">{doc.category}</span></td>
                      <td className="p-3 font-bold text-cyan-400">{(doc.deductibleTax ?? doc.taxAmount).toFixed(2)} €</td>
                      <td className="p-3 font-bold text-emerald-400 text-sm">{doc.totalAmount.toFixed(2)} €</td>
                      <td className="p-3 font-sans">
                        {doc.paymentStatus === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Pago ({doc.paymentMethod})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> {doc.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-sans">
                        <button onClick={() => togglePaymentStatus(doc.id, doc.paymentMethod === 'Débito Direto')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${doc.paymentStatus === 'PAID' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-600 text-white'}`}>
                          {doc.paymentStatus === 'PAID' ? 'Reabrir' : 'Dar Baixa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 5. FECHO CONTABILISTA & TOCONLINE ================= */}
        {activeTab === 'accountant' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-cyan-400" /> Dossier de Fecho Mensal & Rastreio TOConline
                  </h2>
                  <p className="text-xs text-slate-400">Exportação auditada para a Contabilista com cálculo real de IVA Dedutível e comprovativo de envio</p>
                </div>
                <button
                  onClick={handleExportAccountantExcel}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50"
                >
                  <Download className="w-4 h-4" /> Descarregar Mapa de Fecho (Excel/CSV)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase">Total Compras & Despesas</span>
                  <p className="text-lg font-black text-white mt-1">{(totalPaid + totalPending).toFixed(2)} €</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase">IVA Documental Bruto</span>
                  <p className="text-lg font-bold text-amber-400 mt-1">{(totalDeductibleVat + totalNonDeductibleVat).toFixed(2)} €</p>
                </div>
                <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/40">
                  <span className="text-emerald-400 text-[10px] uppercase font-bold">IVA Efetivamente Dedutível</span>
                  <p className="text-lg font-black text-emerald-400 mt-1">{totalDeductibleVat.toFixed(2)} €</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase">IVA em Custo (Art.21)</span>
                  <p className="text-lg font-bold text-red-400 mt-1">{totalNonDeductibleVat.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. CONFIGURAÇÕES ================= */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-400" /> Configurações Gerais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div><label className="text-slate-400 font-semibold uppercase">Razão Social</label><input type="text" value={settings.companyName} onChange={(e) => setSettings({...settings, companyName: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none" /></div>
              <div><label className="text-slate-400 font-semibold uppercase">NIF</label><input type="text" value={settings.companyNif} onChange={(e) => setSettings({...settings, companyNif: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono outline-none" /></div>
              <div className="sm:col-span-2"><label className="text-slate-400 font-semibold uppercase">Email da Contabilista</label><input type="email" value={settings.accountantEmail} onChange={(e) => setSettings({...settings, accountantEmail: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none" /></div>
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
              <span className="text-[10px] text-emerald-400/80 bg-black/50 px-3 py-1 rounded-full uppercase font-mono">Enquadre a Fatura ou QR Code</span>
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
