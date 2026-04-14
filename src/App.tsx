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
import { doc, getDoc, onSnapshot, collection, addDoc, setDoc, query, where } from 'firebase/firestore';
 
// Simple Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }; 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4">Hups! Jotain meni vikaan.</h1>
            <p className="text-slate-500 mb-8">Sovellus kohtasi odottamattoman virheen. Kokeile ladata sivu uudelleen.</p>
            <button onClick={() => window.location.reload()} className="bg-black text-white px-8 py-4 rounded-2xl font-bold">Lataa sivu uudelleen</button>
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
    { id: 'l1', title: 'Tilastokeskus - Suhdanneindikaattorit', url: 'https://stat.fi', category: 'Ulkoinen toimintaympäristö' },
    { id: 'l2', title: 'Sitra Megatrendit 2024', url: 'https://sitra.fi', category: 'Ulkoinen toimintaympäristö' }
  ],
  documents: [],
  instructions: 'Olet kokenut ja ytimekäs liiketoimintastrategi.'
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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
          let role = UserRole.STUDENT;
          // Tunnistetaan admin sähköpostista
          if (firebaseUser.email === 'johannes@hessonpaja.com' || firebaseUser.email === 'johannes.hesso@innostapersonaltrainer.fi') {
            role = UserRole.ADMIN;
          } else if (userDoc.exists() && userDoc.data().role) {
            role = userDoc.data().role as UserRole;
          }
          
          let userPortalType = portalType;
          
          // TÄMÄ ON SE TIUKKA LUKKO:
          if (userDoc.exists() && userDoc.data().portalType) {
            userPortalType = userDoc.data().portalType as PortalType;
            if (portalType !== userPortalType) {
              setPortalType(userPortalType); // Pakottaa portaalin Firebasen mukaiseksi
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
            invitedBy: userDoc.exists() ? userDoc.data().invitedBy : undefined
          };
          setUser(userAccount);
          if (view === 'LANDING' || view === 'AUTH') {
            setView('DASHBOARD');
          }
        }, (error) => {
          console.error('Error fetching user doc:', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: (firebaseUser.email === 'johannes@hessonpaja.com' || firebaseUser.email === 'johannes.hesso@innostapersonaltrainer.fi') ? UserRole.ADMIN : UserRole.STUDENT,
            portalType: portalType || PortalType.LTS,
            canInviteTeamMembers: false
          });
          if (view === 'LANDING' || view === 'AUTH') setView('DASHBOARD');
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        setUser(null);
        if (view !== 'LANDING' && view !== 'PAYMENT' && !isDemo && !portalType) {
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
 
  const handleLogout = () => {
    auth.signOut();
    setUser(null);
    setPortalType(null);
    setView('LANDING');
    setIsDemo(false);
  };
 
  const renderView = () => {
    if (view === 'DASHBOARD') {
      if (portalType === PortalType.STRATEGY) return <StrategyPortal onNavigate={setView} user={user} viewingWorkspaceAs={viewingWorkspaceAs} />;
      return <Dashboard portalType={PortalType.LTS} onNavigate={setView} user={user} />;
    }
    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) return <AdminPanel users={users} invites={invites} systemKnowledge={systemKnowledge} onUpdateKnowledge={setSystemKnowledge} onNavigate={setView} onInviteUser={() => {}} />;
    if (view === 'PROFILE') return <Profile user={user || MOCK_USERS[0]} onNavigate={setView} />;
    return <PlanBuilder portalType={portalType || PortalType.LTS} activeSection={view} isReadOnly={isDemo} user={user} />;
  };
 
  if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center">Ladataan...</div>;

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
                  <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {renderView()}
                  </motion.div>
                </AnimatePresence>
                <div className="fixed bottom-8 right-8">
                  <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center">
                    <MessageSquare size={28} />
                  </button>
                  {isChatOpen && <AIChat portalType={portalType || PortalType.LTS} onClose={() => setIsChatOpen(false)} user={user} systemKnowledge={systemKnowledge} />}
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
