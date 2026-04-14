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
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, addDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

// Simple Error Boundary to catch UI crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4 italic tracking-tighter">Hups! Jotain meni vikaan.</h1>
            <p className="text-slate-500 mb-8">Sovellus kohtasi odottamattoman virheen. Kokeile ladata sivu uudelleen.</p>
            {this.state.error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-left text-sm mb-8 overflow-auto max-h-48 font-mono">
                {this.state.error.message}
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-xl shadow-black/10"
            >
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
  links: [
    { id: 'l1', title: 'Tilastokeskus - Suhdanneindikaattorit', url: 'https://www.stat.fi/tup/suhdanneindikaattorit.html', category: 'Ulkoinen toimintaympäristö' },
    { id: 'l2', title: 'Sitra Megatrendit 2024', url: 'https://www.sitra.fi/aiheet/megatrendit/', category: 'Ulkoinen toimintaympäristö' }
  ],
  documents: [],
  instructions: 'Olet kokenut ja ytimekäs liiketoimintastrategi. Vastaa aina niin, että käyttämäsi lähteet todella vastaavat siihen LTS tai STRATEGIA osa-alueeseen, jonka käyttäjä on valinnut.'
};

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [view, setView] = useState('LANDING');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isDemo, setIsDemo] = useState(false);
  const [viewingWorkspaceAs, setViewingWorkspaceAs] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USERS);
  const [invites, setInvites] = useState<any[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge>(DEFAULT_KNOWLEDGE);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
          let role = UserRole.STUDENT;
          if (firebaseUser.email === 'johannes@hessonpaja.com' || firebaseUser.email === 'johannes.hesso@innostapersonaltrainer.fi') {
            role = UserRole.ADMIN;
          } else if (userDoc.exists() && userDoc.data().role) {
            role = userDoc.data().role as UserRole;
          }
          
          let userPortalType = portalType;
          if (userDoc.exists() && userDoc.data().portalType) {
            userPortalType = userDoc.data().portalType as PortalType;
            if (portalType !== userPortalType) {
              setPortalType(userPortalType);
            }
          }
          
          const userAccount: UserAccount = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: role,
            portalType: userPortalType || PortalType.LTS,
            teamMembers: userDoc.exists() ? userDoc.data().teamMembers : undefined,
            canInviteTeamMembers: userDoc.exists() ? userDoc.data().canInviteTeamMembers : false,
            invitedBy: userDoc.exists() ? userDoc.data().invitedBy : undefined,
            companyName: userDoc.exists() ? userDoc.data().companyName : undefined
          };
          setUser(userAccount);
          if (view === 'LANDING' || view === 'AUTH') {
            setView('DASHBOARD');
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.READ, 'users');
        });
      } else {
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
        }
        setUser(null);
        if (view !== 'LANDING' && view !== 'PAYMENT' && !isDemo) {
          setView('LANDING');
        }
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [view, portalType]);

  const handleLogin = (email: string, role: UserRole, portal: PortalType) => {
    setPortalType(portal);
    setIsDemo(email.startsWith('demo_'));
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setPortalType(null);
      setView('LANDING');
      setIsDemo(false);
      setViewingWorkspaceAs(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleInviteUser = async (name: string, email: string, role: UserRole, pType?: PortalType, companyName?: string) => {
    try {
      const inviteId = Math.random().toString(36).substr(2, 9);
      const inviteData: any = {
        email,
        displayName: name,
        role,
        invitedBy: user?.uid,
        createdAt: new Date().toISOString(),
        used: false
      };
      
      if (pType) inviteData.portalType = pType;
      if (companyName) inviteData.companyName = companyName;

      await setDoc(doc(db, 'invites', inviteId), inviteData);
      
      const newInvite = { id: inviteId, ...inviteData };
      setInvites(prev => [newInvite, ...prev]);
      
      return inviteId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invites');
      throw error;
    }
  };

  const renderView = () => {
    if (view === 'DASHBOARD') {
      if (portalType === PortalType.STRATEGY) {
        return <StrategyPortal onNavigate={setView} user={user} viewingWorkspaceAs={viewingWorkspaceAs} />;
      }
      return <Dashboard portalType={PortalType.LTS} onNavigate={setView} user={user} />;
    }
    
    if (view === 'PROFILE') return <Profile user={user} onNavigate={setView} />;
    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) {
      return (
        <AdminPanel 
          users={users} 
          invites={invites}
          systemKnowledge={systemKnowledge}
          onUpdateKnowledge={setSystemKnowledge}
          onInviteUser={handleInviteUser}
          onNavigate={setView}
        />
      );
    }
    if (view === 'PAYMENT') return <Payment onComplete={() => setView('DASHBOARD')} portalType={portalType || PortalType.LTS} />;
    
    return <PlanBuilder portalType={portalType || PortalType.LTS} activeSection={view} user={user} />;
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="font-sans antialiased text-slate-900 selection:bg-black selection:text-white">
          {view === 'LANDING' ? (
            <LandingPage 
              onSelectPortal={(p) => {
                setPortalType(p);
                setView('AUTH');
              }}
              onLogin={() => setView('AUTH')}
            />
          ) : view === 'AUTH' ? (
            <Auth 
              onLogin={handleLogin} 
              portalType={portalType || undefined}
            />
          ) : (
            <div className="flex h-screen bg-slate-100 overflow-hidden">
              <Sidebar 
                portalType={portalType || PortalType.LTS}
                userRole={user?.role || UserRole.STUDENT}
                activeView={view}
                setActiveView={setView}
                onLogout={handleLogout}
                user={user}
              />
              
              <main className="flex-1 overflow-y-auto relative bg-slate-100 p-4 md:p-8 lg:p-12">
                <div className="max-w-7xl mx-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={view + (viewingWorkspaceAs || '')}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderView()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="fixed bottom-8 right-8 z-50">
                  <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="w-16 h-16 rounded-full bg-emerald-600 text-white shadow-2xl shadow-emerald-900/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                  >
                    {isChatOpen ? <X size={28} /> : <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />}
                  </button>
                  
                  <AnimatePresence>
                    {isChatOpen && (
                      <AIChat 
                        onClose={() => setIsChatOpen(false)} 
                        portalType={portalType || PortalType.LTS}
                        user={user}
                        systemKnowledge={systemKnowledge}
                      />
                    )}
                  </AnimatePresence>
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
