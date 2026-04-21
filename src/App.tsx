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
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc, query, where } from 'firebase/firestore';

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
  const [showBubble, setShowBubble] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge>(DEFAULT_KNOWLEDGE);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // --- TÄMÄ OSA PUUTTUI JA KORJAA NAPULAT ---
  useEffect(() => {
    const handleOpenAIChat = () => {
      setIsChatOpen(true);
      setShowBubble(false);
    };

    window.addEventListener('open-ai-chat', handleOpenAIChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenAIChat);
  }, []);
  // ------------------------------------------

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
            if (adminEmails.includes(firebaseUser.email || '')) role = UserRole.ADMIN;

            const userPortal = data.portalType as PortalType || PortalType.LTS;
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: data.displayName || firebaseUser.email?.split('@')[0] || 'Käyttäjä',
              role: role,
              portalType: userPortal,
              companyName: data.companyName,
              canInviteTeamMembers: data.canInviteTeamMembers || false
            });
            setPortalType(userPortal);
            setView(prev => (prev === 'LANDING' || prev === 'AUTH') ? 'DASHBOARD' : prev);

            if (role === UserRole.ADMIN) {
              unsubscribeUsersList = onSnapshot(collection(db, 'users'), (s) => 
                setAllUsers(s.docs.map(d => ({ uid: d.id, ...d.data() } as UserAccount)))
              );
              unsubscribeInvites = onSnapshot(collection(db, 'invites'), (s) => 
                setInvites(s.docs.map(d => ({ id: d.id, ...d.data() })))
              );
            } else if (role === UserRole.TEACHER) {
              const q = query(collection(db, 'invites'), where("invitedBy", "==", firebaseUser.uid));
              unsubscribeInvites = onSnapshot(q, (s) => 
                setInvites(s.docs.map(d => ({ id: d.id, ...d.data() })))
              );
            }
          }
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        if (unsubscribeUsersList) unsubscribeUsersList();
        if (unsubscribeInvites) unsubscribeInvites();
        setUser(null);
        if (!isDemo) { setView('LANDING'); setPortalType(null); }
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
      const pTypeFinal = pType || portalType || PortalType.LTS;
      await addDoc(collection(db, 'invites'), {
        displayName: name,
        email: email,
        role: role,
        portalType: pTypeFinal,
        companyName: company || '',
        status: 'pending',
        invitedBy: user?.uid,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'mail'), {
        to: email,
        message: {
          subject: `Kutsu järjestelmään - ${role}`,
          html: `<p>Hei ${name}! Sinut on kutsuttu järjestelmään. Kirjaudu tästä: <a href="https://suunnitelma.com">suunnitelma.com</a></p>`
        }
      });
      alert("Kutsu lähetetty!");
    } catch (e) { alert("Virhe kutsussa."); }
  };

  const handleLogin = (email: string, role: UserRole, portal: PortalType) => {
    setPortalType(portal);
    setIsDemo(email.startsWith('demo_'));
  };

  const renderView = () => {
    if (view === 'DASHBOARD') {
      if (portalType === PortalType.STRATEGY) return <StrategyPortal onNavigate={setView} user={user} />;
      return <Dashboard portalType={portalType || PortalType.LTS} onNavigate={setView} user={user} />;
    }
    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) {
      return <AdminPanel users={allUsers} invites={invites} systemKnowledge={systemKnowledge} onUpdateKnowledge={setSystemKnowledge} onInviteUser={handleInviteUser} onNavigate={setView} />;
    }
    if (view === 'PROFILE') return <Profile user={user!} onNavigate={setView} />;
    return <PlanBuilder portalType={portalType || PortalType.LTS} activeSection={view} isReadOnly={isDemo} user={user} />;
  };

  if (!isAuthReady) return null;

  return (
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
              activeView={view} setActiveView={setView} onLogout={() => { auth.signOut(); setIsDemo(false); }}
              sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user}
              invites={invites} onOpenInviteModal={() => setIsInviteModalOpen(true)}
            />
            <main className="flex-1 overflow-y-auto relative p-8">
              <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {renderView()}
                </motion.div>
              </AnimatePresence>

              {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10005] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-md rounded-[40px] p-10 relative">
                    <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-8 right-8 text-slate-400"><X size={24} /></button>
                    <h2 className="text-3xl font-black mb-8 uppercase">Kutsu opiskelija</h2>
                    <input id="inv-n" type="text" placeholder="Nimi" className="w-full px-6 py-4 bg-slate-50 rounded-2xl mb-4 outline-none" />
                    <input id="inv-e" type="email" placeholder="Sähköposti" className="w-full px-6 py-4 bg-slate-50 rounded-2xl mb-4 outline-none" />
                    <button onClick={() => {
                      const n = (document.getElementById('inv-n') as HTMLInputElement).value;
                      const e = (document.getElementById('inv-e') as HTMLInputElement).value;
                      if(n && e) { handleInviteUser(n, e, UserRole.STUDENT); setIsInviteModalOpen(false); }
                    }} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase">Lähetä</button>
                  </div>
                </div>
              )}

              <div className="fixed bottom-8 right-8 z-[10000] flex flex-col items-end">
                <AnimatePresence>
                  {showBubble && !isChatOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mb-4 mr-2 bg-white p-6 rounded-[24px] shadow-2xl border border-slate-100 max-w-[280px] relative text-sm text-slate-700"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowBubble(false); }}
                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      
                      <div className="space-y-3 pr-2">
                        <p className="font-medium text-slate-900">Käytä Aichattia saadaksesi ohjeita suunnitelmasi tekoon.</p>
                        <p>Etsi markkinatietoa tai strategiaesimerkkejä maailmalta.</p>
                        <p className="font-bold text-emerald-600">Haasta valmis suunnitelma painamalla punaista nappia chatin yläreunasta.</p>
                      </div>

                      <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white rotate-45 border-r border-b border-slate-100" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {isChatOpen ? (
                  <AIChat portalType={portalType || PortalType.LTS} onClose={() => setIsChatOpen(false)} user={user} systemKnowledge={systemKnowledge} />
                ) : (
                  <div className="relative">
                    <button 
                      onClick={() => setIsChatOpen(true)} 
                      className="w-16 h-16 rounded-full bg-emerald-600 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                      <MessageSquare size={28} />
                    </button>
                    
                    {!showBubble && (
                      <button 
                        onClick={() => setShowBubble(true)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white shadow-md flex items-center justify-center hover:bg-emerald-300 transition-colors z-10"
                      >
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          className="w-2 h-2 bg-white rounded-full"
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}
        <CookieBanner />
      </div>
    </LanguageProvider>
  );
}
