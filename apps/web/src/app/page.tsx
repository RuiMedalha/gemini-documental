'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, CheckCircle2, AlertTriangle, FileText, 
  FolderPlus, ShieldCheck, RefreshCw, Folder, FolderOpen, 
  Plus, Search, X, SwitchCamera, List, CreditCard, 
  Check, Clock, Download, Server, Sparkles, Zap, 
  File, Settings, Building, Calendar as CalendarIcon,
  FileSpreadsheet, Send, Edit3, Trash2, BookmarkPlus, 
  Menu, LogOut, Activity, Landmark, Link2, CheckCircle, Globe
} from 'lucide-react';
import jsQR from 'jsqr';

interface SupplierRule {
  id: string; name: string; nif: string; country: 'PT' | 'ES' | 'UE' | 'INT';
  paymentMethod: string; daysToDue: number; defaultCategory: string;
  sncAccount: string; taxDeductionRate: number; defaultIban?: string; notes?: string;
}

interface InvoiceItem {
  code?: string; description: string; quantity: number;
  unitPrice: number; discount?: number; taxRate?: number; total: number;
}

interface InvoiceData {
  id: string; supplierName: string; supplierNif: string;
  customerName?: string; customerNif?: string; docType: string;
  docNumber: string; docDate: string; dueDate?: string; atcud?: string;
  netAmount: number; taxAmount: number; totalAmount: number;
  deductibleTax?: number; nonDeductibleTax?: number; taxDeductionRate?: number;
  sncAccount?: string; iban?: string; isNonFiscalDoc?: boolean; docNature?: string;
  isIntracommunity?: boolean; extractionMethod?: string; category: string;
  paymentStatus: 'PAID' | 'PENDING'; paymentDate?: string; paymentMethod: string;
  ruleApplied?: string; syncedToTocOnline?: boolean; tocOnlineSyncDate?: string;
  items?: InvoiceItem[];
}

interface FolderItem { id: string; name: string; description: string; color: string; }

export default function DocFlowSaaS() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'calendar' | 'suppliers' | 'folders' | 'documents' | 'accountant' | 'settings'>('scanner');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filePreview, setFilePreview] = useState<{ url: string; isPdf: boolean; name: string } | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Visor da Câmara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // URL da API Dinâmico
  const [apiUrlInput, setApiUrlInput] = useState('http://a6d42emz9pwspal002chra7b.167.86.111.8.sslip.io');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('DOCFLOW_API_URL');
    if (saved) setApiUrlInput(saved);
  }, []);

  const getActiveApiUrl = () => {
    return apiUrlInput.replace(/\/+$/, '');
  };

  // Base de Dados de Fornecedores & Regras
  const [suppliers, setSuppliers] = useState<SupplierRule[]>([
    { id: 'sup-1', name: 'AMÉRICO ALVES - COMÉRCIO INTERNACIONAL, SA (INTEROTEL)', nif: '506144860', country: 'PT', paymentMethod: 'Pronto Pagamento', daysToDue: 0, defaultCategory: 'Equipamentos & Máquinas', sncAccount: 'SNC 611 - Mercadorias / Utensílios', taxDeductionRate: 100, notes: 'Faturas-recibo a pronto pagamento.' },
    { id: 'sup-2', name: 'TEFCOLD ES, S.L. (CLIMAHOSTELERIA)', nif: 'ESB09802059', country: 'ES', paymentMethod: 'Débito Direto', daysToDue: 10, defaultCategory: 'Fornecedores Espanha / UE', sncAccount: 'SNC 611/62 - Aquisições Intracomunitárias', taxDeductionRate: 0, defaultIban: 'ES7701822342120201755957', notes: 'Débito direto 8-10 dias. IVA 0%.' },
    { id: 'sup-3', name: 'SAMMIC PORTUGAL, LDA', nif: '501234987', country: 'PT', paymentMethod: 'Débito Direto', daysToDue: 30, defaultCategory: 'Equipamentos & Máquinas', sncAccount: 'SNC 43 - Ativos Fixos Tangíveis', taxDeductionRate: 100, notes: 'Débito direto a 30 dias.' },
    { id: 'sup-4', name: 'NOTABLE DEDICATION UNIPESSOAL LDA', nif: '514585587', country: 'PT', paymentMethod: 'Transferência Bancária', daysToDue: 30, defaultCategory: 'Manutenção & Peças', sncAccount: 'SNC 6222 - Conservação e Reparação', taxDeductionRate: 100, defaultIban: 'PT50001800034570641302079' }
  ]);

  const [folders, setFolders] = useState<FolderItem[]>([
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'SNC 43 / SNC 611 - IVA 100%', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'SNC 6222 - IVA 100%', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'SNC 611 - IVA 100%', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'SNC 6221/6226 (Débito Direto)', color: 'purple' },
    { id: 'f5', name: 'Alimentação & Refeições', description: 'SNC 6251 (IVA 0% Art.21 CIVA)', color: 'red' },
    { id: 'f6', name: 'Combustíveis & Frotas', description: 'SNC 6242 (IVA 50% Dedutível)', color: 'orange' },
    { id: 'f7', name: 'Fornecedores Espanha / UE', description: 'SNC 611/62 (IVA 0% Intracomunitário)', color: 'cyan' },
  ]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Equipamentos & Máquinas');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  const [archivedDocs, setArchivedDocs] = useState<InvoiceData[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Definições Gerais & TOConline
  const [settings, setSettings] = useState({
    companyName: 'NOV OUSADO UNIPESSOAL LDA',
    companyNif: '515208566',
    companyAddress: 'Rua Empresarial, Nº 8, A - Zona Industrial Ponte Seca, Gaeiras - Óbidos',
    companyIban: 'PT50003500000000000000000',
    accountantEmail: 'contabilidade@hotelequip.pt',
    tocOnlineApiKey: '',
    tocOnlineCompanyId: '515208566',
    tocOnlineAutoSync: true
  });
  const [tocTestResult, setTocTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    try {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      mediaStreamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { setIsCameraOpen(false); fileInputRef.current?.click(); }
  };
  const stopCamera = () => {
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    setIsCameraOpen(false);
  };
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280; canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); const dataUrl = canvas.toDataURL('image/jpeg', 0.95); stopCamera(); processFilePayload(dataUrl, 'image/jpeg', 'foto_camara.jpg', false); }
  };

  const processFilePayload = async (base64Payload: string, mimeType: string, fileName: string, isPdf: boolean) => {
    setLoading(true); setSaveSuccess(false); setErrorMessage(''); setFilePreview({ url: base64Payload, isPdf, name: fileName });
    let qrCodeRaw: string | undefined = undefined;

    if (!isPdf) {
      setStatusMsg('A verificar QR Code da AT na imagem...');
      const img = new Image(); img.src = base64Payload; await new Promise(r => { img.onload = r; });
      const scales = [1, 0.75, 0.5];
      for (const scale of scales) {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data && code.data.includes('*')) { qrCodeRaw = code.data; break; }
        }
      }
    }

    const currentApi = getActiveApiUrl();
    setStatusMsg(`A enviar documento para o servidor (${currentApi})...`);

    try {
      const response = await fetch(`${currentApi}/api/documents/process-hybrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Payload, mimeType, qrCodeRaw, category: selectedFolder, fileName })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }

      const data = await response.json();
      setInvoice(data);
      setSelectedFolder(data.category || selectedFolder);
      setStatusMsg(data.ruleApplied ? `⚡ ${data.ruleApplied}` : 'Fatura auditada e classificada com sucesso!');
    } catch (err: any) {
      setErrorMessage(`Erro de ligação à API: ${err.message}. Verifique o URL da API no separador Configurações.`);
      setStatusMsg('');
    }
    setLoading(false);
  };

  const handleFileUpload = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
    const reader = new FileReader(); reader.onload = () => processFilePayload(reader.result as string, mimeType, file.name, isPdf); reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!invoice) return;
    setLoading(true);
    const finalDoc = { ...invoice, category: selectedFolder, syncedToTocOnline: true, tocOnlineSyncDate: new Date().toISOString() };
    setArchivedDocs(prev => [finalDoc, ...prev.filter(d => d.id !== finalDoc.id)]);
    try {
      await fetch(`${getActiveApiUrl()}/api/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalDoc) });
    } catch {}
    setSaveSuccess(true); setStatusMsg(`Fatura arquivada e sincronizada com o TOConline!`); setLoading(false);
  };

  const togglePaymentStatus = (docId: string, isDirectDebit: boolean = false) => {
    setArchivedDocs(prev => prev.map(doc => {
      if (doc.id === docId) {
        const isNowPaid = doc.paymentStatus !== 'PAID';
        return { ...doc, paymentStatus: isNowPaid ? 'PAID' : 'PENDING', paymentDate: isNowPaid ? new Date().toISOString().split('T')[0] : undefined, paymentMethod: isDirectDebit ? 'Débito Direto' : doc.paymentMethod };
      }
      return doc;
    }));
  };

  const handleTestApiUrl = async () => {
    try {
      const res = await fetch(`${getActiveApiUrl()}/api/health`);
      if (res.ok) {
        setApiConnected(true);
        localStorage.setItem('DOCFLOW_API_URL', apiUrlInput);
        alert('✔ Ligação à API estabelecida com sucesso!');
      } else {
        setApiConnected(false);
        alert('❌ A API respondeu com erro.');
      }
    } catch {
      setApiConnected(false);
      alert('❌ Não foi possível alcançar o servidor da API. Verifique o link.');
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newF: FolderItem = { id: 'f-' + Date.now(), name: newFolderName.trim(), description: newFolderDesc.trim() || 'Pasta', color: 'emerald' };
    setFolders(prev => [...prev, newF]); setSelectedFolder(newF.name); setNewFolderName(''); setNewFolderDesc(''); setShowNewFolderModal(false);
  };

  const filteredDocs = archivedDocs.filter(d => {
    const match = d.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) || d.supplierNif.includes(searchFilter) || d.docNumber.toLowerCase().includes(searchFilter.toLowerCase());
    if (paymentFilter === 'PENDING') return match && d.paymentStatus === 'PENDING';
    if (paymentFilter === 'PAID') return match && d.paymentStatus === 'PAID';
    return match;
  });

  const totalPending = archivedDocs.filter(d => d.paymentStatus === 'PENDING').reduce((s,d)=>s+d.totalAmount,0);
  const totalPaid = archivedDocs.filter(d => d.paymentStatus === 'PAID').reduce((s,d)=>s+d.totalAmount,0);
  const totalDeductibleVat = archivedDocs.reduce((s,d)=>s+(d.deductibleTax??d.taxAmount),0);

  const NavItem = ({ id, icon: Icon, label, badge }: any) => {
    const isActive = activeTab === id;
    return (
      <button onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
        <div className="flex items-center gap-3 font-medium text-sm">
          <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {label}
        </div>
        {badge !== undefined && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{badge}</span>}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-slate-800/60 bg-[#0B0F19]/80 backdrop-blur-xl relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">DF</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">DocFlow PT</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">SNC & TOConline</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-2">Operação</div>
          <NavItem id="scanner" icon={Camera} label="Digitalizar / Upload" />
          <NavItem id="calendar" icon={CalendarIcon} label="Tesouraria & Vencimentos" badge={archivedDocs.filter(d=>d.paymentStatus==='PENDING').length} />
          
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-2">Gestão & Arquivo</div>
          <NavItem id="documents" icon={FileText} label="Arquivo Digital" badge={archivedDocs.length} />
          <NavItem id="folders" icon={Folder} label="Pastas" badge={folders.length} />
          <NavItem id="suppliers" icon={Building} label="Fornecedores & Regras" badge={suppliers.length} />
          
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-2">Contabilidade</div>
          <NavItem id="accountant" icon={FileSpreadsheet} label="TOConline & Fecho" />
          <NavItem id="settings" icon={Settings} label="Configurações & API" />
        </div>

        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">RM</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Rui Medalha</p>
              <p className="text-[10px] text-slate-400 truncate">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden absolute top-0 left-0 right-0 h-16 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/60 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">DF</div>
          <span className="font-bold text-sm">DocFlow PT</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-slate-800 rounded-lg text-slate-300">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0 pb-20 md:pb-0 scroll-smooth">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="p-4 md:p-8 max-w-6xl mx-auto relative z-10 min-h-full">
          
          {/* ================= 1. DIGITALIZAR ================= */}
          {activeTab === 'scanner' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Captura & Auditoria Fiscal</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Leitura de QR Code AT + Extração SNC & Validação TOConline</p>
                </div>
                <div className="flex items-center gap-2 bg-cyan-500/10 ring-1 ring-cyan-500/30 rounded-xl px-3.5 py-1.5 backdrop-blur-md">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-cyan-300">TOConline Pronto</span>
                </div>
              </div>

              {/* Classificação de Pasta */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <FolderOpen className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pasta de Arquivo</p>
                    <p className="text-sm font-semibold text-white">Selecione a classificação</p>
                  </div>
                </div>
                <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)} className="bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer">
                  {folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>

              {/* Upload Card */}
              <div className="bg-[#0B0F19]/40 backdrop-blur-sm border-2 border-dashed border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-8 text-center transition-all duration-300 shadow-2xl relative overflow-hidden group">
                {filePreview ? (
                  <div className="space-y-6 relative z-10 flex flex-col items-center">
                    <div className="w-full max-w-md max-h-96 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-4 shadow-2xl flex items-center justify-center">
                      {filePreview.isPdf ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
                            <File className="w-10 h-10" />
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-white font-mono break-all line-clamp-1">{filePreview.name}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mt-2 inline-block">PDF Carregado</span>
                          </div>
                        </div>
                      ) : (
                        <img src={filePreview.url} alt="Fatura" className="max-h-80 object-contain rounded-xl shadow-lg" />
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={() => startCamera('environment')} className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-5 py-2.5 rounded-xl transition-all">
                        <Camera className="w-4 h-4" /> Tirar Foto
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-5 py-2.5 rounded-xl transition-all">
                        <Upload className="w-4 h-4" /> Carregar Outro
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 py-10 relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-2xl">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-white">Arraste um PDF ou Fotografe a Fatura</p>
                      <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Classifica a conta oficial do SNC, calcula o IVA dedutível real (CIVA Art. 21) e agenda no calendário.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5" /> Ficheiro / PDF
                      </button>
                      <button onClick={() => startCamera('environment')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Camera className="w-5 h-5" /> Câmara
                      </button>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf,image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              </div>

              {statusMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center text-sm font-semibold text-emerald-400 flex items-center justify-center gap-3 shadow-lg backdrop-blur-md">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {statusMsg}
                </div>
              )}

              {errorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center text-sm font-semibold text-red-400 flex items-center justify-center gap-3 shadow-lg backdrop-blur-md">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Formulário de Auditoria */}
              {invoice && (
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                  {/* Cabeçalho */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" /> Auditoria Fiscal SNC & CIVA
                      </h3>
                      {invoice.ruleApplied && <p className="text-xs text-indigo-400 mt-1 font-medium flex items-center gap-1"><Zap className="w-3 h-3"/> {invoice.ruleApplied}</p>}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5" /> {invoice.sncAccount || 'SNC 611 - Mercadorias'}
                      </span>
                    </div>
                  </div>

                  {/* PAINEL DE ENQUADRAMENTO FISCAL DE IVA */}
                  <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Enquadramento de IVA & IRC (Plano de Contas)
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Taxa Dedução: {invoice.taxDeductionRate !== undefined ? invoice.taxDeductionRate : 100}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 text-xs">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-slate-400 block text-[10px] uppercase">IVA Total do Documento</span>
                        <span className="text-lg font-bold text-white mt-0.5 block">{invoice.taxAmount.toFixed(2)} €</span>
                      </div>
                      <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/40">
                        <span className="text-emerald-400 block text-[10px] uppercase font-bold">IVA Efetivamente Dedutível</span>
                        <span className="text-lg font-black text-emerald-400 mt-0.5 block">{(invoice.deductibleTax ?? invoice.taxAmount).toFixed(2)} €</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-slate-400 block text-[10px] uppercase">IVA em Custo (Art.21 / IRC)</span>
                        <span className="text-lg font-bold text-amber-400 mt-0.5 block">{(invoice.nonDeductibleTax || 0).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes de Liquidação & Vencimento */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-2xl p-5 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-400" /> Vencimento & Tesouraria
                      </h4>
                      <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setInvoice({ ...invoice, paymentStatus: 'PAID', paymentDate: invoice.paymentDate || new Date().toISOString().split('T')[0] })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${invoice.paymentStatus === 'PAID' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>✅ Pago</button>
                        <button onClick={() => setInvoice({ ...invoice, paymentStatus: 'PENDING' })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${invoice.paymentStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>⏳ No Calendário</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de Pagamento</label>
                        <select value={invoice.paymentMethod} onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                          <option>Pronto Pagamento</option><option>Débito Direto</option><option>Transferência Bancária</option><option>Cartão de Débito</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vencimento</label>
                        <input type="date" value={invoice.dueDate || invoice.docDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-amber-400 font-bold outline-none" />
                      </div>
                      {invoice.paymentStatus === 'PAID' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Pago</label>
                          <input type="date" value={invoice.paymentDate} onChange={(e) => setInvoice({ ...invoice, paymentDate: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-bold outline-none" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campos Fiscais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fornecedor / Emissor</label>
                      <input type="text" value={invoice.supplierName} onChange={(e) => setInvoice({...invoice, supplierName: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIF</label>
                      <input type="text" value={invoice.supplierNif} onChange={(e) => setInvoice({...invoice, supplierNif: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-mono font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nº Documento</label>
                      <input type="text" value={invoice.docNumber} onChange={(e) => setInvoice({...invoice, docNumber: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Emissão</label>
                      <input type="date" value={invoice.docDate} onChange={(e) => setInvoice({...invoice, docDate: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total a Pagar (€)</label>
                      <input type="number" step="0.01" value={invoice.totalAmount} onChange={(e) => setInvoice({...invoice, totalAmount: parseFloat(e.target.value) || 0})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-lg text-emerald-400 font-black outline-none" />
                    </div>
                  </div>

                  {/* Linhas de Artigos */}
                  {invoice.items && invoice.items.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <List className="w-4 h-4 text-emerald-400" /> Linhas Discriminadas ({invoice.items.length})
                      </h4>
                      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/40">
                        <table className="w-full text-left text-xs text-slate-300 font-mono">
                          <thead className="bg-white/[0.02] text-slate-500 text-[10px] uppercase font-bold border-b border-white/5">
                            <tr>
                              <th className="p-3">Código</th>
                              <th className="p-3">Descrição</th>
                              <th className="p-3 text-center">Qtd</th>
                              <th className="p-3 text-right">Preço</th>
                              <th className="p-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {invoice.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="p-3 text-emerald-400 font-semibold">{it.code || '—'}</td>
                                <td className="p-3 text-white font-sans">{it.description}</td>
                                <td className="p-3 text-center">{it.quantity}</td>
                                <td className="p-3 text-right">{it.unitPrice.toFixed(2)} €</td>
                                <td className="p-3 text-right font-bold text-emerald-400">{it.total.toFixed(2)} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button onClick={handleSave} disabled={loading || saveSuccess} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 text-sm ${saveSuccess ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                    {saveSuccess ? <><CheckCircle2 className="w-5 h-5" /> Documento Arquivado & Enviado ao TOConline!</> : <><Send className="w-5 h-5" /> Confirmar, Arquivar & Sincronizar TOConline</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= 2. CALENDÁRIO ================= */}
          {activeTab === 'calendar' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Tesouraria & Vencimentos</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Controlo de Débitos Diretos (Tefcold, Sammic, Andy) e Transferências</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase">Total Por Pagar</span>
                  <p className="text-2xl font-black text-amber-400">{totalPending.toFixed(2)} €</p>
                </div>
              </div>

              <div className="space-y-3">
                {archivedDocs.filter(d => d.paymentStatus === 'PENDING').length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-[#0B0F19]/50 rounded-2xl border border-white/5">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
                    <p className="text-base font-bold text-slate-200">Não existem faturas pendentes no calendário.</p>
                  </div>
                ) : (
                  archivedDocs.filter(d => d.paymentStatus === 'PENDING').map(doc => (
                    <div key={doc.id} className="p-5 bg-[#0B0F19]/80 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{doc.supplierName}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${doc.paymentMethod === 'Débito Direto' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {doc.paymentMethod}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          Doc: {doc.docNumber} • Vencimento: <strong className="text-amber-400">{doc.dueDate || doc.docDate}</strong> • {doc.sncAccount}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-lg font-black text-emerald-400">{doc.totalAmount.toFixed(2)} €</span>
                        <button onClick={() => togglePaymentStatus(doc.id, doc.paymentMethod === 'Débito Direto')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
                          {doc.paymentMethod === 'Débito Direto' ? 'Confirmar Débito no Banco' : 'Dar Baixa'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= 3. ARQUIVO ================= */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-2xl font-bold text-white tracking-tight">Arquivo Geral & Classificação</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> A Pagar</span>
                  <p className="text-3xl font-black text-white mt-2">{totalPending.toFixed(2)} €</p>
                </div>
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Liquidado</span>
                  <p className="text-3xl font-black text-white mt-2">{totalPaid.toFixed(2)} €</p>
                </div>
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> IVA Dedutível</span>
                  <p className="text-3xl font-black text-white mt-2">{totalDeductibleVat.toFixed(2)} €</p>
                </div>
              </div>

              <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button onClick={()=>setPaymentFilter('ALL')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${paymentFilter==='ALL'?'bg-white/10 text-white':'text-slate-500'}`}>Todos ({archivedDocs.length})</button>
                    <button onClick={()=>setPaymentFilter('PENDING')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${paymentFilter==='PENDING'?'bg-amber-500/20 text-amber-400':'text-slate-500'}`}>A Pagar</button>
                    <button onClick={()=>setPaymentFilter('PAID')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${paymentFilter==='PAID'?'bg-emerald-500/20 text-emerald-400':'text-slate-500'}`}>Pagos</button>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input type="text" placeholder="Pesquisar..." onChange={(e)=>setSearchFilter(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-black/20 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="p-4 px-6">Data</th>
                        <th className="p-4">Entidade</th>
                        <th className="p-4">Documento</th>
                        <th className="p-4">Conta SNC</th>
                        <th className="p-4 text-right">IVA Dedutível</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 px-6 font-mono text-xs">{doc.docDate}</td>
                          <td className="p-4 font-bold text-slate-200">{doc.supplierName}</td>
                          <td className="p-4 font-mono text-xs">{doc.docNumber}</td>
                          <td className="p-4 text-xs font-mono text-cyan-400">{doc.sncAccount || 'SNC 611'}</td>
                          <td className="p-4 text-right font-bold text-cyan-400">{(doc.deductibleTax??doc.taxAmount).toFixed(2)} €</td>
                          <td className="p-4 text-right font-black text-emerald-400">{doc.totalAmount.toFixed(2)} €</td>
                          <td className="p-4 text-center">
                            <button onClick={() => togglePaymentStatus(doc.id, doc.paymentMethod === 'Débito Direto')} className={`px-3 py-1 rounded-lg text-xs font-bold ${doc.paymentStatus === 'PAID' ? 'bg-white/5 text-slate-400' : 'bg-emerald-600 text-white'}`}>
                              {doc.paymentStatus === 'PAID' ? 'Pago' : 'Dar Baixa'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. PASTAS ================= */}
          {activeTab === 'folders' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Estrutura de Pastas de Arquivo</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Organização fiscal por tipo de despesa e contas do SNC</p>
                </div>
                <button onClick={() => setShowNewFolderModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg">
                  <Plus className="w-4 h-4" /> Criar Nova Pasta
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map(f => {
                  const count = archivedDocs.filter(d => d.category === f.name).length;
                  const total = archivedDocs.filter(d => d.category === f.name).reduce((acc, d) => acc + d.totalAmount, 0);
                  return (
                    <div key={f.id} className="bg-[#0B0F19]/80 border border-white/5 hover:border-slate-700/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-snug">{f.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">{count} documento(s)</span>
                        <span className="text-emerald-400 font-bold">{total.toFixed(2)} €</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= 5. FORNECEDORES & REGRAS ================= */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Fornecedores & Regras SNC</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Prazos, Débitos Diretos e Dedução de IVA (Nacional e Espanha)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map(sup => (
                  <div key={sup.id} className="bg-[#0B0F19]/80 border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sup.country === 'ES' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {sup.country === 'ES' ? '🇪🇸 Espanha' : '🇵🇹 Portugal'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">NIF: {sup.nif}</span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{sup.name}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div className="p-2 bg-slate-900/60 rounded-xl"><span className="text-[9px] text-slate-500 block uppercase">Pagamento</span><span className="font-bold text-slate-200">{sup.paymentMethod}</span></div>
                      <div className="p-2 bg-slate-900/60 rounded-xl"><span className="text-[9px] text-slate-500 block uppercase">Prazo</span><span className="font-bold text-amber-400">{sup.daysToDue} dias</span></div>
                      <div className="p-2 bg-slate-900/60 rounded-xl"><span className="text-[9px] text-slate-500 block uppercase">Conta SNC</span><span className="font-bold text-cyan-400 truncate block">{sup.sncAccount}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 6. TOCONLINE & FECHO ================= */}
          {activeTab === 'accountant' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-[#0B0F19]/80 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-6 h-6 text-cyan-400" /> Sincronizador TOConline & Fecho Mensal
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Exportação direta com apuramento de IVA Dedutível (Art. 21º CIVA) e contas SNC</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Despesas / Compras</span>
                    <p className="text-2xl font-black text-white mt-1">{(totalPaid + totalPending).toFixed(2)} €</p>
                  </div>
                  <div className="p-4 bg-emerald-950/30 rounded-2xl border border-emerald-800/40">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">IVA Efetivamente Dedutível</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{totalDeductibleVat.toFixed(2)} €</p>
                  </div>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Documentos Sincronizados</span>
                    <p className="text-2xl font-black text-cyan-400 mt-1">{archivedDocs.length} Faturas</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 7. CONFIGURAÇÕES ================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-2xl font-bold text-white tracking-tight">Configurações & Ligações de API</h2>

              {/* CARD DE CONEXÃO COM O BACKEND API */}
              <div className="bg-[#0B0F19]/80 border border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Endereço da API do Servidor (DocFlow Backend)</h3>
                      <p className="text-xs text-slate-400">Insira o link público da sua API gerado pelo Coolify</p>
                    </div>
                  </div>
                  <button onClick={handleTestApiUrl} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50">
                    <Zap className="w-4 h-4" /> Testar & Guardar API
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold uppercase">URL da API (Coolify)</label>
                    <input type="text" placeholder="http://a6d42emz9pwspal002chra7b.167.86.111.8.sslip.io" value={apiUrlInput} onChange={(e) => setApiUrlInput(e.target.value)} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono" />
                  </div>
                </div>
              </div>

              {/* CARD DE LIGAÇÃO TOCONLINE */}
              <div className="bg-[#0B0F19]/80 border border-cyan-500/30 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl text-xs">
                <h3 className="text-base font-bold text-white flex items-center gap-2"><Link2 className="w-4 h-4 text-cyan-400" /> Integração TOConline</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-slate-400 font-bold uppercase">Token TOConline</label><input type="password" placeholder="Token..." value={settings.tocOnlineApiKey} onChange={(e)=>setSettings({...settings, tocOnlineApiKey: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl p-3 text-white outline-none" /></div>
                  <div><label className="text-slate-400 font-bold uppercase">NIF Empresa TOConline</label><input type="text" value={settings.tocOnlineCompanyId} onChange={(e)=>setSettings({...settings, tocOnlineCompanyId: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl p-3 text-white font-mono outline-none" /></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm"><FolderPlus className="w-5 h-5" /> Criar Nova Pasta</div>
            <div className="space-y-3 text-xs">
              <div><label className="font-semibold text-slate-400 uppercase">Nome da Pasta</label><input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none" /></div>
              <div><label className="font-semibold text-slate-400 uppercase">Descrição</label><input type="text" value={newFolderDesc} onChange={(e) => setNewFolderDesc(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none" /></div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowNewFolderModal(false)} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleCreateFolder} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor da Câmara */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4 sm:p-6">
          <div className="w-full max-w-lg flex items-center justify-between text-white py-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Câmara Ativa</span>
            <button onClick={stopCamera} className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          <div className="relative w-full max-w-lg flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 my-2">
            <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
          </div>
          <div className="w-full max-w-lg flex items-center justify-around py-4">
            <button onClick={() => { const n = cameraFacing === 'environment' ? 'user' : 'environment'; setCameraFacing(n); startCamera(n); }} className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"><SwitchCamera className="w-6 h-6" /></button>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-2xl flex items-center justify-center text-white"><Camera className="w-8 h-8" /></button>
            <button onClick={() => { stopCamera(); fileInputRef.current?.click(); }} className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"><Upload className="w-6 h-6" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
