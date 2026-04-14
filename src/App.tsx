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
import { AIChat } from './AIChat';
import { CookieBanner } from './CookieBanner';
import { PortalType, UserRole, UserAccount, SystemKnowledge } from './types';
import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc } from 'firebase/firestore';

// Simple Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4">Hups! Jotain meni vikaan.</h1>
            <button onClick={() => window.location.reload()} className="bg-black text-white px-8 py-4 rounded-2xl font-bold">Lataa sivu uudelleen</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_KNOWLEDGE: SystemKnowledge = {
  links: [],
  documents: [],
  instructions: 'Olet kokenut ja ytimekäs liiketoimintastrategi.'
};

export default function App() {
  // --- UI & Basic State ---
  const [user, setUser] = useState<UserAccount | null>(null);
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [view, setView] = useState('LANDING');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isDemo, setIsDemo] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge>(DEFAULT_KNOWLEDGE);

  // --- Admin Specific State ---
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- LISÄTTY: DASHBOARDIN CHAT-SIGNAALIN KUUNTELIJA ---
  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  // --- THE MASTER AUTH & DATA LISTENER ---
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeUsersList: (() => void) | null = null;
    let unsubscribeInvites: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            let role = data.role as UserRole;
            const adminEmails = ['johannes@hessonpaja.com', 'johannes.hesso@innostapersonaltrainer.fi'];
            if (adminEmails.includes(firebaseUser.email || '')) {
              role = UserRole.ADMIN;
            }

            const userPortal = data.portalType as PortalType || PortalType.LTS;

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: data.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: role,
              portalType: userPortal,
              companyName: data.companyName,
              canInviteTeamMembers: data.canInviteTeamMembers || false
            });

            setPortalType(userPortal);
            setView(prev => (prev === 'LANDING' || prev === 'AUTH') ? 'DASHBOARD' : prev);

            if (role === UserRole.ADMIN && !unsubscribeUsersList) {
              unsubscribeUsersList = onSnapshot(collection(db, 'users'), (snapshot) => {
                const uList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserAccount));
                setAllUsers(uList);
              });
              
              unsubscribeInvites = onSnapshot(collection(db, 'invites'), (snapshot) => {
                const iList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInvites(iList);
              });
            }
          }
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        if (unsubscribeUsersList) unsubscribeUsersList();
        if (unsubscribeInvites) unsubscribeInvites();
        setUser(null);
        if (!isDemo) {
          setView('LANDING');
          setPortalType(null);
        }
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeUsersList) unsubscribeUsersList();
      if (unsubscribeInvites) unsubscribeInvites();
    };
  }, [isDemo]);

  // --- Admin Actions ---
  const handleInviteUser = async (name: string, email: string, role: UserRole, pType?: PortalType, company?: string) => {
    try {
      await addDoc(collection(db, 'invites'), {
        displayName: name,
        email: email,
        role: role,
        portalType: pType || portalType || PortalType.LTS,
        companyName: company || '',
        status: 'pending',
        invitedBy: user?.uid,
        createdAt: new Date().toISOString()
      });
      alert("Kutsu tallennettu tietokantaan!");
    } catch (error) {
      console.error("Invite error:", error);
      alert("Virhe kutsun tallentamisessa.");
    }
  };

  const handleLogin = (email: string, role: UserRole, portal: PortalType) => {
    setPortalType(portal);
    setIsDemo(email.startsWith('demo_'));
  };

  const handleLogout = () => {
    auth.signOut();
    setIsDemo(false);
  };

  const renderView = () => {
    if (view === 'DASHBOARD') {
      if (portalType === PortalType.STRATEGY) return <StrategyPortal onNavigate={setView} user={user} />;
      return <Dashboard portalType={PortalType.LTS} onNavigate={setView} user={user} />;
    }
    
    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) {
      return (
        <AdminPanel 
          users={allUsers} 
          invites={invites}
          systemKnowledge={systemKnowledge} 
          onUpdateKnowledge={setSystemKnowledge} 
          onInviteUser={handleInviteUser}
          onNavigate={setView} 
        />
      );
    }
    
    if (view === 'PROFILE') return <Profile user={user!} onNavigate={setView} />;
    
    return <PlanBuilder portalType={portalType || PortalType.LTS} activeSection={view} isReadOnly={isDemo} user={user} />;
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="font-bold text-slate-400 uppercase tracking-widest text-xs">
          Ladataan järjestelmää...
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="font-sans antialiased text-slate-900">
          {view === 'LANDING' ? (
            <LandingPage 
              onSelectPortal={setPortalType} 
              onLogin={() => setView('AUTH')} 
              onDemo={() => { setIsDemo(true); setView('DASHBOARD'); }} 
            />
          ) : view === 'AUTH' ? (
            <Auth onLogin={handleLogin} portalType={portalType || undefined} />
          ) : (
            <div className="flex h-screen bg-slate-100 overflow-hidden">
              <Sidebar 
                portalType={portalType || PortalType.LTS} 
                userRole={user?.role || UserRole.STUDENT}
                activeView={view}
                setActiveView={setView}
                onLogout={handleLogout}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                user={user}
              />
              <main className="flex-1 overflow-y-auto relative p-8">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={view} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    transition={{ duration: 0.2 }}
                  >
                    {renderView()}
                  </motion.div>
                </AnimatePresence>
                
                {/* LISÄTTY z-index KORJAUS TÄHÄN */}
                <div className="fixed bottom-8 right-8 z-[9999]">
                  <button 
                    onClick={() => setIsChatOpen(!isChatOpen)} 
                    className="w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 relative z-[10001]"
                  >
                    <MessageSquare size={28} />
                  </button>
                  {isChatOpen && (
                    <div className="relative z-[10000]">
                      <AIChat 
                        portalType={portalType || PortalType.LTS} 
                        onClose={() => setIsChatOpen(false)} 
                        user={user} 
                        systemKnowledge={systemKnowledge} 
                      />
                    </div>
                  )}
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
