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
import { MessageSquare, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc, query, where } from 'firebase/firestore'; // Added query, where

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
  const [user, setUser] = useState<UserAccount | null>(null);
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [view, setView] = useState('LANDING');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isDemo, setIsDemo] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge>(DEFAULT_KNOWLEDGE);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [helpState, setHelpState] = useState<'open' | 'minimized'>('open');

  // NEW: Manage the invite modal state at the App level so Sidebar can trigger it
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

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
            const isAdmin = adminEmails.includes(firebaseUser.email || '');
            
            if (isAdmin) {
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

            // UPDATED FETCHING LOGIC
            if (isAdmin) {
              // ADMIN: Fetch everything
              if (!unsubscribeUsersList) {
                unsubscribeUsersList = onSnapshot(collection(db, 'users'), (snapshot) => {
                  setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserAccount)));
                });
              }
              if (!unsubscribeInvites) {
                unsubscribeInvites = onSnapshot(collection(db, 'invites'), (snapshot) => {
                  setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
              }
            } else if (role === UserRole.TEACHER) {
              // TEACHER: Only fetch THEIR invites for the "Sent History" check
              if (!unsubscribeInvites) {
                const teacherInvitesQuery = query(collection(db, 'invites'), where("invitedBy", "==", firebaseUser.uid));
                unsubscribeInvites = onSnapshot(teacherInvitesQuery, (snapshot) => {
                  setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
              }
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
      alert("Kutsu tallennettu!");
    } catch (error) {
      alert("Virhe kutsussa.");
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
    // STRICT ADMIN VIEW: Only actual Admins can enter the AdminPanel
    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) {
      return (
        <AdminPanel 
          users={allUsers} invites={invites}
          systemKnowledge={systemKnowledge} onUpdateKnowledge={setSystemKnowledge} 
          onInviteUser={handleInviteUser} onNavigate={setView} 
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
          Ladataan...
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="font-sans antialiased text-slate-900">
          {view === 'LANDING' ? (
            <LandingPage onSelectPortal={setPortalType} onLogin={() => setView('AUTH')} onDemo={() => { setIsDemo(true); setView('DASHBOARD'); }} />
          ) : view === 'AUTH' ? (
            <Auth onLogin={handleLogin} portalType={portalType || undefined} />
          ) : (
            <div className="flex h-screen bg-slate-100 overflow-hidden">
              <Sidebar 
                portalType={portalType || PortalType.LTS} userRole={user?.role || UserRole.STUDENT}
                activeView={view} setActiveView={setView} onLogout={handleLogout}
                sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user}
                invites={invites} // Pass filtered invites to Sidebar for Teachers
                onOpenInviteModal={() => setIsInviteModalOpen(true)} // Allow Sidebar to open invite modal
              />
              <main className="flex-1 overflow-y-auto relative p-8">
                <AnimatePresence mode="wait">
                  <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {renderView()}
                  </motion.div>
                </AnimatePresence>

                {/* SHARED INVITE MODAL (Used by Admin via AdminPanel and Teachers via Sidebar) */}
                {isInviteModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10005] flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative">
                      <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-8 right-8 p-2 text-slate-400"><X size={24} /></button>
                      <h2 className="text-3xl font-black tracking-tighter uppercase mb-8">Kutsu opiskelija</h2>
                      <div className="space-y-4">
                        <input id="invite-name" type="text" placeholder="Koko nimi" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium" />
                        <input id="invite-email" type="email" placeholder="Sähköposti" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium" />
                        <button 
                          onClick={() => {
                            const n = (document.getElementById('invite-name') as HTMLInputElement).value;
                            const e = (document.getElementById('invite-email') as HTMLInputElement).value;
                            handleInviteUser(n, e, UserRole.STUDENT);
                            setIsInviteModalOpen(false);
                          }} 
                          className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-4"
                        >
                          Lähetä kutsu
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
                
                {/* CHAT JA OHJE KONTEINNERI */}
                <div className="fixed bottom-8 right-4 md:right-8 z-[9999] flex flex-col items-end gap-4">
                  <AnimatePresence>
                    {!isChatOpen && (
                      <>
                        {helpState === 'open' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="mb-2 max-w-[240px] md:max-w-[260px] bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-2xl relative"
                          >
                            <button 
                              onClick={() => setHelpState('minimized')}
                              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X size={16} />
                            </button>
                            <div className="space-y-4 pr-2">
                              <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">1. Kirjoita ja Tallenna</h4>
                                <p className="text-[11px] text-slate-600 leading-tight font-medium">Täytä portaali ja muista painaa Tallenna-nappia.</p>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">2. Avaa Sparraaja</h4>
                                <p className="text-[11px] text-slate-600 leading-tight font-medium">Klikkaa vihreää palloa avataksesi tekoälyn.</p>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">3. Haasta valmis työ</h4>
                                <p className="text-[11px] text-slate-600 leading-tight font-medium">Käytä chatin punaista nappia saadaksesi arvion.</p>
                              </div>
                            </div>
                            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white rotate-45 border-r border-b border-slate-200"></div>
                          </motion.div>
                        )}
                        {helpState === 'minimized' && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => setHelpState('open')}
                            className="absolute -top-2 -right-1 w-7 h-7 bg-emerald-100 text-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg z-[10002] hover:bg-emerald-200 transition-colors"
                            title="Näytä ohjeet"
                          >
                            <Info size={14} strokeWidth={3} />
                          </motion.button>
                        )}
                      </>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {!isChatOpen && (
                      <motion.button 
                        key="chat-trigger" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={() => setIsChatOpen(true)} 
                        className="w-16 h-16 rounded-full bg-emerald-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 relative z-[10001]"
                      >
                        <MessageSquare size={28} />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {isChatOpen && (
                    <div className="relative z-[10000]">
                      <AIChat portalType={portalType || PortalType.LTS} onClose={() => setIsChatOpen(false)} user={user} systemKnowledge={systemKnowledge} />
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
