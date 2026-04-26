import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { 
  Layout, 
  Shield, 
  User, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  FileText,
  TrendingUp,
  Users,
  Download,
  Database,
  Globe,
  Briefcase,
  ArrowRight,
  Target,
  Calculator,
  Calendar,
  UserPlus,
  MailCheck
} from 'lucide-react';
import { PortalType, UserRole, PlanSection, UserAccount } from './types';

interface SidebarProps {
  portalType: PortalType;
  userRole: UserRole;
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onSwitchPortal?: () => void;
  showSwitchPortal?: boolean;
  user?: UserAccount | null;
  invites?: any[]; // Added to receive filtered invites from App.tsx
  onOpenInviteModal?: () => void; // Added to trigger the modal in App.tsx
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  portalType, 
  userRole, 
  activeView, 
  setActiveView, 
  onLogout, 
  sidebarOpen, 
  setSidebarOpen,
  onSwitchPortal,
  showSwitchPortal,
  user,
  invites = [],
  onOpenInviteModal
}) => {
  const { t } = useLanguage();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSentInvites, setShowSentInvites] = useState(false); // Teacher local state

  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = portalType === PortalType.LTS ? [
    { id: 'DASHBOARD', label: t('dashboard').toUpperCase(), icon: Layout },
    { id: 'PERUSTEET', label: t('basics').toUpperCase(), icon: FileText, isGroup: true, subItems: [
      { id: 'COMPANY_FORM', label: t('companyForm'), icon: Briefcase },
      { id: 'BACKGROUND', label: t('background'), icon: User },
      { id: 'BUSINESS_IDEA', label: t('businessIdea'), icon: Target },
    ]},
    { id: 'YMPÄRISTÖ', label: t('environment').toUpperCase(), icon: Globe, isGroup: true, subItems: [
      { id: 'EXTERNAL_ENV', label: t('externalEnv'), icon: Globe },
      { id: 'INTERNAL_ENV', label: t('internalEnv'), icon: Briefcase },
    ]},
    { id: 'STRATEGIA', label: t('strategy').toUpperCase(), icon: Shield },
    { id: 'OSASUUNNITELMAT', label: t('subPlans').toUpperCase(), icon: Layers, isGroup: true, subItems: [
      { id: 'SALES_MARKETING', label: t('marketingSales'), icon: Target },
      { id: 'PERSONNEL', label: t('personnel'), icon: Users },
      { id: 'HALLINTO', label: t('administration'), icon: Briefcase },
      { id: 'LASKELMAT', label: t('calculations'), icon: Calculator },
    ]},
    { id: 'TOTEUTUS', label: 'TOTEUTUS', icon: Calendar },
    { id: 'DOWNLOAD', label: t('download').toUpperCase(), icon: Download },
  ] : [
    { id: 'DASHBOARD', label: t('dashboard').toUpperCase(), icon: Layout },
    { id: 'YRITYS', label: t('company').toUpperCase(), icon: FileText },
    { id: 'YMPÄRISTÖ', label: t('environment').toUpperCase(), icon: Globe, isGroup: true, subItems: [
      { id: 'EXTERNAL_ENV', label: t('externalEnv'), icon: Globe },
      { id: 'INTERNAL_ENV', label: t('internalEnv'), icon: Briefcase },
    ]},
    { id: 'STRATEGIA', label: t('strategy').toUpperCase(), icon: Shield },
    { id: 'BUSINESS_MODEL', label: t('businessModel').toUpperCase(), icon: Briefcase },
    { id: 'CONTRIBUTION', label: t('myContribution').toUpperCase(), icon: User },
    { id: 'DOWNLOAD', label: t('download').toUpperCase(), icon: Download },
  ];

  return (
    <>
      {isMobile && !sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg border border-black/5 text-slate-600"
        >
          <Layout size={24} />
        </button>
      )}

      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : (isMobile ? 0 : 80),
          x: (isMobile && !sidebarOpen) ? -280 : 0
        }}
        className={`bg-white border-r border-black/5 flex flex-col h-screen overflow-hidden shadow-sm z-40 relative ${isMobile ? 'fixed inset-y-0 left-0' : ''}`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${(!sidebarOpen && !isMobile) && 'hidden'} ${isMobile && !sidebarOpen && 'opacity-0'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${portalType === PortalType.LTS ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {portalType === PortalType.LTS ? 'LTS' : 'STR'}
            </div>
            <span className="font-bold text-xl tracking-tighter">{portalType}</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {/* TEACHER TOOLS SECTION */}
          {userRole === UserRole.TEACHER && sidebarOpen && (
            <div className="mb-6 p-2 bg-slate-50 rounded-2xl border border-black/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Opettajan työkalu</p>
              <button 
                onClick={onOpenInviteModal}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-black text-white rounded-xl shadow-md hover:bg-slate-800 transition-all mb-2"
              >
                <UserPlus size={16} />
                <span className="text-xs font-bold uppercase tracking-wider text-left">Kutsu opiskelija</span>
              </button>
              <button 
                onClick={() => setShowSentInvites(!showSentInvites)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-white rounded-xl transition-all"
              >
                <MailCheck size={16} />
                <span className="text-xs font-bold text-left">{showSentInvites ? 'Piilota kutsut' : 'Lähetetyt kutsut'}</span>
              </button>
              
              <AnimatePresence>
                {showSentInvites && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white/50 rounded-xl mt-1 px-2"
                  >
                    <div className="py-2 space-y-2 max-h-40 overflow-y-auto">
                      {invites.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic p-2 text-center">Ei lähetettyjä kutsuja</p>
                      ) : (
                        invites.map((inv) => (
                          <div key={inv.id} className="p-2 border-b border-black/5 last:border-0">
                            <p className="text-[10px] font-bold truncate text-slate-700">{inv.email}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{inv.status === 'pending' ? 'Odottaa' : 'Hyväksytty'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {menuItems.map((item: any) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => {
                  setActiveView(item.id === 'OSASUUNNITELMAT' ? 'SALES_MARKETING' : item.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  activeView === item.id 
                    ? (portalType === PortalType.LTS ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-100')
                    : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} className={activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                {sidebarOpen && (
                  <span className={`text-sm font-bold ${item.isGroup ? 'tracking-widest' : ''}`}>
                    {item.label}
                  </span>
                )}
              </button>
              
              {item.subItems && sidebarOpen && (
                <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                  {item.subItems.map((sub: any) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveView(sub.id);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
                        activeView === sub.id
                          ? 'bg-slate-100 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <sub.icon size={16} className={activeView === sub.id ? (portalType === PortalType.LTS ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-300 group-hover:text-slate-400'} />
                      <span className="text-xs font-bold">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="p-4 space-y-2 relative">
          {showProfileMenu && sidebarOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-50">
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => {
                    setActiveView('PROFILE');
                    setShowProfileMenu(false);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-black transition-all text-sm font-medium"
                >
                  <User size={16} />
                  Profiili
                </button>
                
                {userRole === UserRole.ADMIN && (
                  <button
                    onClick={() => {
                      setActiveView('ADMIN');
                      setShowProfileMenu(false);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-black transition-all text-sm font-medium"
                  >
                    <Database size={16} />
                    Ylläpito
                  </button>
                )}

                {showSwitchPortal && (
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onSwitchPortal) onSwitchPortal();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-black transition-all text-sm font-medium"
                  >
                    <ArrowRight size={16} />
                    Vaihda portaalia
                  </button>
                )}

                <div className="h-px bg-slate-100 my-1"></div>

                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all text-sm font-medium"
                >
                  <LogOut size={16} />
                  {t('logout')}
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={() => {
              if (!sidebarOpen) {
                setSidebarOpen(true);
                setShowProfileMenu(true);
              } else {
                setShowProfileMenu(!showProfileMenu);
              }
            }}
            className={`w-full flex items-center gap-3 p-2 rounded-2xl transition-all ${showProfileMenu ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 ${portalType === PortalType.LTS ? 'bg-blue-500' : 'bg-emerald-500'}`}>
              {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-xs font-bold truncate">{user?.displayName || 'Käyttäjä'}</p>
                <p className="text-[10px] text-slate-400 truncate tracking-tight font-medium uppercase">{user?.role === UserRole.ADMIN ? 'Pääkäyttäjä' : user?.role === UserRole.TEACHER ? 'Opettaja' : 'Käyttäjä'}</p>
              </div>
            )}
          </button>
        </div>
      </motion.aside>

      {isMobile && sidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30"
        />
      )}
    </>
  );
};
