import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Save, 
  ChevronDown, 
  ChevronUp,
  Layout,
  Target,
  Users,
  TrendingUp,
  Briefcase,
  Download,
  Info,
  Camera,
  FileText,
  Calculator,
  Loader2,
  MessageSquare,
  Calendar,
  User,
  UserCircle,
  UserSquare,
  UserRound
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
// @ts-ignore
import domtoimage from 'dom-to-image-more';
import { 
  PlanSection, 
  PortalType, 
  Product, 
  PersonnelExpense, 
  MarketingExpense, 
  AdminExpense, 
  Investment,
  BuyerPersona,
  UserAccount,
  UserRole
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
  const [products, setProducts] = useState<Product[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelExpense[]>([]);
  const [marketing, setMarketing] = useState<MarketingExpense[]>([]);
  const [buyerPersonas, setBuyerPersonas] = useState<BuyerPersona[]>([]);
  const [admin, setAdmin] = useState<AdminExpense[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [externalEnv, setExternalEnv] = useState<EnvironmentPhenomenon[]>([]);
  const [internalEnv, setInternalEnv] = useState<EnvironmentPhenomenon[]>([]);
  const [strategy, setStrategy] = useState<StrategyData>({
    visionAndValues: '',
    diagnosis: '',
    how: '',
    howItems: []
  });
  const [implementationPhases, setImplementationPhases] = useState<ImplementationPhase[]>([]);
  const [businessModel, setBusinessModel] = useState<BusinessModelData>({
    keyActivities: '',
    keyResources: '',
    valueProposition: '',
    channels: '',
    customers: '',
    costs: '',
    revenues: ''
  });
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');

  const project = projects.find(p => p.id === activeProjectId) || {
    id: activeProjectId,
    ownerId: user?.uid || 'default',
    ownerName: user?.displayName || 'Oma projekti',
    title: '',
    description: '',
    phases: [],
    linkedFocusAreas: [],
    linkedActivities: '',
    linkedResources: '',
    strategicAlignment: '',
    businessModelAlignment: ''
  };

  const setProject = (updatedProject: ProjectData) => {
    setProjects(prev => {
      const exists = prev.find(p => p.id === updatedProject.id);
      if (exists) {
        return prev.map(p => p.id === updatedProject.id ? updatedProject : p);
      } else {
        return [...prev, updatedProject];
      }
    });
  };

  const [basics, setBasics] = useState<BasicsData>({
    companyForm: '',
    background: '',
    businessIdea: '',
    businessIdeaWhat: '',
    businessIdeaHow: '',
    businessIdeaForWhom: '',
    operatingIdea: '',
    contribution: ''
  });
  const [genericNotes, setGenericNotes] = useState<Record<string, string>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Global calculations for PrintView and CalculationsWorkspace
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

  const expenseBreakdown = [
    { name: 'Henkilöstö', value: totalPersonnelYear },
    { name: 'Markkinointi', value: totalMarketingYear },
    { name: 'Hallinto', value: totalAdminYear },
  ].filter(item => item.value > 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBasics({ ...basics, coverImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Organization Model workspace state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [newConnFrom, setNewConnFrom] = useState<string>('');
  const [newConnTo, setNewConnTo] = useState<string>('');

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    setPdfError(null);
    try {
      const container = document.getElementById('pdf-export-container');
      if (!container) {
        throw new Error('PDF container not found');
      }
      
      // Ensure charts are rendered by waiting a tick
      await new Promise(resolve => setTimeout(resolve, 500));

      const pages = container.querySelectorAll('.pdf-page');
      if (pages.length === 0) {
        throw new Error('No pages found to export');
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // We use dom-to-image-more because it uses SVG foreignObject which natively supports 
        // modern CSS features like oklch and color-mix, unlike html2canvas which tries to parse CSS.
        const imgData = await domtoimage.toJpeg(page, {
          quality: 0.95,
          bgcolor: '#ffffff',
          width: page.offsetWidth,
          height: page.offsetHeight,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }
        });
        
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      
      doc.save(`${portalType === 'LTS' ? t('businessPlan') : t('strategyPlan')}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      setPdfError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Load data from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      if (!auth.currentUser) {
        // Fallback to localStorage if not logged in
        const savedData = localStorage.getItem(`business_plan_data_${portalType}`);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            applyLoadedData(parsed);
          } catch (e) {
            console.error("Error parsing local storage data", e);
          }
        }
        setIsLoading(false);
        return;
      }

      try {
        const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser.uid);
        const planRef = doc(db, 'users', targetUid, 'businessPlan', portalType);
        const planSnap = await getDoc(planRef);
        
        if (planSnap.exists()) {
          applyLoadedData(planSnap.data());
        } else {
          // Try to load from local storage as fallback for first time
          const savedData = localStorage.getItem(`business_plan_data_${portalType}`);
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              applyLoadedData(parsed);
            } catch (e) {
              console.error("Error parsing local storage data", e);
            }
          }
        }
      } catch (error) {
        const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser?.uid);
        handleFirestoreError(error, OperationType.GET, `users/${targetUid}/businessPlan/${portalType}`);
      } finally {
        setIsLoading(false);
      }
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
    if (parsed.strategy) {
      let loadedStrategy = parsed.strategy;
      // Migrate old 'how' text to 'howItems' array
      if (!loadedStrategy.howItems || loadedStrategy.howItems.length === 0) {
        if (loadedStrategy.how && loadedStrategy.how.trim()) {
          const lines = loadedStrategy.how.split(/\n/).map((l: string) => l.replace(/^[-*•]\s*/, '').trim()).filter((l: string) => l.length > 0);
          loadedStrategy.howItems = lines.slice(0, 6).map((text: string) => ({
            id: Math.random().toString(36).substr(2, 9),
            text
          }));
        } else {
          loadedStrategy.howItems = [];
        }
      }
      setStrategy(loadedStrategy);
    }
    if (parsed.businessModel) setBusinessModel(parsed.businessModel);
    if (parsed.projects) {
      setProjects(parsed.projects);
    } else if (parsed.project) {
      setProjects([{ ...parsed.project, id: 'default', ownerId: user?.uid || 'default', ownerName: 'Oma projekti' }]);
    }
    if (parsed.basics) setBasics(parsed.basics);
    if (parsed.genericNotes) setGenericNotes(parsed.genericNotes);
  };

  // Save data to localStorage whenever it changes (as a backup)
  useEffect(() => {
    const dataToSave = {
      products,
      personnel,
      marketing,
      buyerPersonas,
      admin,
      investments,
      externalEnv,
      internalEnv,
      strategy,
      businessModel,
      projects,
      basics,
      implementationPhases,
      genericNotes
    };
    localStorage.setItem(`business_plan_data_${portalType}`, JSON.stringify(dataToSave));
  }, [products, personnel, marketing, buyerPersonas, admin, investments, externalEnv, internalEnv, strategy, businessModel, projects, basics, implementationPhases, genericNotes, portalType]);

  const saveToFirebase = async () => {
    if (!auth.currentUser || isReadOnly) return;
    
    setIsSaving(true);
    try {
      const dataToSave = {
        products,
        personnel,
        marketing,
        buyerPersonas,
        admin,
        investments,
        externalEnv,
        internalEnv,
        strategy,
        businessModel,
        projects,
        basics,
        implementationPhases,
        genericNotes,
        updatedAt: new Date().toISOString()
      };
      
      const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser.uid);
      const planRef = doc(db, 'users', targetUid, 'businessPlan', portalType);
      await setDoc(planRef, dataToSave);
      
      // Optional: Show a success toast or indicator here
    } catch (error) {
      const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser?.uid);
      handleFirestoreError(error, OperationType.WRITE, `users/${targetUid}/businessPlan/${portalType}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save to Firebase
  useEffect(() => {
    if (isLoading || !auth.currentUser || isReadOnly) return;

    const timeoutId = setTimeout(() => {
      saveToFirebase();
    }, 2000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, personnel, marketing, admin, investments, externalEnv, internalEnv, strategy, businessModel, projects, basics, implementationPhases, genericNotes]);

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: 0,
      volume: 0
    };
    setProducts([...products, newProduct]);
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const renderSaveButton = (className = "") => (
    <button 
      onClick={saveToFirebase}
      disabled={isSaving}
      className={`text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 w-fit disabled:opacity-70 disabled:cursor-not-allowed ${className || 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
    >
      {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
      <span>{isSaving ? t('saving') : t('save')}</span>
    </button>
  );

const renderPersonnelWorkspace = () => {
    // Lasketaan sivukulukerroin (1.23 = 23% palkan sivukulut)
    const SIDE_COST_FACTOR = 0.23;
    const baseMonthlySalaries = personnel.reduce((acc, p) => acc + (p.salary * p.count), 0);
    const calculatedSideCosts = baseMonthlySalaries * SIDE_COST_FACTOR;
    const totalWithSideCosts = baseMonthlySalaries + calculatedSideCosts;

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('personnel')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('definePersonnel')}</p>
          </div>
          {!isReadOnly && (
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button 
                onClick={() => setPersonnel([...personnel, { id: Math.random().toString(36).substr(2, 9), role: '', salary: 0, count: 1 }])}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 w-fit"
              >
                <Plus size={20} />
                <span>{t('addPerson')}</span>
              </button>
              {renderSaveButton()}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-black/5">
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('roleTask')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('monthlySalaryEur')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('count')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('totalEurMonth')}</th>
                {!isReadOnly && <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {personnel.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="text" 
                      value={p.role}
                      onChange={(e) => setPersonnel(personnel.map(item => item.id === p.id ? { ...item, role: e.target.value } : item))}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 placeholder:text-slate-200 text-sm md:text-base"
                      placeholder="Esim. Toimitusjohtaja..."
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="number" 
                      value={p.salary}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPersonnel(personnel.map(item => item.id === p.id ? { ...item, salary: Number(e.target.value) } : item))}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="number" 
                      value={p.count}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPersonnel(personnel.map(item => item.id === p.id ? { ...item, count: Number(e.target.value) } : item))}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6 font-black text-indigo-600 text-sm md:text-base">
                    {(p.salary * p.count).toLocaleString()} €
                  </td>
                  {!isReadOnly && (
                    <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                      <button 
                        onClick={() => setPersonnel(personnel.filter(item => item.id !== p.id))}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {personnel.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 md:px-8 py-12 text-center text-slate-300 font-medium italic">
                    {t('noPersonnelYet')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-black/5">
                <td colSpan={3} className="px-4 md:px-8 py-3 text-right font-bold text-slate-500 text-[10px] uppercase tracking-wider">
                  Palkan sivukulut (TyEL, vakuutukset ym. ~23%)
                </td>
                <td colSpan={2} className="px-4 md:px-8 py-3 font-bold text-slate-900 text-sm">
                  +{calculatedSideCosts.toLocaleString()} €
                </td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="px-4 md:px-8 py-4 md:py-6 font-black uppercase tracking-widest text-[10px] md:text-xs">
                  Henkilöstökulut yhteensä (sis. sivukulut)
                </td>
                <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black text-lg md:text-xl">
                  {Math.round(totalWithSideCosts).toLocaleString()} € / kk
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Huomautus:</strong> Budjetti laskee automaattisesti palkan päälle n. 23 % sivukuluja. 
            Tämä on Suomessa realistinen arvio TyEL-maksuista, vakuutuksista ja muista työnantajakuluista.
          </p>
        </div>
      </div>
    );
  };

  const renderMarketingWorkspace = () => (
    <div className="space-y-12">
      {/* Market Size & Target Audiences */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('marketSize')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineMarketSize')}</p>
          </div>
          {!isReadOnly && renderSaveButton()}
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl">
          <textarea
            value={genericNotes.marketSize || ''}
            onChange={(e) => setGenericNotes({ ...genericNotes, marketSize: e.target.value })}
            disabled={isReadOnly}
            className="w-full h-40 bg-slate-50 border-none rounded-2xl p-6 focus:ring-2 focus:ring-black/5 outline-none text-sm md:text-base font-medium leading-relaxed resize-none"
            placeholder="Esim. Markkinan kokonaisarvo on X miljoonaa euroa. Pääkohderyhmämme ovat..."
          />
        </div>
      </div>

      {/* Buyer Personas */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('buyerPersonas')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineBuyerPersonas')}</p>
          </div>
          {!isReadOnly && (
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button 
                onClick={() => setBuyerPersonas([...(buyerPersonas || []), { id: Math.random().toString(36).substr(2, 9), name: '', description: '', painPoints: '', goals: '' }])}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 w-fit"
              >
                <Plus size={20} />
                <span>{t('addPersona')}</span>
              </button>
              {renderSaveButton()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(buyerPersonas || []).map((persona) => (
            <div key={persona.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl relative group">
              {!isReadOnly && (
                <button 
                  onClick={() => setBuyerPersonas((buyerPersonas || []).filter(p => p.id !== persona.id))}
                  className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Persoonan nimi</label>
                  <input
                    type="text"
                    value={persona.name}
                    onChange={(e) => setBuyerPersonas((buyerPersonas || []).map(p => p.id === persona.id ? { ...p, name: e.target.value } : p))}
                    disabled={isReadOnly}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black/5 outline-none font-bold text-lg"
                    placeholder="Esim. 'Kiireinen yrittäjä Kalle'"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('description')}</label>
                  <textarea
                    value={persona.description}
                    onChange={(e) => setBuyerPersonas((buyerPersonas || []).map(p => p.id === persona.id ? { ...p, description: e.target.value } : p))}
                    disabled={isReadOnly}
                    className="w-full h-24 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium resize-none"
                    placeholder="Ikä, ammatti, kiinnostuksen kohteet..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Haasteet / Kipupisteet</label>
                  <textarea
                    value={persona.painPoints}
                    onChange={(e) => setBuyerPersonas((buyerPersonas || []).map(p => p.id === persona.id ? { ...p, painPoints: e.target.value } : p))}
                    disabled={isReadOnly}
                    className="w-full h-24 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium resize-none"
                    placeholder="Mitkä asiat turhauttavat tai vievät aikaa?"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tavoitteet</label>
                  <textarea
                    value={persona.goals}
                    onChange={(e) => setBuyerPersonas((buyerPersonas || []).map(p => p.id === persona.id ? { ...p, goals: e.target.value } : p))}
                    disabled={isReadOnly}
                    className="w-full h-24 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium resize-none"
                    placeholder="Mitä persoona haluaa saavuttaa?"
                  />
                </div>
              </div>
            </div>
          ))}
          {(!buyerPersonas || buyerPersonas.length === 0) && (
            <div className="col-span-full p-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-200 rounded-[32px]">
              {t('noBuyerPersonasYet')}
            </div>
          )}
        </div>
      </div>

      {/* Marketing Expenses Part */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('marketingActivities')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineMarketingActivities')}</p>
          </div>
          {!isReadOnly && (
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button 
                onClick={() => setMarketing([...marketing, { id: Math.random().toString(36).substr(2, 9), activity: '', monthlyCost: 0 }])}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 w-fit"
              >
                <Plus size={20} />
                <span>{t('addAction')}</span>
              </button>
              {renderSaveButton()}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-black/5">
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('actionChannel')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('monthlyCostEur')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('annualCostEur')}</th>
                {!isReadOnly && <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {marketing.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="text" 
                      value={m.activity}
                      onChange={(e) => setMarketing(marketing.map(item => item.id === m.id ? { ...item, activity: e.target.value } : item))}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 placeholder:text-slate-200 text-sm md:text-base"
                      placeholder="Esim. Google Ads..."
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="number" 
                      value={m.monthlyCost}
                      onChange={(e) => setMarketing(marketing.map(item => item.id === m.id ? { ...item, monthlyCost: Number(e.target.value) } : item))}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6 font-black text-indigo-600 text-sm md:text-base">
                    {(m.monthlyCost * 12).toLocaleString()} €
                  </td>
                  {!isReadOnly && (
                    <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                      <button 
                        onClick={() => setMarketing(marketing.filter(item => item.id !== m.id))}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {marketing.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 md:px-8 py-12 text-center text-slate-300 font-medium italic">
                    {t('noMarketingActivitiesYet')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black uppercase tracking-widest text-[10px] md:text-xs">{t('totalMarketingCostsYear')}</td>
                <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black text-lg md:text-xl">
                  {marketing.reduce((acc, m) => acc + (m.monthlyCost * 12), 0).toLocaleString()} €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Sales / Revenue Part */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('salesTargets')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineSalesTargets')}</p>
          </div>
          {!isReadOnly && (
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button 
                onClick={handleAddProduct}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 w-fit"
              >
                <Plus size={20} />
                <span>{t('addProduct')}</span>
              </button>
              {renderSaveButton()}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-black/5">
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('productService')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('priceEur')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('amountPcsYr')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('revenueEur')}</th>
                {!isReadOnly && <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="text" 
                      value={product.name}
                      onChange={(e) => handleUpdateProduct(product.id, { name: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 placeholder:text-slate-200 text-sm md:text-base"
                      placeholder="Tuotteen nimi..."
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="number" 
                      value={product.price}
                      onChange={(e) => handleUpdateProduct(product.id, { price: Number(e.target.value) })}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <input 
                      type="number" 
                      value={product.volume}
                      onChange={(e) => handleUpdateProduct(product.id, { volume: Number(e.target.value) })}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                    />
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-6 font-black text-indigo-600 text-sm md:text-base">
                    {(product.price * product.volume).toLocaleString()} €
                  </td>
                  {!isReadOnly && (
                    <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                      <button 
                        onClick={() => handleRemoveProduct(product.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 md:px-8 py-12 text-center text-slate-300 font-medium italic">
                    {t('noProductsYet')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="px-4 md:px-8 py-4 md:py-6 font-black uppercase tracking-widest text-[10px] md:text-xs">{t('totalEstimatedRevenue')}</td>
                <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black text-lg md:text-xl">
                  {products.reduce((acc, p) => acc + (p.price * p.volume), 0).toLocaleString()} €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAdminWorkspace = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('administration')}</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineAdministration')}</p>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap gap-3 md:gap-4">
            <button 
              onClick={() => setAdmin([...admin, { id: Math.random().toString(36).substr(2, 9), item: '', monthlyCost: 0 }])}
              className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 w-fit"
            >
              <Plus size={20} />
              <span>{t('addExpense')}</span>
            </button>
            {renderSaveButton()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-black/5">
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('expenseItem')}</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('monthlyCostEur')}</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('annualCostEur')}</th>
              {!isReadOnly && <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {admin.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <input 
                    type="text" 
                    value={a.item}
                    onChange={(e) => setAdmin(admin.map(item => item.id === a.id ? { ...item, item: e.target.value } : item))}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 placeholder:text-slate-200 text-sm md:text-base"
                    placeholder="Esim. Toimitilan vuokra..."
                  />
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <input 
                    type="number" 
                    value={a.monthlyCost}
                    onChange={(e) => setAdmin(admin.map(item => item.id === a.id ? { ...item, monthlyCost: Number(e.target.value) } : item))}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                  />
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6 font-black text-indigo-600 text-sm md:text-base">
                  {(a.monthlyCost * 12).toLocaleString()} €
                </td>
                {!isReadOnly && (
                  <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                    <button 
                      onClick={() => setAdmin(admin.filter(item => item.id !== a.id))}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {admin.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 md:px-8 py-12 text-center text-slate-300 font-medium italic">
                  {t('noAdminExpensesYet')}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white">
              <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black uppercase tracking-widest text-[10px] md:text-xs">{t('totalAdminCostsYear')}</td>
              <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black text-lg md:text-xl">
                {admin.reduce((acc, a) => acc + (a.monthlyCost * 12), 0).toLocaleString()} €
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const renderCalculationsWorkspace = () => {
    return (
      <div className="space-y-8 md:space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('calculations')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineCalculations')}</p>
          </div>
          {!isReadOnly && renderSaveButton()}
        </div>

        {/* Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-black/5 shadow-xl">
            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-400 mb-4 md:mb-6">TULOT VS MENOT</h3>
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-black/5 shadow-xl">
            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-400 mb-4 md:mb-6">KULURAKENNE</h3>
            <div className="h-[250px] md:h-[300px] w-full flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#6366f1'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-row md:flex-col flex-wrap justify-center gap-3 md:gap-2 md:pr-8">
                {expenseBreakdown.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: ['#ef4444', '#f59e0b', '#6366f1'][index % 3] }}></div>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Budget Calculator */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-400">VUOSIBUDJETTI (KOOSTE)</h3>
          <div className="bg-white rounded-[32px] md:rounded-[40px] border border-black/5 shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 space-y-3 md:space-y-4">
              <div className="flex justify-between items-center py-3 md:py-4 border-b border-slate-50">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] md:text-xs">Liikevaihto (Myyntitavoitteet)</span>
                <span className="font-black text-emerald-600 text-sm md:text-base">+{totalRevenue.toLocaleString()} €</span>
              </div>
              <div className="flex justify-between items-center py-3 md:py-4 border-b border-slate-50">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] md:text-xs">{t('personnelCostsYear')}</span>
                <span className="font-black text-red-500 text-sm md:text-base">-{totalPersonnelYear.toLocaleString()} €</span>
              </div>
              <div className="flex justify-between items-center py-3 md:py-4 border-b border-slate-50">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] md:text-xs">{t('marketingCostsYear')}</span>
                <span className="font-black text-red-500 text-sm md:text-base">-{totalMarketingYear.toLocaleString()} €</span>
              </div>
              <div className="flex justify-between items-center py-3 md:py-4 border-b border-slate-50">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] md:text-xs">{t('adminCostsYear')}</span>
                <span className="font-black text-red-500 text-sm md:text-base">-{totalAdminYear.toLocaleString()} €</span>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-6 md:pt-8 gap-2">
                <span className="font-black text-slate-900 uppercase tracking-widest text-xs md:text-base">Käyttökate (EBITDA)</span>
                <span className={`text-2xl md:text-3xl font-black ${ebitda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {ebitda.toLocaleString()} €
                </span>
              </div>
            </div>
            <div className="bg-slate-900 p-6 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Laskelmat päivittyvät automaattisesti muiden osioiden perusteella</p>
            </div>
          </div>
        </div>

        {/* Investments Table with Funding Source */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">INVESTOINNIT JA RAHOITUS</h3>
            {!isReadOnly && (
              <button 
                onClick={() => setInvestments([...investments, { id: Math.random().toString(36).substr(2, 9), description: '', amount: 0, year: new Date().getFullYear(), sourceOfFunding: '' } as any])}
                className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
              >
                <Plus size={14} />
                {t('addInvestment')}
              </button>
            )}
          </div>
          <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px] md:min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-black/5">
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('description')}</th>
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Rahan lähde</th>
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('amountEur')}</th>
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('year')}</th>
                  {!isReadOnly && <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {investments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <input 
                        type="text" 
                        value={inv.description}
                        onChange={(e) => setInvestments(investments.map(item => item.id === inv.id ? { ...item, description: e.target.value } : item))}
                        disabled={isReadOnly}
                        className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 placeholder:text-slate-200 text-sm md:text-base"
                        placeholder="Esim. Konehankinta..."
                      />
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <input 
                        type="text" 
                        value={(inv as any).sourceOfFunding || ''}
                        onChange={(e) => setInvestments(investments.map(item => item.id === inv.id ? { ...item, sourceOfFunding: e.target.value } : item))}
                        disabled={isReadOnly}
                        className="w-full bg-transparent border-none focus:ring-0 font-medium p-0 placeholder:text-slate-200 text-sm md:text-base"
                        placeholder="Esim. Oma raha / Laina"
                      />
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <input 
                        type="number" 
                        value={inv.amount}
                        onChange={(e) => setInvestments(investments.map(item => item.id === inv.id ? { ...item, amount: Number(e.target.value) } : item))}
                        disabled={isReadOnly}
                        className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                      />
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <input 
                        type="number" 
                        value={inv.year}
                        onChange={(e) => setInvestments(investments.map(item => item.id === inv.id ? { ...item, year: Number(e.target.value) } : item))}
                        disabled={isReadOnly}
                        className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base"
                      />
                    </td>
                    {!isReadOnly && (
                      <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                        <button 
                          onClick={() => setInvestments(investments.filter(item => item.id !== inv.id))}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {investments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 md:px-8 py-12 text-center text-slate-300 font-medium italic">
                      {t('noInvestmentsListed')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white">
                  <td colSpan={2} className="px-4 md:px-8 py-4 md:py-6 font-black uppercase tracking-widest text-[10px] md:text-xs">{t('totalInvestments')}</td>
                  <td colSpan={3} className="px-4 md:px-8 py-4 md:py-6 font-black text-lg md:text-xl">
                    {investments.reduce((acc, inv) => acc + inv.amount, 0).toLocaleString()} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderBusinessModelWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('businessModel')}</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineBusinessModel')}</p>
        </div>
        {!isReadOnly && renderSaveButton()}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:h-[600px]">
      {/* Left Column */}
      <div className="col-span-1 md:col-span-3 flex flex-col gap-4">
        <div className="flex-1 bg-white p-6 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg flex flex-col min-h-[150px]">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-emerald-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('keyActivities')}</h3>
          </div>
          <textarea 
            className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-medium" 
            placeholder={t('writeHere')} 
            disabled={isReadOnly}
            value={businessModel.keyActivities}
            onChange={(e) => setBusinessModel({ ...businessModel, keyActivities: e.target.value })}
          />
        </div>
        <div className="flex-1 bg-white p-6 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg flex flex-col min-h-[150px]">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-emerald-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('keyResources')}</h3>
          </div>
          <textarea 
            className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-medium" 
            placeholder={t('writeHere')} 
            disabled={isReadOnly}
            value={businessModel.keyResources}
            onChange={(e) => setBusinessModel({ ...businessModel, keyResources: e.target.value })}
          />
        </div>
      </div>

      {/* Middle Column */}
      <div className="col-span-1 md:col-span-4 flex flex-col">
        <div className="flex-1 bg-slate-800 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-white/10 shadow-2xl flex flex-col text-white min-h-[300px] gap-6">
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Target size={20} className="text-indigo-400 md:w-6 md:h-6" />
              <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-300">{t('valueProposition')}</h3>
            </div>
            <textarea 
              className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-base md:text-lg font-bold leading-relaxed placeholder:text-white/30 text-white" 
              placeholder={t('valuePropositionPlaceholder')} 
              disabled={isReadOnly}
              value={businessModel.valueProposition}
              onChange={(e) => setBusinessModel({ ...businessModel, valueProposition: e.target.value })}
            />
          </div>
          
          <div className="h-px w-full bg-white/10"></div>
          
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <MessageSquare size={20} className="text-indigo-400 md:w-6 md:h-6" />
              <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-300">{t('channels')}</h3>
            </div>
            <textarea 
              className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-sm md:text-base font-medium leading-relaxed placeholder:text-white/30 text-white" 
              placeholder={t('channelsPlaceholder')} 
              disabled={isReadOnly}
              value={businessModel.channels || ''}
              onChange={(e) => setBusinessModel({ ...businessModel, channels: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="col-span-1 md:col-span-5 flex flex-col">
        <div className="flex-1 bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-black/5 shadow-lg flex flex-col min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Users size={20} className="text-emerald-500 md:w-6 md:h-6" />
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">{t('customers')}</h3>
          </div>
          <textarea 
            className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-base md:text-lg font-bold leading-relaxed placeholder:text-slate-100" 
            placeholder={t('customersPlaceholder')} 
            disabled={isReadOnly}
            value={businessModel.customers}
            onChange={(e) => setBusinessModel({ ...businessModel, customers: e.target.value })}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="col-span-1 md:col-span-6 bg-slate-50 p-6 rounded-[24px] md:rounded-[32px] border border-black/5 flex flex-col min-h-[120px]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('costs')}</h3>
        <textarea 
          className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-medium" 
          rows={3} 
          placeholder={t('costsPlaceholder')} 
          disabled={isReadOnly}
          value={businessModel.costs}
          onChange={(e) => setBusinessModel({ ...businessModel, costs: e.target.value })}
        />
      </div>
      <div className="col-span-1 md:col-span-6 bg-slate-50 p-6 rounded-[24px] md:rounded-[32px] border border-black/5 flex flex-col min-h-[120px]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('revenues')}</h3>
        <textarea 
          className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-medium" 
          rows={3} 
          placeholder={t('revenuesPlaceholder')} 
          disabled={isReadOnly}
          value={businessModel.revenues}
          onChange={(e) => setBusinessModel({ ...businessModel, revenues: e.target.value })}
        />
      </div>
    </div>
    </div>
  );

  const renderDownloadWorkspace = () => (
    <div className="space-y-6 md:space-y-12">
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase mb-2 md:mb-4">{t('downloadPlan')}</h2>
        <p className="text-slate-400 font-medium text-sm md:text-base">{t('downloadPlanDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-black/5 shadow-xl">
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 md:mb-6">{t('coverImage')}</h3>
            <label className="aspect-square bg-slate-50 rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group cursor-pointer hover:border-indigo-400 transition-all relative overflow-hidden">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
                disabled={isReadOnly}
              />
              {basics.coverImage ? (
                <img src={basics.coverImage} alt="Kansilehti" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <Camera size={32} className="text-slate-300 group-hover:text-indigo-400 mb-3 md:mb-4 md:w-10 md:h-10" />
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center px-4">Lataa kuva tai logo</p>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-black/5 shadow-xl flex flex-col h-full min-h-[200px]">
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 md:mb-6">Taustatiedot</h3>
            <textarea 
              className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 md:p-6 focus:ring-2 focus:ring-indigo-500/10 outline-none text-sm font-medium resize-none"
              placeholder="Kirjoita lyhyt esittely itsestäsi ja yrityksestäsi..."
              value={basics.background || ''}
              onChange={(e) => setBasics({ ...basics, background: e.target.value })}
              disabled={isReadOnly}
            ></textarea>
          </div>
        </div>
      </div>

      <button 
        onClick={generatePDF}
        disabled={isGeneratingPDF}
        className="w-full bg-slate-900 text-white py-4 md:py-6 rounded-[24px] md:rounded-[32px] font-black text-lg md:text-xl uppercase tracking-widest flex items-center justify-center gap-3 md:gap-4 hover:bg-black transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeneratingPDF ? (
          <>
            <Loader2 size={24} className="md:w-7 md:h-7 animate-spin" />
            Luodaan PDF-tiedostoa...
          </>
        ) : (
          <>
            <Download size={24} className="md:w-7 md:h-7" />
            {t('downloadPdfFile')}
          </>
        )}
      </button>
      {pdfError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium text-center">
          PDF:n luonti epäonnistui: {pdfError}
        </div>
      )}
    </div>
  );

  const renderStrategyWorkspace = () => {
    const allPositives = [...externalEnv.filter(i => i.type === 'positive'), ...internalEnv.filter(i => i.type === 'positive')];
    const allNegatives = [...externalEnv.filter(i => i.type === 'negative'), ...internalEnv.filter(i => i.type === 'negative')];

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('strategy')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineStrategy')}</p>
          </div>
          {!isReadOnly && renderSaveButton("bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100")}
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* VISIO ja ARVOT */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[200px] md:min-h-[250px]">
            <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-800 mb-2">{t('visionAndValues')}</h3>
            <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 font-medium">{t('defineVision')}</p>
            <textarea 
              className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 md:p-6 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm md:text-base font-medium resize-none"
              placeholder={t('writeHere')}
              value={strategy.visionAndValues}
              onChange={(e) => setStrategy({ ...strategy, visionAndValues: e.target.value })}
              disabled={isReadOnly}
            ></textarea>
          </div>

          {/* DIAGNOOSI */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[300px] md:min-h-[350px]">
            <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-800 mb-2">Diagnoosi</h3>
            <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 font-medium">Yhteenveto toimintaympäristön ilmiöistä ja niiden vaikutuksista.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-100">
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-800 mb-3 flex items-center gap-2">
                  <Plus size={14} /> Positiiviset ilmiöt
                </h4>
                <ul className="space-y-2">
                  {allPositives.length > 0 ? allPositives.map(item => (
                    <li key={item.id} className="text-xs md:text-sm text-emerald-700 font-medium flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span className="line-clamp-2">{item.text}</span>
                    </li>
                  )) : (
                    <li className="text-xs md:text-sm text-emerald-600/50 italic">{t('noAddedPhenomena')}</li>
                  )}
                </ul>
              </div>
              <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-100">
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-red-800 mb-3 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 flex items-center justify-center font-black leading-none">-</div> Negatiiviset ilmiöt
                </h4>
                <ul className="space-y-2">
                  {allNegatives.length > 0 ? allNegatives.map(item => (
                    <li key={item.id} className="text-xs md:text-sm text-red-700 font-medium flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span className="line-clamp-2">{item.text}</span>
                    </li>
                  )) : (
                    <li className="text-xs md:text-sm text-red-600/50 italic">{t('noAddedPhenomena')}</li>
                  )}
                </ul>
              </div>
            </div>

            <textarea 
              className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 md:p-6 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm md:text-base font-medium resize-none"
              placeholder="Kirjoita diagnoosi ja yhteenveto ilmiöistä..."
              value={strategy.diagnosis}
              onChange={(e) => setStrategy({ ...strategy, diagnosis: e.target.value })}
              disabled={isReadOnly}
            ></textarea>
          </div>

          {/* MITEN */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[200px] md:min-h-[250px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-800">{t('how')}</h3>
              {!isReadOnly && (strategy.howItems?.length || 0) < 6 && (
                <button 
                  onClick={() => setStrategy({ 
                    ...strategy, 
                    howItems: [...(strategy.howItems || []), { id: Math.random().toString(36).substr(2, 9), text: '' }] 
                  })}
                  className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-200 transition-all shadow-sm active:scale-95 text-[10px] md:text-xs uppercase tracking-widest w-fit"
                >
                  <Plus size={16} />
                  <span>{t('addAction')}</span>
                </button>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 font-medium">Miten aiot saavuttaa tavoitteesi ja vastata diagnoosin esiin nostamiin asioihin? (Maks. 6 toimenpidettä)</p>
            
            <div className="space-y-3 md:space-y-4">
              {(strategy.howItems || []).map((item, index) => (
                <div key={item.id} className="flex gap-2 md:gap-3 group">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0 mt-2 text-xs md:text-base">
                    {index + 1}
                  </div>
                  <textarea 
                    className="flex-1 bg-slate-50 border-none rounded-2xl p-3 md:p-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs md:text-sm font-medium resize-none"
                    placeholder="Kirjoita toimenpide tähän..."
                    value={item.text}
                    onChange={(e) => {
                      const newItems = [...(strategy.howItems || [])];
                      newItems[index].text = e.target.value;
                      setStrategy({ ...strategy, howItems: newItems });
                    }}
                    disabled={isReadOnly}
                    rows={2}
                  ></textarea>
                  {!isReadOnly && (
                    <button 
                      onClick={() => {
                        const newItems = (strategy.howItems || []).filter(i => i.id !== item.id);
                        setStrategy({ ...strategy, howItems: newItems });
                      }}
                      className="p-2 md:p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-fit md:opacity-0 group-hover:opacity-100 mt-1"
                    >
                      <Trash2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                    </button>
                  )}
                </div>
              ))}
              {(strategy.howItems || []).length === 0 && (
                <div className="text-center py-6 md:py-8">
                  <p className="text-slate-400 text-xs md:text-sm font-medium italic mb-4">{t('noActionsYet')}</p>
                  {!isReadOnly && (
                    <button 
                      onClick={() => setStrategy({ 
                        ...strategy, 
                        howItems: [{ id: Math.random().toString(36).substr(2, 9), text: '' }] 
                      })}
                      className="bg-emerald-50 text-emerald-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-bold inline-flex items-center gap-2 hover:bg-emerald-100 transition-all shadow-sm active:scale-95 text-xs md:text-sm"
                    >
                      <Plus size={18} />
                      <span>Aloita lisäämällä ensimmäinen toimenpide</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBusinessIdeaWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('businessIdea')}</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineBusinessIdea')}</p>
        </div>
        {!isReadOnly && renderSaveButton()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[250px] md:min-h-[300px]">
          <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-3 md:mb-4">Mitä?</h3>
          <p className="text-[10px] md:text-xs text-slate-500 mb-4 font-medium">Mitä tuotteita tai palveluita yrityksesi myy?</p>
          <textarea 
            className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-medium resize-none"
            placeholder={t('writeHere')}
            value={basics.businessIdeaWhat || ''}
            onChange={(e) => setBasics({ ...basics, businessIdeaWhat: e.target.value })}
            disabled={isReadOnly}
          ></textarea>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[250px] md:min-h-[300px]">
          <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-3 md:mb-4">Miten?</h3>
          <p className="text-[10px] md:text-xs text-slate-500 mb-4 font-medium">Miten tuotat ja toimitat nämä tuotteet tai palvelut?</p>
          <textarea 
            className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-medium resize-none"
            placeholder={t('writeHere')}
            value={basics.businessIdeaHow || ''}
            onChange={(e) => setBasics({ ...basics, businessIdeaHow: e.target.value })}
            disabled={isReadOnly}
          ></textarea>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex flex-col min-h-[250px] md:min-h-[300px]">
          <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-3 md:mb-4">Kenelle?</h3>
          <p className="text-[10px] md:text-xs text-slate-500 mb-4 font-medium">Keitä ovat asiakkaasi ja kohderyhmäsi?</p>
          <textarea 
            className="flex-1 w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm font-medium resize-none"
            placeholder={t('writeHere')}
            value={basics.businessIdeaForWhom || ''}
            onChange={(e) => setBasics({ ...basics, businessIdeaForWhom: e.target.value })}
            disabled={isReadOnly}
          ></textarea>
        </div>
      </div>

      <div className="bg-blue-50 p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-blue-100 flex items-start gap-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
          <Info className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div>
          <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-blue-900 mb-1">Vinkki</h4>
          <p className="text-xs md:text-sm text-blue-700 font-medium">
            Hyvä liikeidea on tiivis ja ymmärrettävä. Tarvitsetko vastauksia ja oivalluksia suunnitelmasi kehittämiseen? Avaa AI-Tuki oikeasta alakulmasta.
          </p>
        </div>
      </div>
    </div>
  );

  const renderEnvironmentWorkspace = (type: 'EXTERNAL_ENV' | 'INTERNAL_ENV') => {
    const isExternal = type === 'EXTERNAL_ENV';
    const title = isExternal ? t('externalEnv') : t('internalEnv');
    const description = t('defineEnvironment');
    const data = isExternal ? externalEnv : internalEnv;
    const setData = isExternal ? setExternalEnv : setInternalEnv;

    const handleAdd = (phenomenonType: 'positive' | 'negative') => {
      setData([...data, { id: Math.random().toString(36).substr(2, 9), text: '', type: phenomenonType }]);
    };

    const handleUpdate = (id: string, text: string) => {
      setData(data.map(item => item.id === id ? { ...item, text } : item));
    };

    const handleRemove = (id: string) => {
      setData(data.filter(item => item.id !== id));
    };

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{title}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{description}</p>
          </div>
          {!isReadOnly && renderSaveButton()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Positives */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-emerald-100 shadow-xl min-h-[300px] md:min-h-[400px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <Plus className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-emerald-900">
                  {isExternal ? t('opportunities') : t('strengths')}
                </h3>
              </div>
              {!isReadOnly && (
                <button 
                  onClick={() => handleAdd('positive')}
                  className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-200 transition-all shadow-sm active:scale-95 text-[10px] md:text-xs uppercase tracking-widest w-fit"
                >
                  <Plus size={16} />
                  <span>{t('add')}</span>
                </button>
              )}
            </div>
            <div className="space-y-3 md:space-y-4">
              {data.filter(item => item.type === 'positive').map((item) => (
                <div key={item.id} className="flex gap-2 md:gap-3 group">
                  <textarea 
                    className="flex-1 bg-slate-50 border-none rounded-2xl p-3 md:p-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs md:text-sm font-medium resize-none"
                    placeholder={t('writeHere')}
                    value={item.text}
                    onChange={(e) => handleUpdate(item.id, e.target.value)}
                    disabled={isReadOnly}
                    rows={3}
                  ></textarea>
                  {!isReadOnly && (
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="p-2 md:p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-fit md:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
              ))}
              {data.filter(item => item.type === 'positive').length === 0 && (
                <p className="text-slate-400 text-xs md:text-sm font-medium italic text-center py-6 md:py-8">
                  {t('noPhenomenaYet')}
                </p>
              )}
            </div>
          </div>

          {/* Negatives */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-red-100 shadow-xl min-h-[300px] md:min-h-[400px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-black text-xl md:text-2xl">
                  -
                </div>
                <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-red-900">
                  {isExternal ? t('threats') : t('weaknesses')}
                </h3>
              </div>
              {!isReadOnly && (
                <button 
                  onClick={() => handleAdd('negative')}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-200 transition-all shadow-sm active:scale-95 text-[10px] md:text-xs uppercase tracking-widest w-fit"
                >
                  <div className="w-3 h-3 flex items-center justify-center font-black text-sm leading-none">-</div>
                  <span>{t('add')}</span>
                </button>
              )}
            </div>
            <div className="space-y-3 md:space-y-4">
              {data.filter(item => item.type === 'negative').map((item) => (
                <div key={item.id} className="flex gap-2 md:gap-3 group">
                  <textarea 
                    className="flex-1 bg-slate-50 border-none rounded-2xl p-3 md:p-4 focus:ring-2 focus:ring-red-500/20 outline-none text-xs md:text-sm font-medium resize-none"
                    placeholder={t('writeHere')}
                    value={item.text}
                    onChange={(e) => handleUpdate(item.id, e.target.value)}
                    disabled={isReadOnly}
                    rows={3}
                  ></textarea>
                  {!isReadOnly && (
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="p-2 md:p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-fit md:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
              ))}
              {data.filter(item => item.type === 'negative').length === 0 && (
                <p className="text-slate-400 text-xs md:text-sm font-medium italic text-center py-6 md:py-8">
                  {t('noPhenomenaYet')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompanyWorkspace = () => {
    const modelType = basics.organizationModel?.type || 'LINE';
    const boxes = basics.organizationModel?.boxes || [];
    const connections = basics.organizationModel?.connections || [];

    const handleModelSelect = (type: 'LINE' | 'MATRIX' | 'PROJECT' | 'CUSTOM') => {
      let defaultBoxes: { id: string; text: string; x: number; y: number }[] = [];
      let defaultConnections: { id: string; from: string; to: string }[] = [];
      
      if (type === 'LINE') {
        defaultBoxes = [
          { id: '1', text: t('ceo'), x: 50, y: 15 },
          { id: '2', text: t('sales'), x: 20, y: 60 },
          { id: '3', text: t('production'), x: 50, y: 60 },
          { id: '4', text: t('finance'), x: 80, y: 60 },
        ];
        defaultConnections = [
          { id: 'c1', from: '1', to: '2' },
          { id: 'c2', from: '1', to: '3' },
          { id: 'c3', from: '1', to: '4' },
        ];
      } else if (type === 'MATRIX') {
        defaultBoxes = [
          { id: '1', text: t('management'), x: 20, y: 15 },
          { id: '2', text: t('productLineA'), x: 20, y: 50 },
          { id: '3', text: t('productLineB'), x: 20, y: 80 },
          { id: '4', text: t('sales'), x: 50, y: 15 },
          { id: '5', text: t('rnd'), x: 80, y: 15 },
        ];
        defaultConnections = [
          { id: 'c1', from: '1', to: '2' },
          { id: 'c2', from: '2', to: '3' },
          { id: 'c3', from: '1', to: '4' },
          { id: 'c4', from: '4', to: '5' },
          { id: 'c5', from: '4', to: '2' },
          { id: 'c6', from: '5', to: '2' },
          { id: 'c7', from: '4', to: '3' },
          { id: 'c8', from: '5', to: '3' },
        ];
      } else if (type === 'PROJECT') {
        defaultBoxes = [
          { id: '1', text: t('projectManager'), x: 50, y: 50 },
          { id: '2', text: t('expert1'), x: 20, y: 20 },
          { id: '3', text: t('expert2'), x: 80, y: 20 },
          { id: '4', text: t('expert3'), x: 20, y: 80 },
          { id: '5', text: t('expert4'), x: 80, y: 80 },
        ];
        defaultConnections = [
          { id: 'c1', from: '1', to: '2' },
          { id: 'c2', from: '1', to: '3' },
          { id: 'c3', from: '1', to: '4' },
          { id: 'c4', from: '1', to: '5' },
        ];
      } else if (type === 'CUSTOM') {
        defaultBoxes = [
          { id: '1', text: t('me'), x: 50, y: 50 },
        ];
        defaultConnections = [];
      }

      setBasics({
        ...basics,
        organizationModel: { type, boxes: defaultBoxes, connections: defaultConnections }
      });
    };

    const handleBoxChange = (id: string, text: string) => {
      setBasics({
        ...basics,
        organizationModel: {
          type: modelType,
          boxes: boxes.map(b => b.id === id ? { ...b, text } : b),
          connections
        }
      });
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
      if (isReadOnly) return;
      e.stopPropagation();
      setDraggingId(id);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (isReadOnly) return;
      
      const container = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - container.left) / container.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - container.top) / container.height) * 100));

      if (draggingId) {
        setBasics({
          ...basics,
          organizationModel: {
            type: modelType,
            boxes: boxes.map(b => b.id === draggingId ? { ...b, x, y } : b),
            connections
          }
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    const addBox = () => {
      const newBox = { id: Date.now().toString(), text: t('new'), x: 50, y: 50 };
      setBasics({
        ...basics,
        organizationModel: {
          type: modelType,
          boxes: [...boxes, newBox],
          connections
        }
      });
    };

    const deleteBox = (id: string) => {
      setBasics({
        ...basics,
        organizationModel: {
          type: modelType,
          boxes: boxes.filter(b => b.id !== id),
          connections: connections.filter(c => c.from !== id && c.to !== id)
        }
      });
    };

    const addConnection = () => {
      if (!newConnFrom || !newConnTo || newConnFrom === newConnTo) return;
      if (connections.some(c => (c.from === newConnFrom && c.to === newConnTo) || (c.from === newConnTo && c.to === newConnFrom))) return;
      
      const newConnection = { id: Date.now().toString(), from: newConnFrom, to: newConnTo };
      setBasics({
        ...basics,
        organizationModel: {
          type: modelType,
          boxes,
          connections: [...connections, newConnection]
        }
      });
      setNewConnFrom('');
      setNewConnTo('');
    };

    const removeConnection = (id: string) => {
      setBasics({
        ...basics,
        organizationModel: {
          type: modelType,
          boxes,
          connections: connections.filter(c => c.id !== id)
        }
      });
    };

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('company')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineCompany')}</p>
          </div>
          {!isReadOnly && renderSaveButton()}
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-xl flex flex-col space-y-8">
          <div>
            <h3 className="text-lg font-bold mb-2">Minkälainen yritys on kyseessä ja mitä se myy?</h3>
            <textarea 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-base font-medium resize-none"
              placeholder="Kirjoita vapaamuotoisesti muutamalla lauseella..."
              value={basics.companyDescription || ''}
              onChange={(e) => setBasics({ ...basics, companyDescription: e.target.value })}
              disabled={isReadOnly}
              rows={4}
            ></textarea>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Organisaatiomalli</h3>
              {!isReadOnly && (
                <button
                  onClick={addBox}
                  className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-200 transition-all text-sm"
                >
                  <Plus size={16} />
                  {t('addBox')}
                </button>
              )}
            </div>
            
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <button
                  onClick={() => handleModelSelect('LINE')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${modelType === 'LINE' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                >
                  <div className="font-bold text-emerald-900 mb-1">Linjaorganisaatio</div>
                  <div className="text-xs text-slate-500">Perinteinen hierarkkinen malli</div>
                </button>
                <button
                  onClick={() => handleModelSelect('MATRIX')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${modelType === 'MATRIX' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                >
                  <div className="font-bold text-emerald-900 mb-1">Matriisiorganisaatio</div>
                  <div className="text-xs text-slate-500">Toiminnot ja tuotelinjat yhdistettynä</div>
                </button>
                <button
                  onClick={() => handleModelSelect('PROJECT')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${modelType === 'PROJECT' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                >
                  <div className="font-bold text-emerald-900 mb-1">Projektiorganisaatio</div>
                  <div className="text-xs text-slate-500">Joustava projektipohjainen malli</div>
                </button>
                <button
                  onClick={() => handleModelSelect('CUSTOM')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${modelType === 'CUSTOM' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                >
                  <div className="font-bold text-emerald-900 mb-1">Organisaatio x</div>
                  <div className="text-xs text-slate-500">Vapaasti muokattava malli</div>
                </button>
              </div>
            )}

            <div 
              className="relative bg-slate-50 rounded-2xl border border-slate-200 h-[500px] overflow-hidden select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {boxes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic">
                  {t('selectOrgModelAbove')}
                </div>
              )}
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {connections.map(conn => {
                  const fromBox = boxes.find(b => b.id === conn.from);
                  const toBox = boxes.find(b => b.id === conn.to);
                  if (!fromBox || !toBox) return null;
                  return (
                    <line 
                      key={conn.id}
                      x1={`${fromBox.x}%`} 
                      y1={`${fromBox.y}%`} 
                      x2={`${toBox.x}%`} 
                      y2={`${toBox.y}%`} 
                      stroke="#cbd5e1" 
                      strokeWidth="2" 
                    />
                  );
                })}
              </svg>

              {boxes.map((box) => (
                <div
                  key={box.id}
                  className={`absolute p-2 md:p-3 bg-white border-2 ${draggingId === box.id ? 'border-emerald-500 shadow-lg z-10' : 'border-emerald-200 shadow-sm'} rounded-xl w-24 md:w-40 transform -translate-x-1/2 -translate-y-1/2 cursor-move transition-shadow group`}
                  style={{ left: `${box.x}%`, top: `${box.y}%` }}
                  onMouseDown={(e) => handleMouseDown(e, box.id)}
                >
                  <input
                    type="text"
                    className="w-full text-center font-bold text-xs md:text-sm text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-text"
                    value={box.text}
                    onChange={(e) => handleBoxChange(box.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && (
                    <button
                      className="absolute -right-2 -top-2 md:-right-3 md:-top-3 w-5 h-5 md:w-6 md:h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                      onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }}
                      title={t('removeBox')}
                    >
                      <Trash2 size={12} className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 italic">
              Voit siirtää laatikoita raahaamalla.
            </p>

            {!isReadOnly && (
              <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-lg mb-4">{t('manageConnections')}</h4>
                
                <div className="flex flex-col md:flex-row items-end gap-4 mb-6">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('from')}</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium"
                      value={newConnFrom}
                      onChange={(e) => setNewConnFrom(e.target.value)}
                    >
                      <option value="">{t('selectBox')}</option>
                      {boxes.map(b => (
                        <option key={b.id} value={b.id}>{b.text || t('unnamedBox')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('to')}</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium"
                      value={newConnTo}
                      onChange={(e) => setNewConnTo(e.target.value)}
                    >
                      <option value="">{t('selectBox')}</option>
                      {boxes.map(b => (
                        <option key={b.id} value={b.id}>{b.text || t('unnamedBox')}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={addConnection}
                    disabled={!newConnFrom || !newConnTo || newConnFrom === newConnTo}
                    className="w-full md:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Yhdistä
                  </button>
                </div>

                {connections.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nykyiset yhteydet</label>
                    {connections.map(conn => {
                      const fromBox = boxes.find(b => b.id === conn.from);
                      const toBox = boxes.find(b => b.id === conn.to);
                      if (!fromBox || !toBox) return null;
                      return (
                        <div key={conn.id} className="flex items-center justify-between bg-white p-2 md:p-3 rounded-xl border border-slate-200 gap-2">
                          <div className="flex items-center gap-1 md:gap-3 text-xs md:text-sm font-medium text-slate-700 min-w-0">
                            <span className="bg-slate-100 px-2 py-1 md:px-3 md:py-1 rounded-lg truncate max-w-[80px] md:max-w-[150px]">{fromBox.text || t('unnamed')}</span>
                            <span className="text-slate-400 shrink-0">➔</span>
                            <span className="bg-slate-100 px-2 py-1 md:px-3 md:py-1 rounded-lg truncate max-w-[80px] md:max-w-[150px]">{toBox.text || t('unnamed')}</span>
                          </div>
                          <button
                            onClick={() => removeConnection(conn.id)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 md:p-2 rounded-lg transition-all shrink-0"
                            title={t('removeConnection')}
                          >
                            <Trash2 size={16} className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDefaultWorkspace = (title?: string, description?: string, value?: string, onChange?: (val: string) => void) => {
    const sectionKey = title || activeSection;
    const currentValue = value !== undefined ? value : (genericNotes[sectionKey] || '');
    const handleChange = onChange || ((val: string) => setGenericNotes({ ...genericNotes, [sectionKey]: val }));
    
    return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{title || activeSection}</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{description || t('fillCarefully')}</p>
        </div>
        {!isReadOnly && renderSaveButton()}
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-xl min-h-[300px] md:min-h-[400px] flex flex-col">
        <textarea 
          className="flex-1 w-full bg-transparent border-none focus:ring-0 text-base md:text-lg font-medium leading-relaxed resize-none placeholder:text-slate-100"
          placeholder={t('writeHere')}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isReadOnly}
        ></textarea>
      </div>

      <div className="bg-blue-50 p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-blue-100 flex items-start gap-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
          <Info className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div>
          <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-blue-900 mb-1">Vinkki</h4>
          <p className="text-xs md:text-sm text-blue-700 font-medium">
            Tarvitsetko vastauksia ja oivalluksia suunnitelmasi kehittämiseen? Avaa AI-Tuki oikeasta alakulmasta.
          </p>
        </div>
      </div>
    </div>
    );
  };

  const renderProjectWorkspace = () => {
    const handleAddPhase = () => {
      const newPhase: ProjectPhase = {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        description: '',
        status: 'NOT_STARTED'
      };
      setProject({ ...project, phases: [...project.phases, newPhase] });
    };

    const handleUpdatePhase = (id: string, field: keyof ProjectPhase, value: string) => {
      setProject({
        ...project,
        phases: project.phases.map(p => p.id === id ? { ...p, [field]: value } : p)
      });
    };

    const handleRemovePhase = (id: string) => {
      setProject({
        ...project,
        phases: project.phases.filter(p => p.id !== id)
      });
    };

    const toggleFocusArea = (id: string) => {
      const current = project.linkedFocusAreas || [];
      const updated = current.includes(id) 
        ? current.filter(itemId => itemId !== id)
        : [...current, id];
      setProject({ ...project, linkedFocusAreas: updated });
    };

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('myProject')}</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineProject')}</p>
          </div>
          {!isReadOnly && renderSaveButton()}
        </div>

        {/* Project Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {(projects.length > 0 ? projects : [project]).map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProjectId(p.id || 'default')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeProjectId === p.id 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-black/5'
              }`}
            >
              {p.title || p.ownerName || 'Oma projekti'}
            </button>
          ))}
          {!isReadOnly && (
            <button
              onClick={() => {
                const newId = Math.random().toString(36).substr(2, 9);
                const newProject: ProjectData = {
                  id: newId,
                  ownerId: user?.uid || 'default',
                  ownerName: user?.displayName || t('newProject'),
                  title: '',
                  description: '',
                  phases: [],
                  linkedFocusAreas: [],
                  linkedActivities: '',
                  linkedResources: '',
                  strategicAlignment: '',
                  businessModelAlignment: ''
                };
                setProjects([...projects, newProject]);
                setActiveProjectId(newId);
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              {t('addProject')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Project Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Projektin nimi</label>
                  <input 
                    type="text"
                    value={project.title}
                    onChange={(e) => setProject({ ...project, title: e.target.value })}
                    placeholder={t('giveProjectName')}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none text-base font-medium transition-all"
                    disabled={isReadOnly}
                  />
                </div>
                {!isReadOnly && projects.length > 1 && (
                  <button
                    onClick={() => {
                      const newProjects = projects.filter(p => p.id !== activeProjectId);
                      setProjects(newProjects);
                      setActiveProjectId(newProjects[0]?.id || 'default');
                    }}
                    className="ml-4 mt-6 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title={t('removeProject')}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Projektin kuvaus ja tavoite</label>
                <textarea 
                  value={project.description}
                  onChange={(e) => setProject({ ...project, description: e.target.value })}
                  placeholder={t('whatProjectAimsToAchieve')}
                  className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium transition-all min-h-[120px] resize-none"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Project Phases */}
            <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Projektin vaiheet</h3>
                  <p className="text-slate-400 text-sm">{t('divideProjectIntoPhases')}</p>
                </div>
                {!isReadOnly && (
                  <button 
                    onClick={handleAddPhase}
                    className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {project.phases.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">{t('noPhasesYet')}</p>
                  </div>
                ) : (
                  project.phases.map((phase, index) => (
                    <div key={phase.id} className="bg-slate-50 p-4 rounded-2xl border border-black/5 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-slate-400 shrink-0 shadow-sm">
                            {index + 1}
                          </div>
                          <input 
                            type="text"
                            value={phase.name}
                            onChange={(e) => handleUpdatePhase(phase.id, 'name', e.target.value)}
                            placeholder={t('phaseName')}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-base font-bold p-0"
                            disabled={isReadOnly}
                          />
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleRemovePhase(phase.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <textarea 
                        value={phase.description}
                        onChange={(e) => handleUpdatePhase(phase.id, 'description', e.target.value)}
                        placeholder={t('describePhasePlaceholder')}
                        className="w-full bg-white border border-black/5 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none min-h-[80px]"
                        disabled={isReadOnly}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">{t('status')}:</span>
                        <select
                          value={phase.status}
                          onChange={(e) => handleUpdatePhase(phase.id, 'status', e.target.value)}
                          className={`text-xs font-bold uppercase rounded-lg px-2 py-1 border-none cursor-pointer outline-none ${
                            phase.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            phase.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-200 text-slate-600'
                          }`}
                          disabled={isReadOnly}
                        >
                          <option value="NOT_STARTED">{t('notStarted')}</option>
                          <option value="IN_PROGRESS">{t('inProgress')}</option>
                          <option value="COMPLETED">{t('completed')}</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Strategic Alignment */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Target size={20} className="text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-widest">Strateginen kytkös</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs text-slate-400 mb-3 font-medium">{t('howProjectRelatesToStrategy')}</label>
                  <textarea 
                    value={project.strategicAlignment || ''}
                    onChange={(e) => setProject({ ...project, strategicAlignment: e.target.value })}
                    placeholder={t('describeInYourOwnWords')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none min-h-[120px]"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase size={20} className="text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-widest">Liiketoimintamalli</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('businessModelAlignment')}</label>
                  <textarea 
                    value={project.businessModelAlignment || ''}
                    onChange={(e) => setProject({ ...project, businessModelAlignment: e.target.value })}
                    placeholder={t('businessModelAlignmentPlaceholder')}
                    className="w-full bg-slate-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none min-h-[120px]"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImplementationWorkspace = () => (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('implementation')}</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineProject')}</p>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap gap-3 md:gap-4">
            <button 
              onClick={() => setImplementationPhases([...implementationPhases, { id: Math.random().toString(36).substr(2, 9), task: '', schedule: '', responsible: '', status: 'NOT_STARTED' }])}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 w-fit"
            >
              <Plus size={20} />
              <span>{t('addPhase')}</span>
            </button>
            {renderSaveButton()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-black/5">
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/3">{t('actionPhase')}</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/4">{t('schedule')}</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/4">{t('personInCharge')}</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('status')}</th>
              {!isReadOnly && <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {implementationPhases.map((phase) => (
              <tr key={phase.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <input 
                    type="text" 
                    value={phase.task}
                    onChange={(e) => setImplementationPhases(implementationPhases.map(item => item.id === phase.id ? { ...item, task: e.target.value } : item))}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-none focus:ring-0 font-bold p-0 placeholder:text-slate-200 text-sm md:text-base"
                    placeholder="Esim. Markkinatutkimus..."
                  />
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <input 
                    type="text" 
                    value={phase.schedule}
                    onChange={(e) => setImplementationPhases(implementationPhases.map(item => item.id === phase.id ? { ...item, schedule: e.target.value } : item))}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-none focus:ring-0 font-medium p-0 placeholder:text-slate-200 text-sm md:text-base"
                    placeholder="Esim. Q1/2026..."
                  />
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <input 
                    type="text" 
                    value={phase.responsible}
                    onChange={(e) => setImplementationPhases(implementationPhases.map(item => item.id === phase.id ? { ...item, responsible: e.target.value } : item))}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-none focus:ring-0 font-medium p-0 placeholder:text-slate-200 text-sm md:text-base"
                    placeholder="Esim. Matti Meikäläinen..."
                  />
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <select
                    value={phase.status}
                    onChange={(e) => setImplementationPhases(implementationPhases.map(item => item.id === phase.id ? { ...item, status: e.target.value as ImplementationPhase['status'] } : item))}
                    disabled={isReadOnly}
                    className={`bg-transparent border-none focus:ring-0 font-bold p-0 text-sm md:text-base cursor-pointer ${
                      phase.status === 'COMPLETED' ? 'text-emerald-600' : 
                      phase.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    <option value="NOT_STARTED">{t('notStarted')}</option>
                    <option value="IN_PROGRESS">{t('inProgress')}</option>
                    <option value="COMPLETED">{t('completed')}</option>
                  </select>
                </td>
                {!isReadOnly && (
                  <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                    <button 
                      onClick={() => setImplementationPhases(implementationPhases.filter(item => item.id !== phase.id))}
                      className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {implementationPhases.length === 0 && (
              <tr>
                <td colSpan={isReadOnly ? 4 : 5} className="px-4 md:px-8 py-8 md:py-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-50 mb-3 md:mb-4">
                    <Calendar className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium text-sm md:text-base">{t('noAddedPhases')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSubPlansOverview = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">{t('subPlans')}</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{t('defineSubPlans')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Target size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Markkinointi & myynti</h3>
            <p className="text-sm text-slate-500">Toimenpiteet ja myyntitavoitteet</p>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Henkilöstö</h3>
            <p className="text-sm text-slate-500">Henkilöstörakenne ja palkkakulut</p>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Hallinto</h3>
            <p className="text-sm text-slate-500">Hallinnolliset kulut</p>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calculator size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Laskelmat</h3>
            <p className="text-sm text-slate-500">Kokoavat talouslaskelmat</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'BUSINESS_MODEL': return renderBusinessModelWorkspace();
      case 'TOTEUTUS': return renderImplementationWorkspace();
      case 'DOWNLOAD': return renderDownloadWorkspace();
      case 'LASKELMAT': return renderCalculationsWorkspace();
      case 'PERSONNEL': return renderPersonnelWorkspace();
      case 'SALES_MARKETING': return renderMarketingWorkspace();
      case 'HALLINTO': return renderAdminWorkspace();
      case 'PERUSTEET': return renderDefaultWorkspace(t('basics'), t('tellAboutCompany'), basics.businessIdea, (val) => setBasics({ ...basics, businessIdea: val }));
      case 'COMPANY_FORM': return renderDefaultWorkspace(t('companyForm'), t('chooseCompanyForm'), basics.companyForm, (val) => setBasics({ ...basics, companyForm: val }));
      case 'BACKGROUND': return renderDefaultWorkspace(t('background'), t('tellAboutBackground'), basics.background, (val) => setBasics({ ...basics, background: val }));
      case 'BUSINESS_IDEA': return renderBusinessIdeaWorkspace();
      case 'STRATEGIA': return renderStrategyWorkspace();
      case 'YRITYS': return renderCompanyWorkspace();
      case 'CONTRIBUTION': return renderProjectWorkspace();
      case 'OSASUUNNITELMAT': return renderSubPlansOverview();
      case 'YMPÄRISTÖ': return renderEnvironmentWorkspace('EXTERNAL_ENV');
      case 'EXTERNAL_ENV': return renderEnvironmentWorkspace('EXTERNAL_ENV');
      case 'INTERNAL_ENV': return renderEnvironmentWorkspace('INTERNAL_ENV');
      default: return renderDefaultWorkspace(activeSection);
    }
  };

  const renderPrintView = () => {
    const isLTS = portalType === 'LTS';
    const themeBg = isLTS ? 'bg-blue-50/50' : 'bg-emerald-50/50';
    const themeText = isLTS ? 'text-blue-900' : 'text-emerald-900';
    const themeTitle = isLTS ? 'text-blue-600' : 'text-emerald-600';

    const Page = ({ children }: { children: React.ReactNode }) => (
      <div className="pdf-page bg-white relative overflow-hidden" style={{ width: '794px', height: '1123px', padding: '50px', boxSizing: 'border-box' }}>
        <div className={`absolute top-0 left-0 w-full h-2 ${isLTS ? 'bg-blue-500' : 'bg-emerald-500'}`} />
        <div className="h-full flex flex-col">
          {children}
        </div>
      </div>
    );

    const SectionBox = ({ title, content }: { title: string, content: string | React.ReactNode }) => (
      <div className={`p-6 rounded-2xl ${themeBg} mb-6`}>
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</h3>
        {typeof content === 'string' ? (
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{content || '-'}</p>
        ) : (
          content
        )}
      </div>
    );

    return (
      <div id="pdf-export-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <style dangerouslySetInnerHTML={{__html: `
          #pdf-export-container * {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
        `}} />
        {/* Cover Page */}
        <Page>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {basics.coverImage && (
              <img src={basics.coverImage} alt="Cover" className="w-64 h-64 object-cover rounded-full mb-12" />
            )}
            <h1 className={`text-3xl font-thin uppercase tracking-widest mb-6 ${themeTitle}`}>
              {isLTS ? t('businessPlan') : t('strategyPlan')}
            </h1>
            <p className="text-xl text-slate-600 font-light">
              {basics.companyDescription || t('missingCompanyDescription')}
            </p>
          </div>
        </Page>

        {/* Perusteet Page (Only for LTS) */}
        {isLTS && (
          <Page>
            <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('basics')}</h2>
            <div className="space-y-2">
              <SectionBox title={t('companyForm')} content={basics.companyForm} />
              <SectionBox title={t('background')} content={basics.background} />
              <SectionBox title={t('businessIdea')} content={basics.businessIdea} />
            </div>
          </Page>
        )}

        {/* Yritys Page (Only for Strategia) */}
        {!isLTS && (
          <Page>
            <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('company')}</h2>
            <div className="space-y-2">
              <SectionBox title={t('companyInfo')} content={basics.companyDescription} />
              <SectionBox title={t('organizationModel')} content={
                <div>
                  <p className="text-slate-800 font-bold mb-2">{t('type')}: {basics.organizationModel?.type || 'LINE'}</p>
                  <ul className="list-disc pl-5">
                    {(basics.organizationModel?.boxes || []).map(box => (
                      <li key={box.id} className="text-slate-800">{box.text}</li>
                    ))}
                  </ul>
                </div>
              } />
            </div>
          </Page>
        )}

        {/* Toimintaympäristö Page */}
        <Page>
          <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('environment')}</h2>
          <div className="space-y-2">
            <SectionBox title={t('externalEnv')} content={
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-emerald-600 mb-2">{t('opportunities')}</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {externalEnv.filter(e => e.type === 'positive').map(env => <li key={env.id} className="text-sm text-slate-800">{env.text}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-red-600 mb-2">{t('threats')}</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {externalEnv.filter(e => e.type === 'negative').map(env => <li key={env.id} className="text-sm text-slate-800">{env.text}</li>)}
                  </ul>
                </div>
              </div>
            } />
            <SectionBox title={t('internalEnv')} content={
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-emerald-600 mb-2">{t('strengths')}</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {internalEnv.filter(e => e.type === 'positive').map(env => <li key={env.id} className="text-sm text-slate-800">{env.text}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-red-600 mb-2">{t('weaknesses')}</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {internalEnv.filter(e => e.type === 'negative').map(env => <li key={env.id} className="text-sm text-slate-800">{env.text}</li>)}
                  </ul>
                </div>
              </div>
            } />
          </div>
        </Page>

        {/* Strategia Page */}
        <Page>
          <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('strategy')}</h2>
          <div className="space-y-2">
            <SectionBox title={t('visionAndValues')} content={strategy.visionAndValues} />
            <SectionBox title={t('diagnosis')} content={
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-emerald-600 mb-2">{t('positivePhenomena')}</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      {[...externalEnv.filter(i => i.type === 'positive'), ...internalEnv.filter(i => i.type === 'positive')].length > 0 ? 
                        [...externalEnv.filter(i => i.type === 'positive'), ...internalEnv.filter(i => i.type === 'positive')].map(item => (
                        <li key={item.id} className="text-sm text-slate-800">{item.text}</li>
                      )) : <li className="text-sm text-slate-500 italic">-</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-red-600 mb-2">{t('negativePhenomena')}</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      {[...externalEnv.filter(i => i.type === 'negative'), ...internalEnv.filter(i => i.type === 'negative')].length > 0 ? 
                        [...externalEnv.filter(i => i.type === 'negative'), ...internalEnv.filter(i => i.type === 'negative')].map(item => (
                        <li key={item.id} className="text-sm text-slate-800">{item.text}</li>
                      )) : <li className="text-sm text-slate-500 italic">-</li>}
                    </ul>
                  </div>
                </div>
                {strategy.diagnosis && (
                  <div className="mt-4 pt-4">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{t('summary')}</h4>
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{strategy.diagnosis}</p>
                  </div>
                )}
              </div>
            } />
            <SectionBox title={t('how')} content={
              (strategy.howItems || []).length > 0 ? (
                <ul className="space-y-3">
                  {(strategy.howItems || []).map((item, idx) => (
                    <li key={item.id} className="flex gap-3 text-slate-800">
                      <span className={`font-bold ${themeTitle}`}>{idx + 1}.</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : '-'
            } />
          </div>
        </Page>

        {/* Ostajapersoonat Page */}
        {buyerPersonas.length > 0 && (
          <Page>
            <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('buyerPersonas')}</h2>
            <div className="grid grid-cols-2 gap-6">
              {buyerPersonas.map((persona, idx) => {
                const icons = [User, UserCircle, UserSquare, UserRound];
                const Icon = icons[idx % icons.length];
                return (
                  <div key={persona.id} className={`p-6 rounded-2xl ${themeBg} flex flex-col`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white`}>
                        <Icon className={`w-6 h-6 ${themeTitle}`} />
                      </div>
                      <h3 className={`text-xl font-bold ${themeText}`}>{persona.name || t('unnamedPersona')}</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('description')}</h4>
                        <p className="text-sm text-slate-800">{persona.description || '-'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('painPoints')}</h4>
                        <p className="text-sm text-slate-800">{persona.painPoints || '-'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('goals')}</h4>
                        <p className="text-sm text-slate-800">{persona.goals || '-'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Page>
        )}

        {/* Osasuunnitelmat Pages (Only for LTS) */}
        {isLTS && (
          <>
            <Page>
              <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('subPlans')}</h2>
              <div className="space-y-2">
                <SectionBox title={t('marketingSales')} content={
                  marketing.length > 0 ? (
                    <div className="space-y-4">
                      {marketing.map(m => (
                        <div key={m.id} className="flex justify-between pb-2">
                          <span className="text-slate-800">{m.activity}</span>
                          <span className="font-bold whitespace-nowrap text-right min-w-[120px]">{Number(m.monthlyCost).toLocaleString('fi-FI')} {t('perMonth')}</span>
                        </div>
                      ))}
                    </div>
                  ) : '-'
                } />
                <SectionBox title={t('personnel')} content={
                  personnel.length > 0 ? (
                    <div className="space-y-4">
                      {personnel.map(p => (
                        <div key={p.id} className="flex justify-between pb-2">
                          <span className="text-slate-800">{p.role} ({p.count} {t('person')})</span>
                          <span className="font-bold whitespace-nowrap text-right min-w-[120px]">{Number(p.salary).toLocaleString('fi-FI')} {t('perMonth')}</span>
                        </div>
                      ))}
                    </div>
                  ) : '-'
                } />
                <SectionBox title={t('administration')} content={
                  admin.length > 0 ? (
                    <div className="space-y-4">
                      {admin.map(a => (
                        <div key={a.id} className="flex justify-between pb-2">
                          <span className="text-slate-800">{a.item}</span>
                          <span className="font-bold whitespace-nowrap text-right min-w-[120px]">{Number(a.monthlyCost).toLocaleString('fi-FI')} {t('perMonth')}</span>
                        </div>
                      ))}
                    </div>
                  ) : '-'
                } />
              </div>
            </Page>

            <Page>
              <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('subPlansContinued')}</h2>
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl ${themeBg} mb-6`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">{t('calculations')}</h3>
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('totalRevenue')}</h4>
                      <p className={`text-2xl font-light ${themeText}`}>{totalRevenue.toLocaleString('fi-FI')} €</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('totalExpenses')}</h4>
                      <p className={`text-2xl font-light ${themeText}`}>{totalExpenses.toLocaleString('fi-FI')} €</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('result')}</h4>
                      <p className={`text-2xl font-light ${ebitda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {ebitda.toLocaleString('fi-FI')} €
                      </p>
                    </div>
                  </div>
                  <div className="h-[300px] w-full flex justify-center">
                    <BarChart data={chartData} width={600} height={280}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value}€`} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </div>
                </div>
              </div>
            </Page>
          </>
        )}

        {/* Business Model Canvas Page (Only for Strategia) */}
        {!isLTS && (
          <Page>
            <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>{t('businessModel')}</h2>
            <div className="flex flex-col gap-4 h-[800px]">
              <div className="flex-1 grid grid-cols-12 gap-4">
                <div className="col-span-4 grid grid-rows-2 gap-4">
                  <div className={`p-4 rounded-2xl ${themeBg} flex flex-col`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('keyActivities')}</h3>
                    <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.keyActivities || '-'}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${themeBg} flex flex-col`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('keyResources')}</h3>
                    <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.keyResources || '-'}</p>
                  </div>
                </div>
                <div className="col-span-4 grid grid-rows-2 gap-4">
                  <div className={`p-4 rounded-2xl ${themeBg} flex flex-col`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('valueProposition')}</h3>
                    <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.valueProposition || '-'}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${themeBg} flex flex-col`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('channels')}</h3>
                    <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.channels || '-'}</p>
                  </div>
                </div>
                <div className="col-span-4 flex flex-col">
                  <div className={`p-4 rounded-2xl ${themeBg} flex flex-col flex-1`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('customers')}</h3>
                    <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.customers || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="h-1/3 grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl ${themeBg} flex flex-col`}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('costStructure')}</h3>
                  <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.costs || '-'}</p>
                </div>
                <div className={`p-4 rounded-2xl ${themeBg} flex flex-col`}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{t('revenues')}</h3>
                  <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{businessModel.revenues || '-'}</p>
                </div>
              </div>
            </div>
          </Page>
        )}

        {/* Toteutus / Projektini Page */}
        <Page>
          <h2 className={`text-3xl font-light uppercase tracking-wider mb-8 ${themeTitle}`}>
            {isLTS ? t('implementation') : t('myProject')}
          </h2>
          <div className="space-y-2">
            {isLTS ? (
              <SectionBox title={t('projectPhases')} content={
                implementationPhases.length > 0 ? (
                  <div className="space-y-8 pb-20">
                    {implementationPhases.map((phase, idx) => (
                      <div key={phase.id} className="relative pl-6 pb-8 last:pb-0">
                        <div className={`absolute left-0 top-2 w-1.5 h-1.5 rounded-full ${isLTS ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                        <h4 className="font-bold text-slate-800">{phase.task || '-'}</h4>
                        <div className="flex gap-4 text-sm text-slate-500 mt-2">
                          <span><strong>{t('schedule')}:</strong> {phase.schedule || '-'}</span>
                          <span><strong>{t('responsible')}:</strong> {phase.responsible || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : '-'
              } />
            ) : (
              <>
                <SectionBox title={t('projectName')} content={
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('giveProjectName')}</h4>
                    <p className="text-slate-800">{project?.title || '-'}</p>
                  </div>
                } />
                <SectionBox title={t('projectDescription')} content={
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('whatProjectAimsToAchieve')}</h4>
                    <p className="text-slate-800 whitespace-pre-wrap">{project?.description || '-'}</p>
                  </div>
                } />
                <SectionBox title={t('projectPhases')} content={
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-4">{t('divideProjectIntoPhases')}</h4>
                    {project?.phases && project.phases.length > 0 ? (
                      <div className="space-y-4">
                        {project.phases.map((phase, idx) => (
                          <div key={phase.id} className="relative pl-6 pb-4">
                            <div className={`absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-emerald-400`} />
                            <h4 className="font-bold text-slate-800">{phase.name || '-'}</h4>
                            <p className="text-sm text-slate-600 mt-1">{phase.description || '-'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">{t('noPhasesYet')}</p>
                    )}
                  </div>
                } />
                <SectionBox title={t('strategicAlignment')} content={
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('howProjectRelatesToStrategy')}</h4>
                    <p className="text-slate-800 whitespace-pre-wrap">{project?.strategicAlignment || '-'}</p>
                  </div>
                } />
                <SectionBox title={t('businessModel')} content={
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{t('businessModelAlignment')}</h4>
                    <p className="text-slate-800 whitespace-pre-wrap">{project?.businessModelAlignment || '-'}</p>
                  </div>
                } />
              </>
            )}
          </div>
        </Page>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      {renderPrintView()}
    </div>
  );
};
