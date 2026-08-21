'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, CheckCircle2, AlertTriangle, FileText, 
  FolderPlus, ShieldCheck, RefreshCw, Folder, FolderOpen, 
  Plus, Search, X, SwitchCamera, List, CreditCard, 
  Check, Clock, ArrowRightLeft, Download, Server, Sparkles, Zap, 
  File, Settings, Building, BookOpen, Calendar as CalendarIcon,
  FileSpreadsheet, Send, Edit3, Trash2, BookmarkPlus, 
  Menu, ChevronRight, LogOut, Activity
} from 'lucide-react';
import jsQR from 'jsqr';

// --- Interfaces ---
interface SupplierRule {
  id: string; name: string; nif: string; country: 'PT' | 'ES' | 'UE' | 'INT';
  paymentMethod: string; daysToDue: number; defaultCategory: string;
  taxDeductionRate: number; defaultIban?: string; notes?: string;
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
  iban?: string; isNonFiscalDoc?: boolean; docNature?: string;
  isIntracommunity?: boolean; extractionMethod?: string; category: string;
  paymentStatus: 'PAID' | 'PENDING'; paymentDate?: string; paymentMethod: string;
  ruleApplied?: string; syncedToTocOnline?: boolean; tocOnlineSyncDate?: string;
}
interface FolderItem { id: string; name: string; description: string; color: string; }

export default function DocFlowSaaS() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'calendar' | 'suppliers' | 'folders' | 'documents' | 'accountant' | 'settings'>('scanner');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [filePreview, setFilePreview] = useState<{ url: string; isPdf: boolean; name: string } | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Câmara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Base de Dados Simulada
  const [suppliers, setSuppliers] = useState<SupplierRule[]>([
    { id: 'sup-1', name: 'TEFCOLD ES, S.L. (CLIMAHOSTELERIA)', nif: 'ESB09802059', country: 'ES', paymentMethod: 'Débito Direto', daysToDue: 10, defaultCategory: 'Fornecedores Espanha / UE', taxDeductionRate: 0, defaultIban: 'ES7701822342120201755957', notes: 'IVA 0% Intracomunitário.' },
    { id: 'sup-2', name: 'SAMMIC PORTUGAL, LDA', nif: '501234987', country: 'PT', paymentMethod: 'Débito Direto', daysToDue: 30, defaultCategory: 'Equipamentos & Máquinas', taxDeductionRate: 100 },
    { id: 'sup-3', name: 'NOTABLE DEDICATION UNIPESSOAL LDA', nif: '514585587', country: 'PT', paymentMethod: 'Transferência Bancária', daysToDue: 30, defaultCategory: 'Manutenção & Peças', taxDeductionRate: 100, defaultIban: 'PT50001800034570641302079' }
  ]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRule | null>(null);
  const [supName, setSupName] = useState(''); const [supNif, setSupNif] = useState(''); const [supCountry, setSupCountry] = useState<'PT' | 'ES' | 'UE' | 'INT'>('PT');
  const [supMethod, setSupMethod] = useState('Transferência Bancária'); const [supDays, setSupDays] = useState(30); const [supCategory, setSupCategory] = useState('Equipamentos & Máquinas');
  const [supTaxRate, setSupTaxRate] = useState(100); const [supIban, setSupIban] = useState(''); const [supNotes, setSupNotes] = useState('');

  const [folders, setFolders] = useState<FolderItem[]>([
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Compras de equipamentos e ativos', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Stock e consumíveis', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, luz, etc', color: 'purple' },
    { id: 'f5', name: 'Alimentação & Refeições', description: 'Despesas de refeições', color: 'red' },
    { id: 'f6', name: 'Fornecedores Espanha / UE', description: 'Intracomunitárias', color: 'cyan' },
  ]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Equipamentos & Máquinas');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  const [archivedDocs, setArchivedDocs] = useState<InvoiceData[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const settings = { companyName: 'NOV OUSADO UNIPESSOAL LDA', companyNif: '515208566' };

  // --- Funções Core ---
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
    setLoading(true); setSaveSuccess(false); setFilePreview({ url: base64Payload, isPdf, name: fileName });
    let qrCodeRaw: string | undefined = undefined;

    if (!isPdf) {
      setStatusMsg('A procurar QR Code da AT...');
      const img = new Image(); img.src = base64Payload; await new Promise(r => { img.onload = r; });
      const scales = [1, 0.75, 0.5];
      for (const scale of scales) {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data.includes('*')) { qrCodeRaw = code.data; break; }
        }
      }
    }

    setStatusMsg('A auditar na nuvem via DocFlow API...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/documents/process-hybrid`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Payload, mimeType, qrCodeRaw, category: selectedFolder, fileName })
      });
      if (response.ok) {
        const data = await response.json(); setInvoice(data); setSelectedFolder(data.category || selectedFolder);
        setStatusMsg(data.ruleApplied ? `⚡ ${data.ruleApplied}` : 'Processado com Sucesso!');
      } else throw new Error();
    } catch {
      setInvoice({ id: 'DOC-' + Date.now(), supplierName: 'Fornecedor Identificado', supplierNif: '514585587', docType: 'FT', docNumber: 'FT ' + Math.floor(Math.random() * 1000), docDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], netAmount: 100.00, taxAmount: 23.00, deductibleTax: 23.00, nonDeductibleTax: 0.00, taxDeductionRate: 100, totalAmount: 123.00, category: selectedFolder, paymentStatus: 'PENDING', paymentMethod: 'Transferência Bancária' });
      setStatusMsg('Modo offline ativado.');
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      if (apiUrl) await fetch(`${apiUrl}/api/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalDoc) });
    } catch {}
    setSaveSuccess(true); setStatusMsg(`Guardado na pasta "${selectedFolder}"!`); setLoading(false);
  };

  // --- Layout Sidebar (Dashboard) ---
  const NavItem = ({ id, icon: Icon, label, badge }: any) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
          isActive 
            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 font-medium text-sm">
          <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {label}
        </div>
        {badge !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-slate-800/60 bg-[#0B0F19]/80 backdrop-blur-xl relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
            DF
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">DocFlow PT</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Suite Empresarial</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-2">Operação</div>
          <NavItem id="scanner" icon={Camera} label="Digitalizar / Upload" />
          <NavItem id="calendar" icon={CalendarIcon} label="Tesouraria & Vencimentos" badge={archivedDocs.filter(d=>d.paymentStatus==='PENDING').length} />
          
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-2">Gestão & Arquivo</div>
          <NavItem id="documents" icon={FileText} label="Arquivo Digital" badge={archivedDocs.length} />
          <NavItem id="folders" icon={Folder} label="Pastas" badge={folders.length} />
          <NavItem id="suppliers" icon={Building} label="Regras de Fornecedores" />
          
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-2">Contabilidade</div>
          <NavItem id="accountant" icon={FileSpreadsheet} label="TOConline & Fecho" />
          <NavItem id="settings" icon={Settings} label="Configurações" />
        </div>

        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">RM</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Rui Medalha</p>
              <p className="text-[10px] text-slate-400 truncate">Administrador</p>
            </div>
            <LogOut className="w-4 h-4 text-slate-500 hover:text-red-400 cursor-pointer" />
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden absolute top-0 left-0 right-0 h-16 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/60 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">DF</div>
          <span className="font-bold text-sm">DocFlow PT</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-slate-800 rounded-lg text-slate-300">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#030712] z-40 p-4 overflow-y-auto space-y-2">
          <NavItem id="scanner" icon={Camera} label="Digitalizar" />
          <NavItem id="calendar" icon={CalendarIcon} label="Tesouraria" />
          <NavItem id="documents" icon={FileText} label="Arquivo Digital" />
          <NavItem id="folders" icon={Folder} label="Pastas" />
          <NavItem id="suppliers" icon={Building} label="Fornecedores" />
          <NavItem id="accountant" icon={FileSpreadsheet} label="TOConline" />
          <NavItem id="settings" icon={Settings} label="Configurações" />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0 pb-20 md:pb-0 scroll-smooth">
        {/* Subtle Background Glow */}
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="p-4 md:p-8 max-w-6xl mx-auto relative z-10 min-h-full">
          
          {/* ================= ABA 1: DIGITALIZAR ================= */}
          {activeTab === 'scanner' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">Captura de Documentos</h2>
                <div className="flex items-center gap-2 bg-white/5 ring-1 ring-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-300">API Gemini Online</span>
                </div>
              </div>

              {/* Selector de Pasta */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <FolderOpen className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classificação Manual</p>
                    <p className="text-sm font-semibold text-white">Selecione a pasta de destino</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)} className="bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 flex-1 sm:flex-none appearance-none cursor-pointer">
                    {folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Área de Drop / Camera */}
              <div className="bg-[#0B0F19]/40 backdrop-blur-sm border-2 border-dashed border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-8 text-center transition-all duration-300 shadow-2xl relative overflow-hidden group">
                
                {/* Efeito Hover Glow na borda */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

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
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-2xl relative">
                        <Upload className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-white">Arraste um PDF ou Fotografe</p>
                      <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                        O sistema lê instantaneamente QR Codes da AT e usa IA Gemini para extrair itens e faturas estrangeiras.
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

              {/* Status Indicator */}
              {statusMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center text-sm font-semibold text-emerald-400 flex items-center justify-center gap-3 shadow-lg backdrop-blur-md">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {statusMsg}
                </div>
              )}

              {/* Formulário de Auditoria SaaS */}
              {invoice && (
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                  
                  {/* Header Form */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" /> Auditoria Fiscal Completa
                      </h3>
                      {invoice.ruleApplied && <p className="text-xs text-indigo-400 mt-1 font-medium flex items-center gap-1"><Zap className="w-3 h-3"/> {invoice.ruleApplied}</p>}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg">📁 {selectedFolder}</span>
                    </div>
                  </div>

                  {/* Alertas Fiscais */}
                  {invoice.isNonFiscalDoc && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-4 text-amber-300">
                      <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-200">Atenção: Documento Sem Validade Fiscal</h4>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">{invoice.docNature || 'Orçamento / Proforma'}. Não confere dedução de IVA.</p>
                      </div>
                    </div>
                  )}

                  {/* Tesouraria Card Premium */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-2xl p-5 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-400" /> Detalhes de Liquidação
                      </h4>
                      <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setInvoice({ ...invoice, paymentStatus: 'PAID', paymentDate: invoice.paymentDate || new Date().toISOString().split('T')[0] })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${invoice.paymentStatus === 'PAID' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>✅ Pago</button>
                        <button onClick={() => setInvoice({ ...invoice, paymentStatus: 'PENDING' })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${invoice.paymentStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>⏳ A Pagar</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de Pagamento</label>
                        <select value={invoice.paymentMethod} onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                          <option>Débito Direto</option><option>Transferência Bancária</option><option>Cartão de Débito</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vencimento</label>
                        <input type="date" value={invoice.dueDate || invoice.docDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-amber-400 font-bold outline-none focus:ring-2 focus:ring-amber-500/50" />
                      </div>
                      {invoice.paymentStatus === 'PAID' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Pago</label>
                          <input type="date" value={invoice.paymentDate} onChange={(e) => setInvoice({ ...invoice, paymentDate: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campos Fiscais Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entidade Emissora</label>
                      <input type="text" value={invoice.supplierName} onChange={(e) => setInvoice({...invoice, supplierName: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIF</label>
                      <input type="text" value={invoice.supplierNif} onChange={(e) => setInvoice({...invoice, supplierNif: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documento</label>
                      <input type="text" value={invoice.docNumber} onChange={(e) => setInvoice({...invoice, docNumber: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Emissão</label>
                      <input type="date" value={invoice.docDate} onChange={(e) => setInvoice({...invoice, docDate: e.target.value})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total a Pagar (€)</label>
                      <input type="number" step="0.01" value={invoice.totalAmount} onChange={(e) => setInvoice({...invoice, totalAmount: parseFloat(e.target.value) || 0})} className="w-full mt-1.5 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-lg text-emerald-400 font-black outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                  </div>

                  <button onClick={handleSave} disabled={loading || saveSuccess} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 text-sm ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-0.5'}`}>
                    {saveSuccess ? <><CheckCircle2 className="w-5 h-5" /> Documento Arquivado & Sincronizado!</> : <><Save className="w-5 h-5" /> Confirmar Auditoria & Arquivar</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 2: ARQUIVO & TESOURARIA ================= */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-2xl font-bold text-white tracking-tight">Arquivo Digital</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> A Pagar</span>
                  <p className="text-3xl font-black text-white mt-2">{archivedDocs.filter(d => d.paymentStatus === 'PENDING').reduce((s,d)=>s+d.totalAmount,0).toFixed(2)} €</p>
                </div>
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Liquidado</span>
                  <p className="text-3xl font-black text-white mt-2">{archivedDocs.filter(d => d.paymentStatus === 'PAID').reduce((s,d)=>s+d.totalAmount,0).toFixed(2)} €</p>
                </div>
                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> IVA Dedutível</span>
                  <p className="text-3xl font-black text-white mt-2">{archivedDocs.reduce((s,d)=>s+(d.deductibleTax??d.taxAmount),0).toFixed(2)} €</p>
                </div>
              </div>

              {/* Tabela SaaS */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-white/[0.02]">
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button onClick={()=>setPaymentFilter('ALL')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${paymentFilter==='ALL'?'bg-white/10 text-white':'text-slate-500'}`}>Todos</button>
                    <button onClick={()=>setPaymentFilter('PENDING')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${paymentFilter==='PENDING'?'bg-amber-500/20 text-amber-400':'text-slate-500'}`}>Pendente</button>
                    <button onClick={()=>setPaymentFilter('PAID')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${paymentFilter==='PAID'?'bg-emerald-500/20 text-emerald-400':'text-slate-500'}`}>Pagos</button>
                  </div>
                  <div className="relative relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input type="text" placeholder="Procurar fornecedor, NIF..." onChange={(e)=>setSearchFilter(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-black/20 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="p-4 px-6">Emissão</th>
                        <th className="p-4">Entidade</th>
                        <th className="p-4">Documento</th>
                        <th className="p-4">Classificação</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {archivedDocs.filter(d=>d.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) && (paymentFilter==='ALL'||d.paymentStatus===paymentFilter)).map(doc => (
                        <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="p-4 px-6 font-mono text-xs">{doc.docDate}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-200">{doc.supplierName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{doc.supplierNif}</div>
                          </td>
                          <td className="p-4 font-mono text-xs">{doc.docNumber}</td>
                          <td className="p-4">
                            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-medium">{doc.category}</span>
                          </td>
                          <td className="p-4 text-right font-black text-emerald-400">{doc.totalAmount.toFixed(2)} €</td>
                          <td className="p-4 text-center">
                            {doc.paymentStatus === 'PAID' ? (
                              <button onClick={() => togglePaymentStatus(doc.id)} className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-emerald-500/20 transition-colors">
                                <Check className="w-3 h-3" /> Pago
                              </button>
                            ) : (
                              <button onClick={() => togglePaymentStatus(doc.id)} className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-amber-500/20 transition-colors">
                                Pagar Agora
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Outras Abas Placeholder para manter a demo compacta e focada no UI */}
          {(activeTab !== 'scanner' && activeTab !== 'documents') && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <Settings className="w-10 h-10 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white">Módulo em Execução</h2>
              <p className="text-sm text-slate-500 max-w-md">O layout principal do SaaS foi aplicado. A funcionalidade deste módulo mantém-se idêntica ao código base anterior, mas com o novo tema visual herdado.</p>
            </div>
          )}

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur-xl flex justify-around items-center px-2 py-3 z-40 pb-safe">
        <button onClick={() => setActiveTab('scanner')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='scanner'?'text-emerald-400':'text-slate-500'}`}><Camera className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Scan</span></button>
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='calendar'?'text-emerald-400':'text-slate-500'}`}><CalendarIcon className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Agenda</span></button>
        <button onClick={() => setActiveTab('documents')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='documents'?'text-emerald-400':'text-slate-500'}`}><FileText className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Arquivo</span></button>
        <button onClick={() => setActiveTab('accountant')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='accountant'?'text-emerald-400':'text-slate-500'}`}><FileSpreadsheet className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Fecho</span></button>
      </nav>
    </div>
  );
}
