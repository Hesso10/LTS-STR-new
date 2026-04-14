/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './LanguageContext';
import { LandingPage } from './LandingPage';
import { Auth } from './Auth';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { StrategyPortal } from './StrategyPortal';
import { PlanBuilder } from './PlanBuilder';
import { AdminPanel } from './AdminPanel';
import { Profile } from './Profile';
import { Payment } from './Payment';
import { VerificationScreen } from './VerificationScreen';
import { AIChat } from './AIChat';
import { CookieBanner } from './CookieBanner';
import { PortalType, UserRole, UserAccount, SystemKnowledge } from './types';
import { MessageSquare, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, addDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

// Simple Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4 italic tracking-tighter">Hups! Jotain meni vikaan.</h1>
            <button onClick={() => window.location.reload()} className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors">
              Lataa sivu uudelleen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MOCK_USERS: UserAccount[] = [
  { uid: 'admin1', email: 'johannes.hesso@innostapersonaltrainer.fi', displayName: 'Johannes', role: UserRole.ADMIN },
];

const DEFAULT_KNOWLEDGE: SystemKnowledge = {
  links: [],
  documents: [],
  instructions: 'Olet kokenut ja ytimekäs liiketoimintastrategi.'
};

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [view, setView] = useState('LANDING');
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [isDemo, setIsDemo] = useState(false);
  const [viewingWorkspaceAs, setViewingWorkspaceAs] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USERS);
  const [invites, setInvites] = useState<any[]>([]);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge>(DEFAULT_KNOWLEDGE);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Sidebarin automaattinen hallinta näytön koon mukaan
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
          // Pakotettu Admin-rooli sähköpostille
          let role = UserRole.STUDENT;
          const userEmail = firebaseUser.email?.toLowerCase();
          if (userEmail === 'johannes@hessonpaja.com' || userEmail === 'johannes.hesso@innostapersonaltrainer.fi') {
            role = UserRole.ADMIN;
          } else if (userDoc.exists() && userDoc.data().role) {
            role = userDoc.data().role as UserRole;
          }
          
          let userPortalType = portalType;
          if (userDoc.exists() && userDoc.data().portalType) {
            userPortalType = userDoc.data().portalType as PortalType;
            if (portalType !== userPortalType) setPortalType(userPortalType);
          }
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || userEmail?.split('@')[0] || 'User',
            role: role,
            portalType: userPortalType || PortalType.LTS,
          });

          if (view === 'LANDING' || view === 'AUTH') {
            setView('DASHBOARD');
          }
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        setUser(null);
        if (view !== 'LANDING' && view !== 'AUTH') setView('LANDING');
      }
      setIsAuthReady(true);
    });
    return () => { unsubscribeAuth(); if (unsubscribeUserDoc) unsubscribeUserDoc(); };
  }, [view, portalType]);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setView('LANDING');
  };

  const renderView = () => {
    if (view === 'DASHBOARD') {
      return portalType === PortalType.STRATEGY 
        ? <StrategyPortal onNavigate={setView} user={user} viewingWorkspaceAs={viewingWorkspaceAs} />
        : <Dashboard portalType={PortalType.LTS} onNavigate={setView} user={user} />;
    }
    if (view === 'PROFILE') return <Profile user={user} onNavigate={setView} />;
    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) {
      return <AdminPanel users={users} invites={invites} systemKnowledge={systemKnowledge} onUpdateKnowledge={setSystemKnowledge} onInviteUser={async () => ""} onNavigate={setView} />;
    }
    return <PlanBuilder portalType={portalType || PortalType.LTS} activeSection={view} user={user} />;
  };

  if (!isAuthReady) return null;

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="font-sans antialiased text-slate-900">
          {view === 'LANDING' ? (
            <LandingPage onSelectPortal={(p) => { setPortalType(p); setView('AUTH'); }} onLogin={() => setView('AUTH')} />
          ) : view === 'AUTH' ? (
            <Auth onLogin={() => {}} portalType={portalType || undefined} />
          ) : (
            <div className="flex h-screen bg-slate-100 overflow-hidden relative">
              
              <AnimatePresence mode="wait">
                {(sidebarOpen || window.innerWidth > 1024) && (
                  <motion.div 
                    initial={{ x: -300 }} 
                    animate={{ x: 0 }} 
                    exit={{ x: -300 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 left-0 z-50 lg:relative lg:flex"
                  >
                    <Sidebar 
                      portalType={portalType || PortalType.LTS} 
                      userRole={user?.role || UserRole.STUDENT} 
                      activeView={view} 
                      setActiveView={(v) => { setView(v); if(window.innerWidth <= 1024) setSidebarOpen(false); }} 
                      onLogout={handleLogout} 
                      user={user} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {sidebarOpen && window.innerWidth <= 1024 && (
                <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
              )}

              <main className="flex-1 overflow-y-auto relative p-4 md:p-12">
                <div className="lg:hidden mb-6">
                  <button onClick={() => setSidebarOpen(true)} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 font-bold text-sm">
                    <Menu size={20} />
                    <span>Valikko</span>
                  </button>
                </div>

                <div className="max-w-7xl mx-auto">
                  {renderView()}
                </div>

                <div className="fixed bottom-8 right-8 z-50">
                  <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 rounded-full bg-emerald-600 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group">
                    {isChatOpen ? <X size={28} /> : <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />}
                  </button>
                  {isChatOpen && <AIChat onClose={() => setIsChatOpen(false)} portalType={portalType || PortalType.LTS} user={user} systemKnowledge={systemKnowledge} />}
                </div>
              </main>
            </div>
          )}
          <CookieBanner />
        </div>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
