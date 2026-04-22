import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Save, ChevronDown, ChevronUp, Layout, Target, Users, TrendingUp, 
  Briefcase, Download, Info, Camera, FileText, Calculator, Loader2, MessageSquare, 
  Calendar, User, UserCircle, UserSquare, UserRound, X, Globe, Zap, Shield, Compass
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { jsPDF } from 'jspdf';
// @ts-ignore
import domtoimage from 'dom-to-image-more';
import { 
  PlanSection, PortalType, Product, PersonnelExpense, MarketingExpense, 
  AdminExpense, Investment, BuyerPersona, UserAccount, UserRole 
} from './types';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useLanguage } from './LanguageContext';

interface BasicsData {
  companyForm: string;
  background: string;
  businessIdea: string;
  businessIdeaWhat?: string;
  businessIdeaHow?: string;
  businessIdeaForWhom?: string;
  operatingIdea?: string;
  companyDescription?: string;
  coverImage?: string;
  organizationModel?: {
    type: 'LINE' | 'MATRIX' | 'PROJECT' | 'CUSTOM';
    boxes: { id: string; text: string; x: number; y: number }[];
    connections?: { id: string; from: string; to: string }[];
  };
  contribution?: string;
}

interface EnvironmentPhenomenon {
  id: string;
  text: string;
  type: 'positive' | 'negative';
}

interface StrategyData {
  visionAndValues: string;
  diagnosis: string;
  how: string;
  howItems?: { id: string; text: string }[];
}

interface BusinessModelData {
  keyActivities: string;
  keyResources: string;
  valueProposition: string;
  channels?: string;
  customers: string;
  costs: string;
  revenues: string;
}

interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface ImplementationPhase {
  id: string;
  task: string;
  schedule: string;
  responsible: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface ProjectData {
  id?: string;
  ownerId?: string;
  ownerName?: string;
  title: string;
  description: string;
  phases: ProjectPhase[];
  linkedFocusAreas: string[];
  linkedActivities: string;
  linkedResources: string;
  strategicAlignment?: string;
  businessModelAlignment?: string;
}

interface PlanBuilderProps {
  portalType: PortalType;
  activeSection: string;
  isReadOnly?: boolean;
  user?: UserAccount | null;
  viewingWorkspaceAs?: string | null;
}

export const PlanBuilder: React.FC<PlanBuilderProps> = ({ portalType, activeSection, isReadOnly = false, user, viewingWorkspaceAs }) => {
  const { t } = useLanguage();
  
  // Surgical Addition: Guidance UI State
  const [activeGuidance, setActiveGuidance] = useState<string | null>(null);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelExpense[]>([]);
  const [marketing, setMarketing] = useState<MarketingExpense[]>([]);
  const [buyerPersonas, setBuyerPersonas] = useState<BuyerPersona[]>([]);
  const [admin, setAdmin] = useState<AdminExpense[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [externalEnv, setExternalEnv] = useState<EnvironmentPhenomenon[]>([]);
  const [internalEnv, setInternalEnv] = useState<EnvironmentPhenomenon[]>([]);
  const [strategy, setStrategy] = useState<StrategyData>({ visionAndValues: '', diagnosis: '', how: '', howItems: [] });
  const [implementationPhases, setImplementationPhases] = useState<ImplementationPhase[]>([]);
  const [businessModel, setBusinessModel] = useState<BusinessModelData>({ keyActivities: '', keyResources: '', valueProposition: '', channels: '', customers: '', costs: '', revenues: '' });
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [basics, setBasics] = useState<BasicsData>({ companyForm: '', background: '', businessIdea: '', businessIdeaWhat: '', businessIdeaHow: '', businessIdeaForWhom: '', operatingIdea: '', contribution: '' });
  const [genericNotes, setGenericNotes] = useState<Record<string, string>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Org Model Canvas State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [newConnFrom, setNewConnFrom] = useState<string>('');
  const [newConnTo, setNewConnTo] = useState<string>('');

  // PDF & Error State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Global Calculations
  const totalRevenue = products.reduce((acc, p) => acc + (p.price * p.volume), 0);
  const totalPersonnelYear = personnel.reduce((acc, p) => acc + (p.salary * p.count * 12), 0);
  const totalMarketingYear = marketing.reduce((acc, m) => acc + (m.monthlyCost * 12), 0);
  const totalAdminYear = admin.reduce((acc, a) => acc + (a.monthlyCost * 12), 0);
  const totalExpenses = totalPersonnelYear + totalMarketingYear + totalAdminYear;
  const ebitda = totalRevenue - totalExpenses;

  const chartData = [
    { name: 'Liikevaihto', value: totalRevenue, color: '#10b981' },
    { name: 'Henkilöstö', value: totalPersonnelYear, color: '#ef4444' },
    { name: 'Markkinointi', value: totalMarketingYear, color: '#f59e0b' },
    { name: 'Hallinto', value: totalAdminYear, color: '#6366f1' },
  ];
  const expenseBreakdown = [{ name: 'Henkilöstö', value: totalPersonnelYear }, { name: 'Markkinointi', value: totalMarketingYear }, { name: 'Hallinto', value: totalAdminYear }].filter(item => item.value > 0);

  // Active Project Logic
  const project = projects.find(p => p.id === activeProjectId) || { 
    id: activeProjectId, ownerId: user?.uid || 'default', ownerName: user?.displayName || 'Oma projekti', 
    title: '', description: '', phases: [], linkedFocusAreas: [], linkedActivities: '', linkedResources: '', 
    strategicAlignment: '', businessModelAlignment: '' 
  };

  const setProject = (updatedProject: ProjectData) => {
    setProjects(prev => {
      const exists = prev.find(p => p.id === updatedProject.id);
      return exists ? prev.map(p => p.id === updatedProject.id ? updatedProject : p) : [...prev, updatedProject];
    });
  };

  // Helper Components for Guidance
  const GuidanceOverlay = ({ id, title, text }: { id: string, title: string, text: React.ReactNode }) => (
    <AnimatePresence>
      {activeGuidance === id && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-emerald-50/95 rounded-[24px] md:rounded-[32px] p-6 flex flex-col border border-emerald-100 shadow-xl overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-emerald-800">{title}</h4>
            <button onClick={() => setActiveGuidance(null)} className="p-2 hover:bg-emerald-100 rounded-full transition-all text-emerald-800"><X size={20} /></button>
          </div>
          <div className="text-sm md:text-base text-emerald-900 font-medium italic leading-relaxed">{text}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const InfoButton = ({ id }: { id: string }) => (
    <button onClick={(e) => { e.stopPropagation(); setActiveGuidance(activeGuidance === id ? null : id); }} className="text-emerald-500 hover:text-emerald-600 p-1 active:scale-90 transition-all"><Info size={20} /></button>
  );

  // Persistence Engine
  const saveToFirebase = async () => {
    if (!auth.currentUser || isReadOnly) return;
    setIsSaving(true);
    try {
      const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser.uid);
      await setDoc(doc(db, 'users', targetUid, 'businessPlan', portalType), { 
        products, personnel, marketing, buyerPersonas, admin, investments, externalEnv, 
        internalEnv, strategy, businessModel, projects, basics, implementationPhases, genericNotes, 
        updatedAt: new Date().toISOString() 
      });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'Plan data'); } finally { setIsSaving(false); }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!auth.currentUser) return setIsLoading(false);
      try {
        const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser.uid);
        const snap = await getDoc(doc(db, 'users', targetUid, 'businessPlan', portalType));
        if (snap.exists()) applyLoadedData(snap.data());
      } finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  const applyLoadedData = (parsed: any) => {
    if (parsed.products) setProducts(parsed.products);
    if (parsed.personnel) setPersonnel(parsed.personnel);
    if (parsed.marketing) setMarketing(parsed.marketing);
    if (parsed.buyerPersonas) setBuyerPersonas(parsed.buyerPersonas);
    if (parsed.admin) setAdmin(parsed.admin);
    if (parsed.investments) setInvestments(parsed.investments);
    if (parsed.externalEnv) setExternalEnv(parsed.externalEnv);
    if (parsed.internalEnv) setInternalEnv(parsed.internalEnv);
    if (parsed.implementationPhases) setImplementationPhases(parsed.implementationPhases);
    if (parsed.strategy) setStrategy(parsed.strategy);
    if (parsed.businessModel) setBusinessModel(parsed.businessModel);
    if (parsed.projects) setProjects(parsed.projects);
    if (parsed.basics) setBasics(parsed.basics);
    if (parsed.genericNotes) setGenericNotes(parsed.genericNotes);
  };

  useEffect(() => {
    const data = { products, personnel, marketing, buyerPersonas, admin, investments, externalEnv, internalEnv, strategy, businessModel, projects, basics, implementationPhases, genericNotes };
    localStorage.setItem(`business_plan_data_${portalType}`, JSON.stringify(data));
  }, [products, personnel, marketing, buyerPersonas, admin, investments, externalEnv, internalEnv, strategy, businessModel, projects, basics, implementationPhases, genericNotes, portalType]);

  useEffect(() => {
    if (isLoading || !auth.currentUser || isReadOnly) return;
    const timer = setTimeout(() => saveToFirebase(), 2000);
    return () => clearTimeout(timer);
  }, [products, personnel, marketing, admin, investments, externalEnv, internalEnv, strategy, businessModel, projects, basics, implementationPhases, genericNotes]);

  // PDF Export
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const container = document.getElementById('pdf-export-container');
      if (!container) return;
      await new Promise(r => setTimeout(r, 500));
      const pages = container.querySelectorAll('.pdf-page');
      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < pages.length; i++) {
        const img = await domtoimage.toJpeg(pages[i], { quality: 0.95, bgcolor: '#ffffff' });
        if (i > 0) pdf.addPage();
        pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`${portalType === 'LTS' ? t('businessPlan') : t('strategyPlan')}.pdf`);
    } finally { setIsGeneratingPDF(false); }
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  const handleRemoveProduct = (id: string) => setProducts(products.filter(p => p.id !== id));
  const handleAddProduct = () => setProducts([...products, { id: Math.random().toString(36).substr(2, 9), name: '', price: 0, volume: 0 }]);

  // WORKSPACE RENDERERS

  const renderPersonnelWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('personnel')}</h2><p className="text-slate-400 text-sm">{t('definePersonnel')}</p></div>
        {!isReadOnly && (
          <div className="flex gap-4">
            <button onClick={() => setPersonnel([...personnel, { id: Math.random().toString(36).substr(2, 9), role: '', salary: 0, count: 1 }])} className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all"><Plus size={20} /> <span>{t('addPerson')}</span></button>
            {renderSaveButton()}
          </div>
        )}
      </div>
      <div className="relative bg-white rounded-[32px] border border-black/5 shadow-xl overflow-x-auto min-h-[250px]">
        <div className="absolute top-4 right-4 z-10"><InfoButton id="lts_pers" /></div>
        <GuidanceOverlay id="lts_pers" title="Henkilöstö" text="Määrittele yrityksen avainroolit ja palkkakustannukset. Järjestelmä laskee kulut automaattisesti." />
        <table className="w-full text-left min-w-[700px]">
          <thead><tr className="bg-slate-50 border-b border-black/5"><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">{t('roleTask')}</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">{t('monthlySalaryEur')}</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">{t('count')}</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Yhteensä</th>{!isReadOnly && <th className="px-8 py-6 w-16"></th>}</tr></thead>
          <tbody className="divide-y divide-black/5">
            {personnel.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6"><input type="text" value={p.role} onChange={(e) => setPersonnel(personnel.map(i => i.id === p.id ? {...i, role: e.target.value} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6"><input type="number" value={p.salary} onChange={(e) => setPersonnel(personnel.map(i => i.id === p.id ? {...i, salary: Number(e.target.value)} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6"><input type="number" value={p.count} onChange={(e) => setPersonnel(personnel.map(i => i.id === p.id ? {...i, count: Number(e.target.value)} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6 font-black text-indigo-600">{(p.salary * p.count).toLocaleString()} €</td>
                {!isReadOnly && <td className="px-8 py-6"><button onClick={() => setPersonnel(personnel.filter(i => i.id !== p.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMarketingWorkspace = () => (
    <div className="space-y-12">
      <div className="space-y-8">
        <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('marketSize')}</h2><p className="text-slate-400 text-sm">{t('defineMarketSize')}</p></div>{!isReadOnly && renderSaveButton()}</div>
        <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl">
          <div className="absolute top-6 right-6"><InfoButton id="lts_mkt_size" /></div>
          <GuidanceOverlay id="lts_mkt_size" title="Markkinan koko" text="Arvioi markkinan kokonaisarvo ja potentiaali. Ketkä ovat tärkeimmät kohderyhmät?" />
          <textarea value={genericNotes.marketSize || ''} onChange={(e) => setGenericNotes({...genericNotes, marketSize: e.target.value})} disabled={isReadOnly} className="w-full h-40 bg-slate-50 border-none rounded-2xl p-6 focus:ring-2 focus:ring-black/5 outline-none resize-none font-medium" placeholder="Kirjoita markkina-arvio tästä..." />
        </div>
      </div>
      <div className="space-y-8">
        <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">Myyntitavoitteet</h2><p className="text-slate-400 text-sm">Tuotteet ja volyymit.</p></div>{!isReadOnly && <button onClick={handleAddProduct} className="bg-black text-white p-3 rounded-xl"><Plus size={20} /></button>}</div>
        <div className="relative bg-white rounded-[32px] border border-black/5 shadow-xl overflow-x-auto min-h-[200px]">
          <div className="absolute top-4 right-4 z-10"><InfoButton id="lts_sales" /></div>
          <GuidanceOverlay id="lts_sales" title="Myyntitavoitteet" text="Määrittele tuotteesi, hinta ja kuinka monta aiot myydä vuodessa." />
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 border-b border-black/5"><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Tuote</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Hinta</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Määrä</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Yhteensä</th>{!isReadOnly && <th className="px-8 py-6 w-16"></th>}</tr></thead>
            <tbody className="divide-y divide-black/5">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-6"><input type="text" value={p.name} onChange={(e) => handleUpdateProduct(p.id, {name: e.target.value})} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                  <td className="px-8 py-6"><input type="number" value={p.price} onChange={(e) => handleUpdateProduct(p.id, {price: Number(e.target.value)})} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                  <td className="px-8 py-6"><input type="number" value={p.volume} onChange={(e) => handleUpdateProduct(p.id, {volume: Number(e.target.value)})} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                  <td className="px-8 py-6 font-black text-emerald-600">{(p.price * p.volume).toLocaleString()} €</td>
                  {!isReadOnly && <td className="px-8 py-6"><button onClick={() => handleRemoveProduct(p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAdminWorkspace = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('administration')}</h2><p className="text-slate-400 text-sm">{t('defineAdministration')}</p></div>{!isReadOnly && renderSaveButton()}</div>
      <div className="relative bg-white rounded-[32px] border border-black/5 shadow-xl overflow-x-auto min-h-[250px]">
        <div className="absolute top-4 right-4 z-10"><InfoButton id="lts_admin" /></div>
        <GuidanceOverlay id="lts_admin" title="Hallinto" text="Listaa kiinteät kulut kuten vuokrat, kirjanpito ja vakuutukset." />
        <table className="w-full text-left min-w-[600px]">
          <thead><tr className="bg-slate-50 border-b border-black/5"><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Erä</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Kulu / kk</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Yhteensä / v</th>{!isReadOnly && <th className="px-8 py-6 w-16"></th>}</tr></thead>
          <tbody className="divide-y divide-black/5">
            {admin.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/50">
                <td className="px-8 py-6"><input type="text" value={a.item} onChange={(e) => setAdmin(admin.map(i => i.id === a.id ? {...i, item: e.target.value} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6"><input type="number" value={a.monthlyCost} onChange={(e) => setAdmin(admin.map(i => i.id === a.id ? {...i, monthlyCost: Number(e.target.value)} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6 font-black text-indigo-600">{(a.monthlyCost * 12).toLocaleString()} €</td>
                {!isReadOnly && <td className="px-8 py-6"><button onClick={() => setAdmin(admin.filter(i => i.id !== a.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCalculationsWorkspace = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('calculations')}</h2><p className="text-slate-400 text-sm">Yhteenveto ja budjetti.</p></div>{!isReadOnly && renderSaveButton()}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl">
          <div className="absolute top-6 right-6"><InfoButton id="lts_calc" /></div>
          <GuidanceOverlay id="lts_calc" title="Laskelmat" text="Tämä graafi näyttää tulojen ja kulujen suhteen. Käyttökate (EBITDA) kertoo toiminnan kannattavuudesta." />
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6">TULOT VS MENOT</h3>
          <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{chartData.map((e, idx) => (<Cell key={idx} fill={e.color} />))}</Bar></BarChart></ResponsiveContainer></div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6">VUOSIBUDJETTI</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2"><span className="font-bold">Liikevaihto</span><span className="font-black text-emerald-600">{totalRevenue.toLocaleString()} €</span></div>
            <div className="flex justify-between border-b pb-2"><span className="font-bold">Henkilöstökulut</span><span className="font-black text-red-500">-{totalPersonnelYear.toLocaleString()} €</span></div>
            <div className="flex justify-between border-b pb-2"><span className="font-bold">EBITDA</span><span className={`font-black ${ebitda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ebitda.toLocaleString()} €</span></div>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase text-slate-400">INVESTOINNIT</h3>
        <div className="relative bg-white rounded-[32px] border border-black/5 shadow-xl overflow-x-auto min-h-[150px]">
          <div className="absolute top-4 right-4 z-10"><InfoButton id="lts_inv" /></div>
          <GuidanceOverlay id="lts_inv" title="Investoinnit" text="Listaa tässä kertainvestoinnit kuten laitteet tai ohjelmistot." />
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 border-b border-black/5"><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Kohde</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Määrä</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Vuosi</th></tr></thead>
            <tbody className="divide-y divide-black/5">
              {investments.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-6"><input type="text" value={inv.description} onChange={(e) => setInvestments(investments.map(i => i.id === inv.id ? {...i, description: e.target.value} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                  <td className="px-8 py-6"><input type="number" value={inv.amount} onChange={(e) => setInvestments(investments.map(i => i.id === inv.id ? {...i, amount: Number(e.target.value)} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                  <td className="px-8 py-6"><input type="number" value={inv.year} onChange={(e) => setInvestments(investments.map(i => i.id === inv.id ? {...i, year: Number(e.target.value)} : i))} disabled={isReadOnly} className="w-full bg-transparent border-none font-bold p-0" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBusinessIdeaWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('businessIdea')}</h2><p className="text-slate-400 text-sm">{t('defineBusinessIdea')}</p></div>{!isReadOnly && renderSaveButton()}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['businessIdeaWhat', 'businessIdeaHow', 'businessIdeaForWhom'].map((field, i) => {
          const labels = ['Mitä?', 'Miten?', 'Kenelle?'];
          const guides = ["Mitä tuotteita tai palveluita myyt?", "Miten tuotanto ja toimitus tapahtuu?", "Ketkä ovat maksavat asiakkaasi?"];
          return (
            <div key={field} className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-3"><h3 className="text-[10px] md:text-xs font-black uppercase text-slate-400">{labels[i]}</h3><InfoButton id={`lts_${field}`} /></div>
              <GuidanceOverlay id={`lts_${field}`} title={labels[i]} text={guides[i]} />
              <textarea className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-medium resize-none" value={(basics as any)[field] || ''} onChange={(e) => setBasics({ ...basics, [field]: e.target.value })} disabled={isReadOnly} />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderEnvironmentWorkspace = (type: 'EXTERNAL_ENV' | 'INTERNAL_ENV') => {
    const isExternal = type === 'EXTERNAL_ENV';
    const data = isExternal ? externalEnv : internalEnv;
    const setData = isExternal ? setExternalEnv : setInternalEnv;
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{isExternal ? t('externalEnv') : t('internalEnv')}</h2><p className="text-slate-400 text-sm">{t('defineEnvironment')}</p></div>{!isReadOnly && renderSaveButton()}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative bg-white p-8 rounded-[32px] border border-emerald-100 shadow-xl min-h-[350px]">
            <div className="flex justify-between items-center mb-6"><h3 className="text-base font-black uppercase text-emerald-900">{isExternal ? 'Mahdollisuudet' : 'Vahvuudet'}</h3><InfoButton id={`${type}_pos`} /></div>
            <GuidanceOverlay id={`${type}_pos`} title="Positiiviset" text={isExternal ? "Tunnista markkinan mahdollisuudet ja kasvutrendit." : "Määrittele yrityksen sisäiset vahvuudet ja kilpailuedut."} />
            <div className="space-y-3">
              {data.filter(i => i.type === 'positive').map(item => (
                <div key={item.id} className="flex gap-2 group"><textarea className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500/20 resize-none" rows={2} value={item.text} onChange={(e) => setData(data.map(i => i.id === item.id ? {...i, text: e.target.value} : i))} disabled={isReadOnly} />{!isReadOnly && <button onClick={() => setData(data.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}</div>
              ))}
              {!isReadOnly && <button onClick={() => setData([...data, { id: Math.random().toString(36).substr(2, 9), text: '', type: 'positive' }])} className="w-full py-2 border-2 border-dashed border-emerald-50 rounded-xl text-emerald-400 text-xs font-bold">+ Lisää</button>}
            </div>
          </div>
          <div className="relative bg-white p-8 rounded-[32px] border border-red-100 shadow-xl min-h-[350px]">
            <div className="flex justify-between items-center mb-6"><h3 className="text-base font-black uppercase text-red-900">{isExternal ? 'Uhat' : 'Heikkoudet'}</h3><InfoButton id={`${type}_neg`} /></div>
            <GuidanceOverlay id={`${type}_neg`} title="Negatiiviset" text={isExternal ? "Tunnista ulkoiset riskit kuten kiristyvä kilpailu." : "Määrittele yrityksen sisäiset kehityskohteet tai puutteet."} />
            <div className="space-y-3">
              {data.filter(i => i.type === 'negative').map(item => (
                <div key={item.id} className="flex gap-2 group"><textarea className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500/20 resize-none" rows={2} value={item.text} onChange={(e) => setData(data.map(i => i.id === item.id ? {...i, text: e.target.value} : i))} disabled={isReadOnly} />{!isReadOnly && <button onClick={() => setData(data.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}</div>
              ))}
              {!isReadOnly && <button onClick={() => setData([...data, { id: Math.random().toString(36).substr(2, 9), text: '', type: 'negative' }])} className="w-full py-2 border-2 border-dashed border-red-50 rounded-xl text-red-400 text-xs font-bold">+ Lisää</button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStrategyWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('strategy')}</h2><p className="text-slate-400 text-sm">{t('defineStrategy')}</p></div>{!isReadOnly && renderSaveButton("bg-emerald-600")}</div>
      <div className="space-y-6">
        <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[200px]">
          <div className="flex justify-between items-center mb-2"><h3 className="text-base font-black text-slate-800">{t('visionAndValues')}</h3><InfoButton id="str_vis" /></div>
          <GuidanceOverlay id="str_vis" title="Visio" text="Määrittele tulevaisuuden tavoitetila ja arvot, jotka ohjaavat toimintaa." />
          <textarea className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-6 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium resize-none" value={strategy.visionAndValues} onChange={(e) => setStrategy({ ...strategy, visionAndValues: e.target.value })} disabled={isReadOnly} />
        </div>
        <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-2"><h3 className="text-base font-black text-slate-800">Diagnoosi</h3><InfoButton id="str_diag" /></div>
          <GuidanceOverlay id="str_diag" title="Diagnoosi" text="Tiivistä tähän toimintaympäristön analyysin löydökset. Mikä on strategian keskeinen haaste?" />
          <textarea className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-6 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium resize-none" value={strategy.diagnosis} onChange={(e) => setStrategy({ ...strategy, diagnosis: e.target.value })} disabled={isReadOnly} />
        </div>
        <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[250px]">
          <div className="flex justify-between items-center mb-2"><h3 className="text-base font-black text-slate-800">Miten</h3><InfoButton id="str_how" /></div>
          <GuidanceOverlay id="str_how" title="Toimenpiteet" text="Valitse max 6 konkreettista kyvykkyyttä, joilla erotutte kilpailijoista." />
          <div className="space-y-3">{(strategy.howItems || []).map((item, idx) => (<div key={item.id} className="flex gap-2 group"><div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0 mt-2 text-xs">{idx + 1}</div><textarea className="flex-1 bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-medium resize-none" value={item.text} onChange={(e) => { const n = [...(strategy.howItems || [])]; n[idx].text = e.target.value; setStrategy({ ...strategy, howItems: n }); }} disabled={isReadOnly} rows={2} /></div>))}</div>
        </div>
      </div>
    </div>
  );

  const renderCompanyWorkspace = () => {
    const modelType = basics.organizationModel?.type || 'LINE';
    const boxes = basics.organizationModel?.boxes || [];
    const connections = basics.organizationModel?.connections || [];
    const handleModelSelect = (type: any) => {
      let b = type === 'LINE' ? [{ id: '1', text: t('ceo'), x: 50, y: 15 }, { id: '2', text: t('sales'), x: 20, y: 60 }, { id: '3', text: t('production'), x: 50, y: 60 }] : [];
      let c = type === 'LINE' ? [{ id: 'c1', from: '1', to: '2' }, { id: 'c2', from: '1', to: '3' }] : [];
      setBasics({ ...basics, organizationModel: { type, boxes: b, connections: c } });
    };
    const handleMouseMove = (e: React.MouseEvent) => {
      if (!draggingId || isReadOnly) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setBasics({ ...basics, organizationModel: { ...basics.organizationModel!, boxes: boxes.map(b => b.id === draggingId ? { ...b, x, y } : b) } });
    };

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('company')}</h2><p className="text-slate-400 text-sm">{t('defineCompany')}</p></div>
          {!isReadOnly && renderSaveButton()}
        </div>
        <div className="bg-white p-6 md:p-10 rounded-[32px] border border-black/5 shadow-xl space-y-8">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2"><h3 className="text-lg font-bold">Yrityskuvaus</h3><InfoButton id="comp_desc" /></div>
            <GuidanceOverlay id="comp_desc" title="Yrityskuvaus" text="Määrittele yrityksesi toiminta, osaaminen ja nykytilanne." />
            <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-base resize-none" rows={4} value={basics.companyDescription || ''} onChange={(e) => setBasics({ ...basics, companyDescription: e.target.value })} disabled={isReadOnly} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><h3 className="text-lg font-bold">Organisaatiomalli</h3><InfoButton id="comp_org" /></div>{!isReadOnly && <button onClick={() => setBasics({...basics, organizationModel: {...basics.organizationModel!, boxes: [...boxes, { id: Date.now().toString(), text: 'Uusi', x: 50, y: 50 }]}})} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm">+ Lisää laatikko</button>}</div>
            <GuidanceOverlay id="comp_org" title="Malli" text={<div className="space-y-2"><p>• <strong>Linja:</strong> Perinteinen hierarkia.</p><p>• <strong>Matriisi:</strong> Tuotelinjat ja toiminnot yhdessä.</p><p>• <strong>Projekti:</strong> Joustava asiantuntijamalli.</p></div>} />
            <div className="relative bg-slate-50 rounded-2xl border border-slate-200 h-[500px] overflow-hidden select-none" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none">{connections.map(c => { const f = boxes.find(b => b.id === c.from); const t = boxes.find(b => b.id === c.to); return f && t ? <line key={c.id} x1={`${f.x}%`} y1={`${f.y}%`} x2={`${t.x}%`} y2={`${t.y}%`} stroke="#cbd5e1" strokeWidth="2" /> : null; })}</svg>
              {boxes.map(box => (
                <div key={box.id} className={`absolute p-2 bg-white border-2 ${draggingId === box.id ? 'border-emerald-500 shadow-lg z-20' : 'border-emerald-200 shadow-sm'} rounded-xl w-32 transform -translate-x-1/2 -translate-y-1/2 cursor-move group`} style={{ left: `${box.x}%`, top: `${box.y}%` }} onMouseDown={() => !isReadOnly && setDraggingId(box.id)}>
                  <input type="text" className="w-full text-center font-bold text-xs bg-transparent border-none p-0 focus:ring-0" value={box.text} onChange={(e) => setBasics({...basics, organizationModel: {...basics.organizationModel!, boxes: boxes.map(b => b.id === box.id ? {...b, text: e.target.value} : b)}})} disabled={isReadOnly} />
                  {!isReadOnly && <button className="absolute -right-2 -top-2 w-5 h-5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }}><Trash2 size={12} className="mx-auto" /></button>}
                </div>
              ))}
            </div>
            {!isReadOnly && boxes.length > 1 && (
              <div className="mt-6 flex gap-4 p-4 bg-slate-50 rounded-xl items-end">
                <div className="flex-1"><label className="block text-[10px] font-bold text-slate-500 mb-1">Mistä</label><select className="w-full rounded-lg text-sm border-slate-200" value={newConnFrom} onChange={(e) => setNewConnFrom(e.target.value)}><option value="">Valitse</option>{boxes.map(b => (<option key={b.id} value={b.id}>{b.text}</option>))}</select></div>
                <div className="flex-1"><label className="block text-[10px] font-bold text-slate-500 mb-1">Mihin</label><select className="w-full rounded-lg text-sm border-slate-200" value={newConnTo} onChange={(e) => setNewConnTo(e.target.value)}><option value="">Valitse</option>{boxes.map(b => (<option key={b.id} value={b.id}>{b.text}</option>))}</select></div>
                <button onClick={() => { if(newConnFrom && newConnTo && newConnFrom !== newConnTo) { setBasics({...basics, organizationModel: {...basics.organizationModel!, connections: [...connections, { id: Date.now().toString(), from: newConnFrom, to: newConnTo }]}}); setNewConnFrom(''); setNewConnTo(''); } }} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Yhdistä</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProjectWorkspace = () => {
    const handleAddPhase = () => setProject({ ...project, phases: [...project.phases, { id: Math.random().toString(36).substr(2, 9), name: '', description: '', status: 'NOT_STARTED' }] });
    const handleUpdatePhase = (id: string, field: keyof ProjectPhase, value: string) => setProject({ ...project, phases: project.phases.map(p => p.id === id ? { ...p, [field]: value } : p) });
    const handleRemovePhase = (id: string) => setProject({ ...project, phases: project.phases.filter(p => p.id !== id) });

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('myProject')}</h2><p className="text-slate-400 text-sm">{t('defineProject')}</p></div>{!isReadOnly && renderSaveButton()}</div>
        <div className="flex flex-wrap gap-2">
          {projects.map(p => (
            <button key={p.id} onClick={() => setActiveProjectId(p.id || 'default')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeProjectId === p.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 border border-black/5'}`}>
              {p.title || p.ownerName || 'Oma projekti'}
            </button>
          ))}
          {!isReadOnly && <button onClick={() => { const id = Math.random().toString(36).substr(2, 9); setProjects([...projects, { id, ownerId: user?.uid || 'default', ownerName: 'Uusi projekti', title: '', description: '', phases: [], linkedFocusAreas: [], linkedActivities: '', linkedResources: '', strategicAlignment: '', businessModelAlignment: '' }]); setActiveProjectId(id); }} className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 flex items-center gap-2"><Plus size={16} /> {t('addProject')}</button>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-lg space-y-6">
              <div className="absolute top-6 right-6"><InfoButton id="proj_help" /></div>
              <GuidanceOverlay id="proj_help" title="Projekti" text="Määrittele strategiaa toteuttava hanke, sen tavoitteet ja vaiheet." />
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Projektin nimi</label><input type="text" value={project.title} onChange={(e) => setProject({...project, title: e.target.value})} className="w-full bg-slate-50 border rounded-2xl px-4 py-3" /></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Kuvaus</label><textarea value={project.description} onChange={(e) => setProject({...project, description: e.target.value})} className="w-full bg-slate-50 border rounded-2xl px-4 py-3 min-h-[120px]" /></div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-lg">
              <div className="flex items-center justify-between mb-6"><div><h3 className="text-lg font-black uppercase tracking-tight">Vaiheet</h3><p className="text-slate-400 text-sm">Palastele toteutus vaiheisiin.</p></div>{!isReadOnly && <button onClick={handleAddPhase} className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Plus size={20} /></button>}</div>
              <div className="space-y-4">
                {project.phases.map((ph, idx) => (
                  <div key={ph.id} className="bg-slate-50 p-4 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-slate-400">{idx + 1}</div><input type="text" value={ph.name} onChange={(e) => handleUpdatePhase(ph.id, 'name', e.target.value)} className="flex-1 bg-transparent border-none font-bold" />{!isReadOnly && <button onClick={() => handleRemovePhase(ph.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}</div>
                    <textarea value={ph.description} onChange={(e) => handleUpdatePhase(ph.id, 'description', e.target.value)} className="w-full bg-white border border-black/5 rounded-xl px-3 py-2 text-sm h-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="relative bg-slate-900 text-white p-8 rounded-[32px] shadow-2xl">
              <div className="absolute top-6 right-6"><InfoButton id="proj_strat" /></div>
              <GuidanceOverlay id="proj_strat" title="Kytkös" text="Miten projekti toteuttaa strategian kyvykkyyksiä?" />
              <h3 className="text-sm font-black uppercase text-emerald-400 mb-4">Strateginen kytkös</h3>
              <textarea value={project.strategicAlignment || ''} onChange={(e) => setProject({...project, strategicAlignment: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm h-32" />
            </div>
            <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-lg">
              <div className="absolute top-6 right-6"><InfoButton id="proj_bm" /></div>
              <GuidanceOverlay id="proj_bm" title="Liiketoimintamalli" text="Miten projekti vahvistaa liiketoimintamallianne?" />
              <h3 className="text-sm font-black uppercase text-indigo-500 mb-4">Liiketoimintamalli</h3>
              <textarea value={project.businessModelAlignment || ''} onChange={(e) => setProject({...project, businessModelAlignment: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImplementationWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl md:text-3xl font-black uppercase">{t('implementation')}</h2><p className="text-slate-400 font-medium text-sm">{t('defineProject')}</p></div>{!isReadOnly && (<div className="flex gap-4"><button onClick={() => setImplementationPhases([...implementationPhases, { id: Math.random().toString(36).substr(2, 9), task: '', schedule: '', responsible: '', status: 'NOT_STARTED' }])} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition-all shadow-lg"><Plus size={20} /> <span>{t('addPhase')}</span></button>{renderSaveButton()}</div>)}</div>
      <div className="relative bg-white rounded-[32px] border border-black/5 shadow-xl overflow-x-auto min-h-[300px]">
        <div className="absolute top-4 right-4 z-10"><InfoButton id="lts_impl" /></div>
        <GuidanceOverlay id="lts_impl" title="Toteutus" text="Määrittele askeleet, aikataulu ja vastuuhenkilö strategian toteutukselle." />
        <table className="w-full text-left min-w-[800px]">
          <thead><tr className="bg-slate-50 border-b border-black/5"><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 w-1/3">Toimenpide</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 w-1/4">Aikataulu</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 w-1/4">Vastuu</th><th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Tila</th></tr></thead>
          <tbody className="divide-y divide-black/5">
            {implementationPhases.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-8 py-6"><input type="text" value={p.task} onChange={(e) => setImplementationPhases(implementationPhases.map(i => i.id === p.id ? {...i, task: e.target.value} : i))} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6"><input type="text" value={p.schedule} onChange={(e) => setImplementationPhases(implementationPhases.map(i => i.id === p.id ? {...i, schedule: e.target.value} : i))} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6"><input type="text" value={p.responsible} onChange={(e) => setImplementationPhases(implementationPhases.map(i => i.id === p.id ? {...i, responsible: e.target.value} : i))} className="w-full bg-transparent border-none font-bold p-0" /></td>
                <td className="px-8 py-6"><select value={p.status} onChange={(e) => setImplementationPhases(implementationPhases.map(i => i.id === p.id ? {...i, status: e.target.value as any} : i))} className="bg-transparent border-none font-bold p-0 text-sm cursor-pointer"><option value="NOT_STARTED">Ei aloitettu</option><option value="IN_PROGRESS">Käynnissä</option><option value="COMPLETED">Valmis</option></select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDownloadWorkspace = () => (
    <div className="space-y-6 md:space-y-12">
      <div className="text-center"><h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase mb-2">{t('downloadPlan')}</h2><p className="text-slate-400 font-medium">{t('downloadPlanDesc')}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6">{t('coverImage')}</h3>
          <label className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group cursor-pointer hover:border-indigo-400 transition-all relative overflow-hidden">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {basics.coverImage ? <img src={basics.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" /> : <Camera size={40} className="text-slate-300 group-hover:text-indigo-400" />}
          </label>
        </div>
        <div className="relative bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black uppercase text-slate-400">Taustatiedot</h3><InfoButton id="lts_final_bg" /></div>
          <GuidanceOverlay id="lts_final_bg" title="Taustatiedot" text="Tämä teksti näkyy esittelysivulla. Kerro lyhyesti yrityksestäsi tai tiimistäsi." />
          <textarea className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-6 focus:ring-2 focus:ring-indigo-500/10 outline-none resize-none font-medium" placeholder="Lyhyt esittely..." value={basics.background || ''} onChange={(e) => setBasics({ ...basics, background: e.target.value })} disabled={isReadOnly} />
        </div>
      </div>
      <button onClick={generatePDF} disabled={isGeneratingPDF} className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-xl uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-black transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50">
        {isGeneratingPDF ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />} {t('downloadPdfFile')}
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'COMPANY_FORM': return renderDefaultWorkspace(t('companyForm'), t('chooseCompanyForm'), basics.companyForm, (v) => setBasics({...basics, companyForm: v}), "Valitse yritysmuoto. Tämä vaikuttaa verotukseen ja vastuisiin.");
      case 'BACKGROUND': return renderDefaultWorkspace("Taustani", "Kuvaa osaamisesi.", basics.background, (v) => setBasics({...basics, background: v}), "Kerro osaamisestasi, koulutuksestasi ja kokemuksestasi.");
      case 'PERUSTEET': return renderDefaultWorkspace(t('basics'), "Tiivistä ydin.", basics.businessIdea, (v) => setBasics({...basics, businessIdea: v}), "Tiivistä yrityksen perustiedot ja toiminnan lähtökohdat.");
      case 'BUSINESS_IDEA': return renderBusinessIdeaWorkspace();
      case 'YRITYS': return renderCompanyWorkspace();
      case 'STRATEGIA': return renderStrategyWorkspace();
      case 'PROJEKTINI': return renderProjectWorkspace();
      case 'CONTRIBUTION': return renderProjectWorkspace();
      case 'BUSINESS_MODEL': return renderBusinessModelWorkspace();
      case 'TOTEUTUS': return renderImplementationWorkspace();
      case 'LASKELMAT': return renderCalculationsWorkspace();
      case 'PERSONNEL': return renderPersonnelWorkspace();
      case 'SALES_MARKETING': return renderMarketingWorkspace();
      case 'HALLINTO': return renderAdminWorkspace();
      case 'DOWNLOAD': return renderDownloadWorkspace();
      case 'YMPÄRISTÖ': return renderEnvironmentWorkspace('EXTERNAL_ENV');
      case 'EXTERNAL_ENV': return renderEnvironmentWorkspace('EXTERNAL_ENV');
      case 'INTERNAL_ENV': return renderEnvironmentWorkspace('INTERNAL_ENV');
      default: return (<div className="p-8 text-center text-slate-400">Section {activeSection} ready.</div>);
    }
  };

  const renderPrintView = () => (
    <div id="pdf-export-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
      <div className="pdf-page bg-white relative overflow-hidden" style={{ width: '794px', height: '1123px', padding: '50px' }}>
        <div className="h-full flex flex-col items-center justify-center text-center">
          {basics.coverImage && <img src={basics.coverImage} alt="Cover" className="w-64 h-64 object-cover rounded-full mb-12" />}
          <h1 className="text-3xl font-thin uppercase tracking-widest text-slate-900 mb-6">{portalType === 'LTS' ? 'Liiketoimintasuunnitelma' : 'Strategia'}</h1>
          <p className="text-xl text-slate-600 font-light">{basics.companyDescription || 'MISSING DESCRIPTION'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      {renderPrintView()}
    </div>
  );
};
